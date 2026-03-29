from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import LabPanel, LabValue, User
from app.schemas import (
    LabPanelCreate,
    LabPanelOut,
    LabPanelUpdate,
    LabValueCreate,
    LabValueOut,
    LabValueUpdate,
)
from app.security import get_current_user
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/labs", tags=["labs"])


class LabPanelWithValues(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    panel: LabPanelOut
    values: list[LabValueOut]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_panel_or_404(
    panel_id: str,
    current_user: User,
    db: AsyncSession,
) -> LabPanel:
    result = await db.execute(
        select(LabPanel).where(
            LabPanel.id == panel_id,
            LabPanel.patient_id == current_user.id,
        )
    )
    panel = result.scalar_one_or_none()
    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab panel not found")
    return panel


# ---------------------------------------------------------------------------
# Panels — CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=list[LabPanelOut])
async def list_panels(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[LabPanel]:
    result = await db.execute(
        select(LabPanel)
        .where(LabPanel.patient_id == current_user.id)
        .order_by(LabPanel.drawn_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=LabPanelOut, status_code=status.HTTP_201_CREATED)
async def create_panel(
    body: LabPanelCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabPanel:
    panel = LabPanel(**body.model_dump())
    db.add(panel)
    await db.commit()
    await db.refresh(panel)
    return panel


@router.get("/{panel_id}", response_model=LabPanelWithValues)
async def get_panel(
    panel_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabPanelWithValues:
    panel = await _get_panel_or_404(panel_id, current_user, db)
    result = await db.execute(
        select(LabValue).where(LabValue.panel_id == panel_id).order_by(LabValue.test_name)
    )
    values = list(result.scalars().all())
    return LabPanelWithValues(
        panel=LabPanelOut.model_validate(panel),
        values=[LabValueOut.model_validate(v) for v in values],
    )


@router.patch("/{panel_id}", response_model=LabPanelOut)
async def update_panel(
    panel_id: str,
    body: LabPanelUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabPanel:
    panel = await _get_panel_or_404(panel_id, current_user, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(panel, field, value)
    await db.commit()
    await db.refresh(panel)
    return panel


@router.delete("/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_panel(
    panel_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    panel = await _get_panel_or_404(panel_id, current_user, db)
    await db.delete(panel)
    await db.commit()


# ---------------------------------------------------------------------------
# Lab values — CRUD (nested under a panel)
# ---------------------------------------------------------------------------

@router.post("/{panel_id}/values", response_model=LabValueOut, status_code=status.HTTP_201_CREATED)
async def add_value(
    panel_id: str,
    body: LabValueCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabValue:
    await _get_panel_or_404(panel_id, current_user, db)
    value = LabValue(**body.model_dump(), panel_id=panel_id)
    db.add(value)
    await db.commit()
    await db.refresh(value)
    return value


@router.patch("/{panel_id}/values/{value_id}", response_model=LabValueOut)
async def update_value(
    panel_id: str,
    value_id: str,
    body: LabValueUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LabValue:
    await _get_panel_or_404(panel_id, current_user, db)
    result = await db.execute(
        select(LabValue).where(LabValue.id == value_id, LabValue.panel_id == panel_id)
    )
    lab_value = result.scalar_one_or_none()
    if not lab_value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab value not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lab_value, field, value)
    await db.commit()
    await db.refresh(lab_value)
    return lab_value


@router.delete("/{panel_id}/values/{value_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_value(
    panel_id: str,
    value_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await _get_panel_or_404(panel_id, current_user, db)
    result = await db.execute(
        select(LabValue).where(LabValue.id == value_id, LabValue.panel_id == panel_id)
    )
    lab_value = result.scalar_one_or_none()
    if not lab_value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab value not found")
    await db.delete(lab_value)
    await db.commit()
