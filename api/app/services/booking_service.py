from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, BadRequestError
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.workshop import Workshop, WorkshopService
from app.schemas.booking import BookingCreate


# Valid status transitions
VALID_TRANSITIONS: dict[BookingStatus, list[BookingStatus]] = {
    BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    BookingStatus.CONFIRMED: [
        BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW,
    ],
    BookingStatus.IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    BookingStatus.COMPLETED: [],
    BookingStatus.CANCELLED: [],
    BookingStatus.NO_SHOW: [],
}


async def create_booking(
    db: AsyncSession, customer_id, data: BookingCreate
) -> Booking:
    """Create a new booking for a customer."""
    # Verify workshop exists
    ws_result = await db.execute(
        select(Workshop).where(
            Workshop.id == data.workshop_id,
            Workshop.is_active == True,
            Workshop.is_deleted == False,
        )
    )
    workshop = ws_result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    # Verify services exist and belong to the workshop
    svc_result = await db.execute(
        select(WorkshopService).where(
            WorkshopService.id.in_(data.service_ids),
            WorkshopService.workshop_id == data.workshop_id,
            WorkshopService.is_available == True,
        )
    )
    services = list(svc_result.scalars().all())
    if len(services) != len(data.service_ids):
        raise BadRequestError("Ba'zi xizmatlar topilmadi yoki mavjud emas")

    # Calculate total price
    total_price = sum(
        float(s.price_from or 0) for s in services
    )

    booking = Booking(
        customer_id=customer_id,
        workshop_id=data.workshop_id,
        vehicle_id=data.vehicle_id,
        scheduled_at=data.scheduled_at,
        status=BookingStatus.PENDING,
        total_price=total_price,
        notes=data.notes,
        is_mobile=data.is_mobile,
        address=data.address,
    )
    db.add(booking)
    await db.flush()

    # Attach services via the association table
    booking.services = services
    await db.flush()

    # Record initial status in history
    history = BookingStatusHistory(
        booking_id=booking.id,
        old_status=None,
        new_status=BookingStatus.PENDING.value,
        changed_by=customer_id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()

    return booking


async def update_booking_status(
    db: AsyncSession, booking_id, new_status: str, changed_by
) -> Booking:
    """Update the status of a booking with transition validation."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    try:
        target_status = BookingStatus(new_status)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri holat: {new_status}")

    allowed = VALID_TRANSITIONS.get(booking.status, [])
    if target_status not in allowed:
        raise BadRequestError(
            f"'{booking.status.value}' dan '{new_status}' ga o'tish mumkin emas"
        )

    old_status = booking.status.value
    booking.status = target_status
    await db.flush()

    history = BookingStatusHistory(
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()

    return booking


async def get_user_bookings(
    db: AsyncSession,
    user_id,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> list[Booking]:
    """Get paginated bookings for a user with optional status filter."""
    query = select(Booking).where(
        Booking.customer_id == user_id,
        Booking.is_deleted == False,
    )

    if status_filter:
        try:
            status_enum = BookingStatus(status_filter)
            query = query.where(Booking.status == status_enum)
        except ValueError:
            raise BadRequestError(f"Noto'g'ri holat filtri: {status_filter}")

    query = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
