from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Vital
from app.schemas import VitalCreate, VitalOut, VitalUpdate
from app.security import get_current_user

router = APIRouter(prefix="/vitals", tags=["vitals"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_vital_or_404(
    vital_id: str,
    current_user: User,
    db: AsyncSession,
) -> Vital:
    result = await db.execute(
        select(Vital).where(
            Vital.id == vital_id,
            Vital.patient_id == current_user.id,
        )
    )
    vital = result.scalar_one_or_none()
    if not vital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vital not found")
    return vital


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[VitalOut])
async def list_vitals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Vital]:
    result = await db.execute(
        select(Vital)
        .where(Vital.patient_id == current_user.id)
        .order_by(Vital.recorded_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=VitalOut, status_code=status.HTTP_201_CREATED)
async def create_vital(
    body: VitalCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Vital:
    vital = Vital(**body.model_dump())
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    return vital


@router.get("/{vital_id}", response_model=VitalOut)
async def get_vital(
    vital_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Vital:
    return await _get_vital_or_404(vital_id, current_user, db)


@router.patch("/{vital_id}", response_model=VitalOut)
async def update_vital(
    vital_id: str,
    body: VitalUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Vital:
    vital = await _get_vital_or_404(vital_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vital, field, value)
    await db.commit()
    await db.refresh(vital)
    return vital


@router.delete("/{vital_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vital(
    vital_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    vital = await _get_vital_or_404(vital_id, current_user, db)
    await db.delete(vital)
    await db.commit()
