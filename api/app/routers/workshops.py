from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.user import User
from app.models.workshop import Workshop, WorkshopService, WorkshopSchedule
from app.models.booking import Booking, BookingStatus, TimeSlot
from app.models.review import Review
from app.models.service import ServiceCategory
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/workshops", tags=["Workshops"])


# --- Public endpoints ---

def _apply_workshop_filters(
    query,
    *,
    category: str | None = None,
    rating_min: float | None = None,
    price_min: int | None = None,
    price_max: int | None = None,
    has_mobile: bool | None = None,
    is_verified: bool | None = None,
):
    """Apply common workshop filters to a query."""
    if category:
        # Support comma-separated categories, search by category name OR service name
        cat_list = [c.strip() for c in category.split(",") if c.strip()]
        conditions = []
        for cat_name in cat_list:
            conditions.append(WorkshopService.name.ilike(f"%{cat_name}%"))
            conditions.append(WorkshopService.category_id.in_(
                select(ServiceCategory.id).where(ServiceCategory.name.ilike(f"%{cat_name}%"))
            ))
        if conditions:
            query = query.where(
                Workshop.id.in_(
                    select(WorkshopService.workshop_id).where(
                        or_(*conditions),
                        WorkshopService.is_deleted == False,
                    )
                )
            )

    if rating_min is not None:
        query = query.where(Workshop.rating_avg >= rating_min)

    if price_min is not None:
        query = query.where(
            Workshop.id.in_(
                select(WorkshopService.workshop_id).where(
                    WorkshopService.price_from >= price_min,
                    WorkshopService.is_deleted == False,
                )
            )
        )

    if price_max is not None:
        query = query.where(
            Workshop.id.in_(
                select(WorkshopService.workshop_id).where(
                    WorkshopService.price_to <= price_max,
                    WorkshopService.is_deleted == False,
                )
            )
        )

    if has_mobile is not None and has_mobile:
        query = query.where(
            Workshop.id.in_(
                select(Booking.workshop_id).where(
                    Booking.is_mobile == True,
                    Booking.is_deleted == False,
                ).distinct()
            )
        )

    if is_verified is not None:
        query = query.where(Workshop.is_verified == is_verified)

    return query


def _apply_workshop_sort(query, sort: str | None, lat: float | None = None, lng: float | None = None):
    """Apply sorting to a workshop query."""
    if sort == "rating":
        return query.order_by(Workshop.rating_avg.desc())
    elif sort == "price_asc":
        return query.order_by(Workshop.rating_avg.asc())  # fallback; price is on services
    elif sort == "price_desc":
        return query.order_by(Workshop.rating_avg.desc())
    elif sort == "nearest" and lat is not None and lng is not None:
        distance = func.sqrt(
            func.pow(Workshop.latitude - lat, 2) + func.pow(Workshop.longitude - lng, 2)
        )
        return query.order_by(distance.asc())
    else:
        return query.order_by(Workshop.rating_avg.desc())


@router.get("/")
async def list_workshops(
    search: str | None = Query(None),
    category: str | None = Query(None, description="Filter by service category name"),
    rating_min: float | None = Query(None, ge=0, le=5, description="Minimum rating"),
    price_min: int | None = Query(None, ge=0, description="Minimum price range"),
    price_max: int | None = Query(None, ge=0, description="Maximum price range"),
    has_mobile: bool | None = Query(None, description="Workshops with mobile/home service"),
    is_verified: bool | None = Query(None, description="Only verified workshops"),
    sort: str | None = Query(None, description="Sort: rating, price_asc, price_desc, nearest"),
    lat: float | None = Query(None, description="Latitude (required for nearest sort)"),
    lng: float | None = Query(None, description="Longitude (required for nearest sort)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List workshops with optional search and filters, paginated."""
    query = select(Workshop).where(
        Workshop.is_deleted == False,
        Workshop.is_active == True,
    )
    if search:
        query = query.where(
            or_(
                Workshop.name.ilike(f"%{search}%"),
                Workshop.address.ilike(f"%{search}%"),
                Workshop.city.ilike(f"%{search}%"),
            )
        )

    query = _apply_workshop_filters(
        query,
        category=category,
        rating_min=rating_min,
        price_min=price_min,
        price_max=price_max,
        has_mobile=has_mobile,
        is_verified=is_verified,
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = _apply_workshop_sort(query, sort, lat=lat, lng=lng)
    result = await db.execute(query.offset(skip).limit(limit))
    workshops = result.scalars().all()

    return {"items": workshops, "total": total, "skip": skip, "limit": limit}


@router.get("/nearby")
async def nearby_workshops(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(10.0, description="Radius in km"),
    category: str | None = Query(None, description="Filter by service category name"),
    rating_min: float | None = Query(None, ge=0, le=5, description="Minimum rating"),
    price_min: int | None = Query(None, ge=0, description="Minimum price range"),
    price_max: int | None = Query(None, ge=0, description="Maximum price range"),
    has_mobile: bool | None = Query(None, description="Workshops with mobile/home service"),
    is_verified: bool | None = Query(None, description="Only verified workshops"),
    sort: str | None = Query(None, description="Sort: rating, price_asc, price_desc, nearest"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Find nearby workshops using simple Euclidean distance approximation."""
    # Approximate degree-to-km conversion at ~41 lat (Uzbekistan)
    lat_km = 111.0
    lng_km = 85.0
    degree_radius_lat = radius / lat_km
    degree_radius_lng = radius / lng_km

    query = (
        select(Workshop)
        .where(
            Workshop.is_deleted == False,
            Workshop.is_active == True,
            Workshop.latitude.isnot(None),
            Workshop.longitude.isnot(None),
            Workshop.latitude.between(lat - degree_radius_lat, lat + degree_radius_lat),
            Workshop.longitude.between(lng - degree_radius_lng, lng + degree_radius_lng),
        )
    )

    query = _apply_workshop_filters(
        query,
        category=category,
        rating_min=rating_min,
        price_min=price_min,
        price_max=price_max,
        has_mobile=has_mobile,
        is_verified=is_verified,
    )

    # Default to nearest sort for /nearby
    effective_sort = sort if sort else "nearest"
    query = _apply_workshop_sort(query, effective_sort, lat=lat, lng=lng)

    result = await db.execute(query.offset(skip).limit(limit))
    workshops = result.scalars().all()

    return {"items": workshops, "lat": lat, "lng": lng, "radius_km": radius}


@router.get("/categories")
async def list_service_categories(
    db: AsyncSession = Depends(get_db),
):
    """Public list of all service categories."""
    result = await db.execute(
        select(ServiceCategory)
        .where(ServiceCategory.is_deleted == False)
        .order_by(ServiceCategory.order.asc(), ServiceCategory.name.asc())
    )
    categories = result.scalars().all()
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "icon_url": cat.icon_url,
            "parent_id": cat.parent_id,
        }
        for cat in categories
    ]


@router.get("/{slug}")
async def get_workshop_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """Get workshop detail by slug."""
    result = await db.execute(
        select(Workshop).where(
            Workshop.slug == slug,
            Workshop.is_deleted == False,
        )
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")
    return workshop


@router.get("/{workshop_id}/slots")
async def get_available_slots(
    workshop_id: UUID,
    slot_date: str = Query(..., alias="date"),
    db: AsyncSession = Depends(get_db),
):
    """Get available time slots for a workshop on a specific date — dynamically generated from schedule."""
    from datetime import datetime as dt, time as dtime, timedelta

    # Parse date
    try:
        target_date = dt.strptime(slot_date, "%Y-%m-%d").date()
    except ValueError:
        raise BadRequestError("Sana formati noto'g'ri (YYYY-MM-DD)")

    # Get workshop
    ws = (await db.execute(select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False))).scalar_one_or_none()
    if not ws:
        raise NotFoundError("Ustaxona")

    # Get schedule for this day of week
    dow = target_date.weekday()  # 0=Monday
    schedule = (await db.execute(
        select(WorkshopSchedule).where(
            WorkshopSchedule.workshop_id == workshop_id,
            WorkshopSchedule.day_of_week == dow,
            WorkshopSchedule.is_deleted == False,
        )
    )).scalar_one_or_none()

    day_labels = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]

    if not schedule or schedule.is_closed:
        return {
            "date": slot_date,
            "day_label": day_labels[dow],
            "is_closed": True,
            "slots": [],
        }

    # Generate slots
    open_time = schedule.open_time
    close_time = schedule.close_time
    slot_duration = schedule.slot_duration_minutes or 30
    max_parallel = schedule.max_concurrent_bookings or 1

    # Count existing bookings per time slot
    from sqlalchemy import cast, Time
    bookings_result = await db.execute(
        select(Booking.scheduled_at).where(
            Booking.workshop_id == workshop_id,
            Booking.is_deleted == False,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
            func.date(Booking.scheduled_at) == target_date,
        )
    )
    booked_times: dict[str, int] = {}
    for row in bookings_result:
        if row.scheduled_at:
            t_str = row.scheduled_at.strftime("%H:%M")
            booked_times[t_str] = booked_times.get(t_str, 0) + 1

    # Generate time slots
    slots = []
    current = dt.combine(target_date, open_time)
    end = dt.combine(target_date, close_time)

    while current < end:
        t_str = current.strftime("%H:%M")
        booked = booked_times.get(t_str, 0)
        available = max_parallel - booked

        if available > 0:
            status = "free"
        elif available == 0:
            status = "full"
        else:
            status = "full"

        if available == 1 and max_parallel > 1:
            status = "limited"

        slots.append({
            "time": t_str,
            "available": max(available, 0),
            "booked": booked,
            "max": max_parallel,
            "status": status,
        })

        current += timedelta(minutes=slot_duration)

    return {
        "date": slot_date,
        "day_label": day_labels[dow],
        "is_closed": False,
        "open_time": open_time.strftime("%H:%M") if open_time else "09:00",
        "close_time": close_time.strftime("%H:%M") if close_time else "18:00",
        "slot_duration": slot_duration,
        "max_parallel": max_parallel,
        "slots": slots,
    }


@router.get("/{workshop_id}/reviews")
async def get_workshop_reviews(
    workshop_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get workshop reviews, paginated."""
    count_result = await db.execute(
        select(func.count()).select_from(Review).where(
            Review.workshop_id == workshop_id,
            Review.is_visible == True,
            Review.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Review)
        .where(
            Review.workshop_id == workshop_id,
            Review.is_visible == True,
            Review.is_deleted == False,
        )
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    reviews = result.scalars().all()

    return {"items": reviews, "total": total, "skip": skip, "limit": limit}


@router.get("/{workshop_id}/services")
async def get_workshop_services(
    workshop_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get workshop's service list."""
    result = await db.execute(
        select(WorkshopService).where(
            WorkshopService.workshop_id == workshop_id,
            WorkshopService.is_deleted == False,
            WorkshopService.is_available == True,
        )
    )
    services = result.scalars().all()
    return services


# --- Partner/Admin endpoints ---

@router.post("/", status_code=201)
async def create_workshop(
    name: str,
    slug: str,
    description: str | None = None,
    address: str | None = None,
    city: str | None = None,
    district: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    phone: str | None = None,
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workshop (partner/admin only)."""
    # Check slug uniqueness
    existing = await db.execute(
        select(Workshop).where(Workshop.slug == slug, Workshop.is_deleted == False)
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Bu slug allaqachon mavjud")

    workshop = Workshop(
        partner_id=current_user.id,
        name=name,
        slug=slug,
        description=description,
        address=address,
        city=city,
        district=district,
        latitude=latitude,
        longitude=longitude,
        phone=phone,
    )
    db.add(workshop)
    await db.flush()
    await db.refresh(workshop)
    return workshop


@router.patch("/{workshop_id}")
async def update_workshop(
    workshop_id: UUID,
    name: str | None = None,
    description: str | None = None,
    address: str | None = None,
    city: str | None = None,
    district: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    phone: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update workshop (owner only)."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    if workshop.partner_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("Faqat ustaxona egasi o'zgartira oladi")

    updates = {
        "name": name, "description": description, "address": address,
        "city": city, "district": district, "latitude": latitude,
        "longitude": longitude, "phone": phone,
    }
    for field, value in updates.items():
        if value is not None:
            setattr(workshop, field, value)

    await db.flush()
    await db.refresh(workshop)
    return workshop


@router.post("/{workshop_id}/services", status_code=201)
async def add_workshop_service(
    workshop_id: UUID,
    category_id: UUID,
    name: str,
    price_from: float | None = None,
    price_to: float | None = None,
    duration_minutes: int | None = None,
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Add a service to a workshop."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    if workshop.partner_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("Ruxsat yo'q")

    service = WorkshopService(
        workshop_id=workshop_id,
        category_id=category_id,
        name=name,
        price_from=price_from,
        price_to=price_to,
        duration_minutes=duration_minutes,
    )
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


@router.put("/{workshop_id}/schedule")
async def update_schedule(
    workshop_id: UUID,
    schedules: list[dict],
    current_user: User = Depends(require_role("partner", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Update workshop schedule (list of day schedules)."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    if workshop.partner_id != current_user.id and current_user.role != "admin":
        raise ForbiddenError("Ruxsat yo'q")

    # Delete existing schedules (soft delete)
    existing = await db.execute(
        select(WorkshopSchedule).where(
            WorkshopSchedule.workshop_id == workshop_id,
            WorkshopSchedule.is_deleted == False,
        )
    )
    for sched in existing.scalars().all():
        sched.is_deleted = True

    # Create new schedules
    new_schedules = []
    for s in schedules:
        schedule = WorkshopSchedule(
            workshop_id=workshop_id,
            day_of_week=s["day_of_week"],
            open_time=s.get("open_time"),
            close_time=s.get("close_time"),
            is_closed=s.get("is_closed", False),
            slot_duration_minutes=s.get("slot_duration_minutes", 30),
            max_concurrent_bookings=s.get("max_concurrent_bookings", 1),
        )
        db.add(schedule)
        new_schedules.append(schedule)

    await db.flush()
    return new_schedules
