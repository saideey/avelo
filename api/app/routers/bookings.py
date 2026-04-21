from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.user import User
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.workshop import Workshop
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


class BookingCreate:
    """Inline model since schema may not exist yet."""
    pass


class BookingCreateBody(BaseModel):
    workshop_id: str
    scheduled_at: str
    vehicle_id: str | None = None
    service_ids: list[str] | None = None
    notes: str | None = None
    total_price: float | None = None
    is_mobile: bool = False
    is_mobile_service: bool = False
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@router.post("/", status_code=201)
async def create_booking(
    body: BookingCreateBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new booking."""
    workshop_id = body.workshop_id
    try:
        scheduled_at = datetime.fromisoformat(body.scheduled_at.replace('Z', '+00:00'))
    except Exception:
        scheduled_at = datetime.now(timezone.utc)
    vehicle_id = body.vehicle_id
    service_ids = body.service_ids
    notes = body.notes
    is_mobile = body.is_mobile or body.is_mobile_service
    address = body.address

    # Verify workshop exists
    ws_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False, Workshop.is_active == True)
    )
    workshop = ws_result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    # Calculate total price from services if not provided
    total_price = body.total_price or 0
    if not total_price and service_ids:
        from app.models.workshop import WorkshopService
        for sid in service_ids:
            svc = (await db.execute(select(WorkshopService).where(WorkshopService.id == sid))).scalar_one_or_none()
            if svc:
                total_price += float(svc.price_from or 0)

    booking = Booking(
        customer_id=current_user.id,
        workshop_id=workshop_id,
        vehicle_id=vehicle_id,
        scheduled_at=scheduled_at,
        status=BookingStatus.PENDING,
        total_price=total_price,
        notes=notes,
        is_mobile=is_mobile,
        address=address,
    )
    db.add(booking)
    await db.flush()

    # Add services if provided
    if service_ids:
        from app.models.workshop import WorkshopService
        for sid in service_ids:
            svc_result = await db.execute(
                select(WorkshopService).where(
                    WorkshopService.id == sid,
                    WorkshopService.workshop_id == workshop_id,
                    WorkshopService.is_deleted == False,
                )
            )
            svc = svc_result.scalar_one_or_none()
            if svc:
                booking.services.append(svc)

    # Record status history
    history = BookingStatusHistory(
        booking_id=booking.id,
        old_status=None,
        new_status=BookingStatus.PENDING.value,
        changed_by=current_user.id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()
    await db.refresh(booking)

    return booking


@router.get("/{booking_id}/history")
async def get_booking_history(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full status change history for a booking."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    # User must be customer or workshop partner
    if booking.customer_id != current_user.id:
        ws_result = await db.execute(
            select(Workshop).where(Workshop.id == booking.workshop_id)
        )
        workshop = ws_result.scalar_one_or_none()
        if not workshop or (workshop.partner_id != current_user.id and current_user.role != "admin"):
            raise ForbiddenError("Ruxsat yo'q")

    history_result = await db.execute(
        select(BookingStatusHistory)
        .where(BookingStatusHistory.booking_id == booking_id)
        .order_by(BookingStatusHistory.timestamp.asc())
    )
    history = history_result.scalars().all()

    return {"booking_id": booking_id, "history": history}


@router.get("/{booking_id}")
async def get_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get booking detail."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    # User must be customer or workshop partner
    if booking.customer_id != current_user.id:
        ws_result = await db.execute(
            select(Workshop).where(Workshop.id == booking.workshop_id)
        )
        workshop = ws_result.scalar_one_or_none()
        if not workshop or (workshop.partner_id != current_user.id and current_user.role != "admin"):
            raise ForbiddenError("Ruxsat yo'q")

    return booking


async def _change_booking_status(
    booking_id: UUID,
    new_status: BookingStatus,
    user: User,
    db: AsyncSession,
    allowed_from: list[BookingStatus] | None = None,
    mechanic_notes: str | None = None,
):
    """Helper to transition booking status."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if allowed_from and booking.status not in allowed_from:
        raise BadRequestError(
            f"Buyurtma holati '{booking.status.value}' dan '{new_status.value}' ga o'zgartirib bo'lmaydi"
        )

    old_status = booking.status.value
    booking.status = new_status
    if mechanic_notes:
        booking.mechanic_notes = mechanic_notes

    history = BookingStatusHistory(
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status.value,
        changed_by=user.id,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()
    await db.refresh(booking)
    return booking


@router.patch("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if booking.customer_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("Ruxsat yo'q")

    return await _change_booking_status(
        booking_id, BookingStatus.CANCELLED, current_user, db,
        allowed_from=[BookingStatus.PENDING, BookingStatus.CONFIRMED],
    )


@router.patch("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: UUID,
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Workshop confirms a booking."""
    return await _change_booking_status(
        booking_id, BookingStatus.CONFIRMED, current_user, db,
        allowed_from=[BookingStatus.PENDING],
    )


@router.patch("/{booking_id}/start")
async def start_booking(
    booking_id: UUID,
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Start work on booking."""
    return await _change_booking_status(
        booking_id, BookingStatus.IN_PROGRESS, current_user, db,
        allowed_from=[BookingStatus.CONFIRMED],
    )


@router.patch("/{booking_id}/complete")
async def complete_booking(
    booking_id: UUID,
    mechanic_notes: str | None = None,
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Complete work on booking."""
    return await _change_booking_status(
        booking_id, BookingStatus.COMPLETED, current_user, db,
        allowed_from=[BookingStatus.IN_PROGRESS],
        mechanic_notes=mechanic_notes,
    )


@router.get("/workshop/{workshop_id}")
async def get_workshop_bookings(
    workshop_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get bookings for a workshop (partner only)."""
    # Verify ownership
    ws_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    workshop = ws_result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    if workshop.partner_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("Ruxsat yo'q")

    query = select(Booking).where(
        Booking.workshop_id == workshop_id,
        Booking.is_deleted == False,
    )
    if status:
        query = query.where(Booking.status == status)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Booking.scheduled_at.desc()).offset(skip).limit(limit)
    )
    bookings = result.scalars().all()

    return {"items": bookings, "total": total, "skip": skip, "limit": limit}
