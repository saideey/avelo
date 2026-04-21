from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.models.notification import Notification
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's notifications, paginated."""
    count_result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_deleted == False)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notifications = result.scalars().all()

    return {"items": notifications, "total": total, "skip": skip, "limit": limit}


@router.patch("/{notification_id}/read", response_model=SuccessResponse)
async def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.is_deleted == False,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("Bildirishnoma")

    notification.is_read = True
    await db.flush()
    return SuccessResponse(message="O'qildi deb belgilandi")


@router.patch("/read-all", response_model=SuccessResponse)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
            Notification.is_deleted == False,
        )
        .values(is_read=True)
    )
    await db.flush()
    return SuccessResponse(message="Barcha bildirishnomalar o'qildi")
