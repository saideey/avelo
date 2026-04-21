import math
from datetime import date, time, datetime, timedelta

from sqlalchemy import select, func, text, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, BadRequestError
from app.models.workshop import (
    Workshop, WorkshopService, WorkshopSchedule, WorkshopPhoto,
)
from app.models.booking import Booking, BookingStatus, TimeSlot
from app.schemas.workshop import (
    WorkshopCreate, WorkshopUpdate, NearbyWorkshopFilter,
)

# Earth radius in km for Haversine
EARTH_RADIUS_KM = 6371.0


def _slugify(name: str) -> str:
    """Generate a URL-friendly slug from a workshop name."""
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


async def get_workshops(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    filters: dict | None = None,
) -> list[Workshop]:
    """Get a paginated list of workshops with optional filters."""
    query = select(Workshop).where(
        Workshop.is_active == True,
        Workshop.is_deleted == False,
    )

    if filters:
        if filters.get("city"):
            query = query.where(Workshop.city == filters["city"])
        if filters.get("is_verified") is not None:
            query = query.where(Workshop.is_verified == filters["is_verified"])
        if filters.get("subscription_tier"):
            query = query.where(
                Workshop.subscription_tier == filters["subscription_tier"]
            )
        if filters.get("rating_min"):
            query = query.where(Workshop.rating_avg >= filters["rating_min"])

    query = query.order_by(Workshop.rating_avg.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_nearby_workshops(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_km: float = 5.0,
) -> list[dict]:
    """Find workshops within a given radius using the Haversine formula in SQL."""
    haversine = text(
        f"""
        (
            {EARTH_RADIUS_KM} * acos(
                cos(radians(:lat)) * cos(radians(workshops.latitude))
                * cos(radians(workshops.longitude) - radians(:lng))
                + sin(radians(:lat)) * sin(radians(workshops.latitude))
            )
        )
        """
    )

    query = (
        select(Workshop, haversine.label("distance"))
        .where(
            Workshop.is_active == True,
            Workshop.is_deleted == False,
            Workshop.latitude.is_not(None),
            Workshop.longitude.is_not(None),
        )
        .having(text("distance <= :radius"))
        .params(lat=lat, lng=lng, radius=radius_km)
        .order_by(text("distance"))
    )

    result = await db.execute(query)
    rows = result.all()
    return [{"workshop": row[0], "distance": row[1]} for row in rows]


async def get_workshop_by_slug(db: AsyncSession, slug: str) -> Workshop:
    """Get a single workshop by its slug."""
    result = await db.execute(
        select(Workshop).where(
            Workshop.slug == slug,
            Workshop.is_active == True,
            Workshop.is_deleted == False,
        )
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")
    return workshop


async def create_workshop(
    db: AsyncSession, partner_id, data: WorkshopCreate
) -> Workshop:
    """Create a new workshop for a partner."""
    slug = _slugify(data.name)

    # Ensure slug uniqueness
    existing = await db.execute(select(Workshop).where(Workshop.slug == slug))
    if existing.scalar_one_or_none():
        import uuid as _uuid
        slug = f"{slug}-{_uuid.uuid4().hex[:6]}"

    workshop = Workshop(
        partner_id=partner_id,
        name=data.name,
        slug=slug,
        description=data.description,
        address=data.address,
        city=data.city,
        district=data.district,
        phone=data.phone,
        latitude=data.latitude,
        longitude=data.longitude,
    )
    db.add(workshop)
    await db.flush()
    return workshop


async def update_workshop(
    db: AsyncSession, workshop_id, data: WorkshopUpdate
) -> Workshop:
    """Update an existing workshop's details."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workshop, field, value)

    if "name" in update_data:
        workshop.slug = _slugify(update_data["name"])

    await db.flush()
    return workshop


async def get_available_slots(
    db: AsyncSession, workshop_id, target_date: date
) -> list[dict]:
    """Get available time slots for a workshop on a specific date."""
    day_of_week = target_date.weekday()

    # Get the schedule for this day
    result = await db.execute(
        select(WorkshopSchedule).where(
            WorkshopSchedule.workshop_id == workshop_id,
            WorkshopSchedule.day_of_week == day_of_week,
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule or schedule.is_closed:
        return []

    # Get existing bookings for this date
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)

    booking_result = await db.execute(
        select(Booking.scheduled_at).where(
            Booking.workshop_id == workshop_id,
            Booking.scheduled_at >= start_of_day,
            Booking.scheduled_at <= end_of_day,
            Booking.status.in_([
                BookingStatus.PENDING,
                BookingStatus.CONFIRMED,
                BookingStatus.IN_PROGRESS,
            ]),
        )
    )
    booked_times = {row[0].strftime("%H:%M") for row in booking_result.all()}

    # Generate time slots
    slots = []
    current = datetime.combine(target_date, schedule.open_time)
    close = datetime.combine(target_date, schedule.close_time)
    slot_delta = timedelta(minutes=schedule.slot_duration_minutes)

    while current + slot_delta <= close:
        time_str = current.strftime("%H:%M")
        slots.append({
            "time": time_str,
            "is_available": time_str not in booked_times,
        })
        current += slot_delta

    return slots
