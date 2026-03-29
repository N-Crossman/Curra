from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Medication, MedicationLog, MedicationLogStatus, User
from app.schemas import (
    MedicationCreate,
    MedicationLogCreate,
    MedicationLogOut,
    MedicationLogUpdate,
    MedicationOut,
    MedicationUpdate,
)
from app.security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/medications", tags=["medications"])


class AdherenceStats(BaseModel):
    total: int
    taken: int
    missed: int
    skipped: int
    adherence_rate: float


async def _get_medication_or_404(
    medication_id: str,
    current_user: User,
    db: AsyncSession,
) -> Medication:
    result = await db.execute(
        select(Medication).where(
            Medication.id == medication_id,
            Medication.patient_id == current_user.id,
        )
    )
    med = result.scalar_one_or_none()
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")
    return med


# ── Medications CRUD ────────────────────────────────────────────────────────

@router.get("", response_model=list[MedicationOut])
async def list_medications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    active_only: bool = False,
) -> list[Medication]:
    query = select(Medication).where(Medication.patient_id == current_user.id)
    if active_only:
        query = query.where(Medication.is_active == True)
    result = await db.execute(query.order_by(Medication.name))
    return list(result.scalars().all())


@router.post("", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
async def create_medication(
    body: MedicationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Medication:
    med = Medication(**body.model_dump(exclude={"patient_id"}), patient_id=current_user.id)
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


# ── Logs (specific routes before parameterized) ─────────────────────────────

@router.get("/logs/today", response_model=list[MedicationLogOut])
async def get_today_logs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MedicationLog]:
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(MedicationLog)
        .where(
            MedicationLog.patient_id == current_user.id,
            func.date(MedicationLog.scheduled_time) == today,
        )
        .order_by(MedicationLog.scheduled_time)
    )
    return list(result.scalars().all())


@router.get("/adherence/stats", response_model=AdherenceStats)
async def get_adherence_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdherenceStats:
    result = await db.execute(
        select(MedicationLog.status, func.count().label("count"))
        .where(MedicationLog.patient_id == current_user.id)
        .group_by(MedicationLog.status)
    )
    counts = {row.status: row.count for row in result.all()}

    taken = counts.get(MedicationLogStatus.taken, 0)
    missed = counts.get(MedicationLogStatus.missed, 0)
    skipped = counts.get(MedicationLogStatus.skipped, 0)
    total = taken + missed + skipped
    adherence_rate = round(taken / total * 100, 1) if total > 0 else 0.0

    return AdherenceStats(
        total=total,
        taken=taken,
        missed=missed,
        skipped=skipped,
        adherence_rate=adherence_rate,
    )


@router.post("/logs", response_model=MedicationLogOut, status_code=status.HTTP_201_CREATED)
async def log_medication(
    body: MedicationLogCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationLog:
    await _get_medication_or_404(str(body.medication_id), current_user, db)
    log = MedicationLog(**body.model_dump(exclude={"patient_id"}), patient_id=current_user.id)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/logs/{medication_id}", response_model=list[MedicationLogOut])
async def get_medication_logs(
    medication_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MedicationLog]:
    await _get_medication_or_404(medication_id, current_user, db)
    result = await db.execute(
        select(MedicationLog)
        .where(MedicationLog.medication_id == medication_id)
        .order_by(MedicationLog.scheduled_time.desc())
    )
    return list(result.scalars().all())


@router.patch("/logs/{log_id}", response_model=MedicationLogOut)
async def update_log(
    log_id: str,
    body: MedicationLogUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedicationLog:
    result = await db.execute(
        select(MedicationLog).where(
            MedicationLog.id == log_id,
            MedicationLog.patient_id == current_user.id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    await db.commit()
    await db.refresh(log)
    return log


# ── Parameterized routes last ───────────────────────────────────────────────

@router.get("/{medication_id}", response_model=MedicationOut)
async def get_medication(
    medication_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Medication:
    return await _get_medication_or_404(medication_id, current_user, db)


@router.patch("/{medication_id}", response_model=MedicationOut)
async def update_medication(
    medication_id: str,
    body: MedicationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Medication:
    med = await _get_medication_or_404(medication_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(med, field, value)
    await db.commit()
    await db.refresh(med)
    return med


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    med = await _get_medication_or_404(medication_id, current_user, db)
    await db.delete(med)
    await db.commit()