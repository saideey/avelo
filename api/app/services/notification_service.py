from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id,
    title: str,
    body: str,
    type: str,
    data: dict | None = None,
) -> Notification:
    """Create a new notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        data=data,
    )
    db.add(notification)
    await db.flush()
    return notification


async def get_user_notifications(
    db: AsyncSession,
    user_id,
    skip: int = 0,
    limit: int = 20,
) -> list[Notification]:
    """Get paginated notifications for a user."""
    result = await db.execute(
        select(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_deleted == False,
        )
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def mark_as_read(db: AsyncSession, notification_id) -> None:
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("Xabarnoma")

    notification.is_read = True
    await db.flush()
