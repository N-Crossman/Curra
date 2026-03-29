from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DoctorProfile, PatientProfile, User, UserRole
from app.schemas import (
    DoctorProfileOut,
    DoctorProfileUpdate,
    PatientProfileOut,
    PatientProfileUpdate,
    UserOut,
    UserUpdate,
)
from app.security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])


class UserWithProfile(BaseModel):
    user: UserOut
    profile: PatientProfileOut | DoctorProfileOut | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserWithProfile)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserWithProfile:
    profile = None

    if current_user.role == UserRole.patient:
        result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        raw = result.scalar_one_or_none()
        if raw:
            profile = PatientProfileOut.model_validate(raw)

    elif current_user.role == UserRole.doctor:
        result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        raw = result.scalar_one_or_none()
        if raw:
            profile = DoctorProfileOut.model_validate(raw)

    return UserWithProfile(
        user=UserOut.model_validate(current_user),
        profile=profile,
    )


# ---------------------------------------------------------------------------
# PATCH /users/me
# ---------------------------------------------------------------------------

@router.patch("/me", response_model=UserWithProfile)
async def update_me(
    user_body: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserWithProfile:
    for field, value in user_body.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    # Re-fetch profile for response
    profile = None
    if current_user.role == UserRole.patient:
        result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        raw = result.scalar_one_or_none()
        if raw:
            profile = PatientProfileOut.model_validate(raw)
    elif current_user.role == UserRole.doctor:
        result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        raw = result.scalar_one_or_none()
        if raw:
            profile = DoctorProfileOut.model_validate(raw)

    return UserWithProfile(
        user=UserOut.model_validate(current_user),
        profile=profile,
    )


# ---------------------------------------------------------------------------
# PATCH /users/me/profile
# ---------------------------------------------------------------------------

@router.patch("/me/profile", response_model=PatientProfileOut | DoctorProfileOut)
async def update_my_profile(
    patient_body: PatientProfileUpdate | None = None,
    doctor_body: DoctorProfileUpdate | None = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> PatientProfile | DoctorProfile:
    if current_user.role == UserRole.patient:
        result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        body = patient_body or PatientProfileUpdate()
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

    elif current_user.role == UserRole.doctor:
        result = await db.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        body = doctor_body or DoctorProfileUpdate()
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No profile for this role")

    await db.commit()
    await db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# GET /users/doctors
# ---------------------------------------------------------------------------

@router.get("/doctors", response_model=list[UserOut])
async def list_doctors(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[User]:
    result = await db.execute(
        select(User).where(User.role == UserRole.doctor, User.is_active == True)
    )
    return list(result.scalars().all())
