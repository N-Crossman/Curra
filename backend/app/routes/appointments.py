from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Appointment, User, UserRole
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.security import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_appointment_or_404(
    appointment_id: str,
    current_user: User,
    db: AsyncSession,
) -> Appointment:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id,
            or_(
                Appointment.patient_id == current_user.id,
                Appointment.doctor_id == current_user.id,
            ),
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appt


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Appointment]:
    if current_user.role == UserRole.patient:
        query = select(Appointment).where(Appointment.patient_id == current_user.id)
    else:
        query = select(Appointment).where(Appointment.doctor_id == current_user.id)
    result = await db.execute(query.order_by(Appointment.scheduled_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Appointment:
    appt = Appointment(**body.model_dump())
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Appointment:
    return await _get_appointment_or_404(appointment_id, current_user, db)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment(
    appointment_id: str,
    body: AppointmentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Appointment:
    appt = await _get_appointment_or_404(appointment_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    appt = await _get_appointment_or_404(appointment_id, current_user, db)
    await db.delete(appt)
    await db.commit()
