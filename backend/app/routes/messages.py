from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Message, User
from app.schemas import MessageCreate, MessageOut, MessageUpdate
from app.security import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_message_or_404(
    message_id: str,
    current_user: User,
    db: AsyncSession,
) -> Message:
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            ),
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[MessageOut])
async def list_messages(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Message]:
    result = await db.execute(
        select(Message)
        .where(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            )
        )
        .order_by(Message.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Message:
    # Verify receiver exists
    result = await db.execute(select(User).where(User.id == body.receiver_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    message = Message(**body.model_dump(), sender_id=current_user.id)
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/{message_id}", response_model=MessageOut)
async def get_message(
    message_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Message:
    return await _get_message_or_404(message_id, current_user, db)


@router.patch("/{message_id}/read", response_model=MessageOut)
async def mark_read(
    message_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Message:
    message = await _get_message_or_404(message_id, current_user, db)

    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the recipient can mark a message as read")

    message.is_read = True
    message.read_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(message)
    return message


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    message = await _get_message_or_404(message_id, current_user, db)

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the sender can delete a message")

    await db.delete(message)
    await db.commit()
