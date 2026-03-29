from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CareTeamMember, CareTeamStatus, User, UserRole
from app.schemas import CareTeamMemberCreate, CareTeamMemberOut, CareTeamMemberUpdate
from app.security import get_current_user

router = APIRouter(prefix="/care-team", tags=["care-team"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_member_or_404(
    member_id: str,
    current_user: User,
    db: AsyncSession,
) -> CareTeamMember:
    result = await db.execute(
        select(CareTeamMember).where(
            CareTeamMember.id == member_id,
            CareTeamMember.patient_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care team member not found")
    return member


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[CareTeamMemberOut])
async def list_care_team(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CareTeamMember]:
    if current_user.role == UserRole.patient:
        query = select(CareTeamMember).where(CareTeamMember.patient_id == current_user.id)
    else:
        query = select(CareTeamMember).where(CareTeamMember.doctor_id == current_user.id)
    result = await db.execute(query.order_by(CareTeamMember.status))
    return list(result.scalars().all())


@router.post("", response_model=CareTeamMemberOut, status_code=status.HTTP_201_CREATED)
async def add_to_care_team(
    body: CareTeamMemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CareTeamMember:
    # Verify the doctor exists
    result = await db.execute(
        select(User).where(User.id == body.doctor_id, User.role == UserRole.doctor)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    # Prevent duplicates
    result = await db.execute(
        select(CareTeamMember).where(
            CareTeamMember.patient_id == body.patient_id,
            CareTeamMember.doctor_id == body.doctor_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Doctor already on care team")

    member = CareTeamMember(**body.model_dump())
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.patch("/{member_id}", response_model=CareTeamMemberOut)
async def update_care_team_member(
    member_id: str,
    body: CareTeamMemberUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CareTeamMember:
    member = await _get_member_or_404(member_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_care_team(
    member_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    member = await _get_member_or_404(member_id, current_user, db)
    await db.delete(member)
    await db.commit()
