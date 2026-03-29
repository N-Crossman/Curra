from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import JournalEntry, User
from app.schemas import JournalEntryCreate, JournalEntryOut, JournalEntryUpdate
from app.security import get_current_user

router = APIRouter(prefix="/journal", tags=["journal"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_entry_or_404(
    entry_id: str,
    current_user: User,
    db: AsyncSession,
) -> JournalEntry:
    result = await db.execute(
        select(JournalEntry).where(
            JournalEntry.id == entry_id,
            JournalEntry.patient_id == current_user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    return entry


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[JournalEntryOut])
async def list_entries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[JournalEntry]:
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.patient_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
async def create_entry(
    body: JournalEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntry:
    entry = JournalEntry(**body.model_dump(), patient_id=current_user.id)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=JournalEntryOut)
async def get_entry(
    entry_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntry:
    return await _get_entry_or_404(entry_id, current_user, db)


@router.patch("/{entry_id}", response_model=JournalEntryOut)
async def update_entry(
    entry_id: str,
    body: JournalEntryUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JournalEntry:
    entry = await _get_entry_or_404(entry_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    entry = await _get_entry_or_404(entry_id, current_user, db)
    await db.delete(entry)
    await db.commit()
