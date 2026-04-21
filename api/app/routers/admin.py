from uuid import UUID
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_, cast, Date, case, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.dependencies import require_admin, ADMIN_ROLES
from app.core.exceptions import NotFoundError, BadRequestError, ForbiddenError
from app.models.user import User, UserRole
from app.models.vehicle import UserVehicle
from app.models.workshop import Workshop, SubscriptionTier, WorkshopService, WorkshopPhoto, WorkshopSchedule
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.review import Review
from app.models.parts import Part, PartCategory, PartBrand, PartPrice, PartInventory, PartOrder, PartOrderItem, PartOrderStatus
from app.models.warranty import Warranty, WarrantyClaim, WarrantyClaimStatus
from app.models.cashback import CashbackWallet
from app.models.admin import (
    AuditLog, AuditAction,
    Complaint, ComplaintStatus, ComplaintType,
    PlatformSettings,
)
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

# ---------------------------------------------------------------------------
# Dependency shortcuts
# ---------------------------------------------------------------------------
moderator_dep = Depends(require_admin("moderator"))
regional_dep = Depends(require_admin("regional_admin"))
admin_dep = Depends(require_admin("admin"))
super_dep = Depends(require_admin("super_admin"))

# ---------------------------------------------------------------------------
# Pydantic request/response bodies
# ---------------------------------------------------------------------------


class AdminCreateBody(BaseModel):
    phone: str
    full_name: str
    role: str  # admin | moderator | regional_admin | super_admin
    region: str | None = None


class RoleChangeBody(BaseModel):
    role: str


class BlockBody(BaseModel):
    is_active: bool


class StatusChangeBody(BaseModel):
    status: str
    note: str | None = None


class RefundBody(BaseModel):
    reason: str | None = None


class ReplyBody(BaseModel):
    reply: str


class ClaimActionBody(BaseModel):
    admin_notes: str | None = None


class ComplaintCreateBody(BaseModel):
    complainant_id: UUID
    against_id: UUID | None = None
    workshop_id: UUID | None = None
    booking_id: UUID | None = None
    type: str = "other"
    subject: str
    description: str
    priority: int = Field(1, ge=1, le=4)


class ComplaintAssignBody(BaseModel):
    assigned_to: UUID


class ComplaintResolveBody(BaseModel):
    resolution: str


class SettingBody(BaseModel):
    key: str | None = None
    value: str
    description: str | None = None
    category: str = "general"


class SubscriptionBody(BaseModel):
    tier: str


# ---------------------------------------------------------------------------
# Audit helper
# ---------------------------------------------------------------------------
async def log_audit(
    db: AsyncSession,
    admin_id: UUID,
    action: AuditAction,
    resource_type: str,
    resource_id: str | None = None,
    description: str = "",
    old_value: dict | None = None,
    new_value: dict | None = None,
    ip_address: str | None = None,
):
    entry = AuditLog(
        admin_id=admin_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        description=description,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()


def _get_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _apply_region_filter(query, current_user: User, workshop_alias=Workshop):
    """For regional_admin, restrict results to their region."""
    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if role_val == "regional_admin" and current_user.region:
        query = query.where(workshop_alias.city == current_user.region)
    return query


# =========================================================================
# MODULE 1: Dashboard & Analytics
# =========================================================================


@router.get("/analytics/overview")
async def analytics_overview(
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """KPI dashboard: total users, workshops, bookings, revenue, today's numbers."""
    today = datetime.now(timezone.utc).date()

    total_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_deleted == False)
    )).scalar()

    total_workshops = (await db.execute(
        select(func.count()).select_from(Workshop).where(Workshop.is_deleted == False)
    )).scalar()

    total_bookings = (await db.execute(
        select(func.count()).select_from(Booking).where(Booking.is_deleted == False)
    )).scalar()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.SUCCESS,
            Payment.is_deleted == False,
        )
    )).scalar()

    active_bookings = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.is_deleted == False,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
        )
    )).scalar()

    today_bookings = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.is_deleted == False,
            cast(Booking.created_at, Date) == today,
        )
    )).scalar()

    today_users = (await db.execute(
        select(func.count()).select_from(User).where(
            User.is_deleted == False,
            cast(User.created_at, Date) == today,
        )
    )).scalar()

    today_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.SUCCESS,
            Payment.is_deleted == False,
            cast(Payment.paid_at, Date) == today,
        )
    )).scalar()

    return {
        "total_users": total_users,
        "total_workshops": total_workshops,
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "total_revenue": float(total_revenue),
        "today_bookings": today_bookings,
        "today_users": today_users,
        "today_revenue": float(today_revenue),
    }


@router.get("/analytics/revenue")
async def analytics_revenue(
    period: str = Query("monthly", regex="^(weekly|monthly|yearly)$"),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Revenue aggregated by period."""
    now = datetime.now(timezone.utc)

    if period == "weekly":
        start = now - timedelta(weeks=12)
        trunc = func.date_trunc("week", Payment.paid_at)
    elif period == "monthly":
        start = now - timedelta(days=365)
        trunc = func.date_trunc("month", Payment.paid_at)
    else:
        start = now - timedelta(days=365 * 5)
        trunc = func.date_trunc("year", Payment.paid_at)

    rows = (await db.execute(
        select(
            trunc.label("period"),
            func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
            func.count().label("count"),
        )
        .where(
            Payment.status == PaymentStatus.SUCCESS,
            Payment.is_deleted == False,
            Payment.paid_at >= start,
        )
        .group_by(trunc)
        .order_by(trunc)
    )).all()

    return {
        "period": period,
        "data": [
            {"period": str(r.period), "revenue": float(r.revenue), "count": r.count}
            for r in rows
        ],
    }


@router.get("/analytics/bookings-chart")
async def analytics_bookings_chart(
    days: int = Query(30, ge=1, le=90),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Bookings count per day for the last N days."""
    start = datetime.now(timezone.utc) - timedelta(days=days)

    rows = (await db.execute(
        select(
            cast(Booking.created_at, Date).label("date"),
            func.count().label("count"),
        )
        .where(Booking.is_deleted == False, Booking.created_at >= start)
        .group_by(cast(Booking.created_at, Date))
        .order_by(cast(Booking.created_at, Date))
    )).all()

    return {"days": days, "data": [{"date": str(r.date), "count": r.count} for r in rows]}


@router.get("/analytics/regions")
async def analytics_regions(
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Stats broken down by city/region."""
    workshop_q = (await db.execute(
        select(
            Workshop.city.label("region"),
            func.count().label("workshops"),
            func.coalesce(func.avg(Workshop.rating_avg), 0).label("avg_rating"),
        )
        .where(Workshop.is_deleted == False, Workshop.city.isnot(None))
        .group_by(Workshop.city)
        .order_by(func.count().desc())
    )).all()

    # Bookings per region
    booking_q = (await db.execute(
        select(
            Workshop.city.label("region"),
            func.count(Booking.id).label("bookings"),
            func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
        )
        .select_from(Booking)
        .join(Workshop, Workshop.id == Booking.workshop_id)
        .outerjoin(Payment, and_(Payment.booking_id == Booking.id, Payment.status == PaymentStatus.SUCCESS))
        .where(Booking.is_deleted == False, Workshop.city.isnot(None))
        .group_by(Workshop.city)
    )).all()

    booking_map = {r.region: {"bookings": r.bookings, "revenue": float(r.revenue)} for r in booking_q}

    data = []
    for r in workshop_q:
        bdata = booking_map.get(r.region, {"bookings": 0, "revenue": 0.0})
        data.append({
            "region": r.region,
            "workshops": r.workshops,
            "avg_rating": round(float(r.avg_rating), 2),
            "bookings": bdata["bookings"],
            "revenue": bdata["revenue"],
        })

    return {"data": data}


@router.get("/analytics/top-workshops")
async def analytics_top_workshops(
    sort_by: str = Query("bookings", regex="^(bookings|revenue|rating)$"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Top workshops by bookings, revenue, or rating."""
    base = (
        select(
            Workshop.id,
            Workshop.name,
            Workshop.city,
            Workshop.rating_avg,
            Workshop.total_reviews,
            func.count(func.distinct(Booking.id)).label("booking_count"),
            func.coalesce(func.sum(
                case((Payment.status == PaymentStatus.SUCCESS, Payment.amount), else_=0)
            ), 0).label("total_revenue"),
        )
        .select_from(Workshop)
        .outerjoin(Booking, and_(Booking.workshop_id == Workshop.id, Booking.is_deleted == False))
        .outerjoin(Payment, and_(Payment.booking_id == Booking.id, Payment.status == PaymentStatus.SUCCESS, Payment.is_deleted == False))
        .where(Workshop.is_deleted == False)
        .group_by(Workshop.id, Workshop.name, Workshop.city, Workshop.rating_avg, Workshop.total_reviews)
    )

    if sort_by == "bookings":
        base = base.order_by(func.count(func.distinct(Booking.id)).desc())
    elif sort_by == "revenue":
        base = base.order_by(func.coalesce(func.sum(
            case((Payment.status == PaymentStatus.SUCCESS, Payment.amount), else_=0)
        ), 0).desc())
    else:
        base = base.order_by(Workshop.rating_avg.desc())

    rows = (await db.execute(base.limit(limit))).all()

    return {
        "sort_by": sort_by,
        "data": [
            {
                "id": str(r.id),
                "name": r.name,
                "city": r.city,
                "rating_avg": float(r.rating_avg) if r.rating_avg else 0.0,
                "total_reviews": r.total_reviews,
                "booking_count": r.booking_count,
                "total_revenue": float(r.total_revenue),
            }
            for r in rows
        ],
    }


# =========================================================================
# MODULE 2: Admin Management (super_admin only)
# =========================================================================


@router.get("/admins")
async def list_admins(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """List all admin-level users."""
    admin_roles = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REGIONAL_ADMIN, UserRole.MODERATOR]
    query = select(User).where(User.is_deleted == False, User.role.in_(admin_roles))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    admins = result.scalars().all()

    return {"items": admins, "total": total, "skip": skip, "limit": limit}


@router.post("/admins")
async def create_admin(
    body: AdminCreateBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin user."""
    valid_roles = {"admin", "super_admin", "regional_admin", "moderator"}
    if body.role not in valid_roles:
        raise BadRequestError(f"Rol noto'g'ri: {body.role}")

    if body.role == "regional_admin" and not body.region:
        raise BadRequestError("Regional admin uchun region majburiy")

    # Check phone uniqueness
    existing = (await db.execute(
        select(User).where(User.phone == body.phone, User.is_deleted == False)
    )).scalar_one_or_none()
    if existing:
        raise BadRequestError("Bu telefon raqam allaqachon ro'yxatdan o'tgan")

    new_admin = User(
        phone=body.phone,
        full_name=body.full_name,
        role=UserRole(body.role),
        region=body.region if body.role == "regional_admin" else None,
        is_active=True,
        is_verified=True,
    )
    db.add(new_admin)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.CREATE, "user", new_admin.id,
        f"Admin yaratildi: {body.full_name} ({body.role})",
        new_value={"phone": body.phone, "role": body.role, "region": body.region},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Admin yaratildi", data={"id": str(new_admin.id)})


@router.patch("/admins/{admin_id}/role")
async def change_admin_role(
    admin_id: UUID,
    body: RoleChangeBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Change an admin's role."""
    target = (await db.execute(
        select(User).where(User.id == admin_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not target:
        raise NotFoundError("Admin")

    old_role = target.role.value if hasattr(target.role, "value") else target.role
    try:
        new_role = UserRole(body.role)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri rol: {body.role}")

    target.role = new_role
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "user", admin_id,
        f"Admin roli o'zgartirildi: {old_role} -> {body.role}",
        old_value={"role": old_role},
        new_value={"role": body.role},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Admin roli o'zgartirildi")


@router.patch("/admins/{admin_id}/block")
async def block_unblock_admin(
    admin_id: UUID,
    body: BlockBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Block or unblock an admin user."""
    if admin_id == current_user.id:
        raise BadRequestError("O'zingizni bloklash mumkin emas")

    target = (await db.execute(
        select(User).where(User.id == admin_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not target:
        raise NotFoundError("Admin")

    old_active = target.is_active
    target.is_active = body.is_active
    await db.flush()

    action = AuditAction.UNBLOCK if body.is_active else AuditAction.BLOCK
    await log_audit(
        db, current_user.id, action, "user", admin_id,
        f"Admin {'faollashtirildi' if body.is_active else 'bloklandi'}",
        old_value={"is_active": old_active},
        new_value={"is_active": body.is_active},
        ip_address=_get_ip(request),
    )

    status_text = "faollashtirildi" if body.is_active else "bloklandi"
    return SuccessResponse(message=f"Admin {status_text}")


@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: UUID,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an admin user."""
    if admin_id == current_user.id:
        raise BadRequestError("O'zingizni o'chirib bo'lmaydi")

    target = (await db.execute(
        select(User).where(User.id == admin_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not target:
        raise NotFoundError("Admin")

    target.is_deleted = True
    target.is_active = False
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.DELETE, "user", admin_id,
        f"Admin o'chirildi: {target.full_name}",
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Admin o'chirildi")


# =========================================================================
# MODULE 3: User Management
# =========================================================================


@router.get("/users")
async def list_users(
    search: str | None = Query(None),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """List all users (paginated, searchable, filterable by role)."""
    query = select(User).where(User.is_deleted == False)

    if search:
        query = query.where(
            or_(
                User.phone.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if role:
        try:
            query = query.where(User.role == UserRole(role))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri rol: {role}")
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()

    return {"items": users, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """User detail with vehicles, bookings count, cashback info."""
    user = (await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not user:
        raise NotFoundError("Foydalanuvchi")

    vehicles = (await db.execute(
        select(UserVehicle).where(UserVehicle.user_id == user_id, UserVehicle.is_deleted == False)
    )).scalars().all()

    bookings_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.customer_id == user_id, Booking.is_deleted == False,
        )
    )).scalar()

    cashback = (await db.execute(
        select(CashbackWallet).where(CashbackWallet.user_id == user_id)
    )).scalar_one_or_none()

    # Recent bookings with workshop names
    bookings_result = await db.execute(
        select(Booking).where(Booking.customer_id == user_id, Booking.is_deleted == False)
        .order_by(Booking.created_at.desc()).limit(10)
    )
    bookings = bookings_result.scalars().all()

    # Get workshop names for bookings
    ws_ids = list({b.workshop_id for b in bookings if b.workshop_id})
    ws_map: dict = {}
    if ws_ids:
        ws_r = await db.execute(select(Workshop.id, Workshop.name, Workshop.slug).where(Workshop.id.in_(ws_ids)))
        ws_map = {r.id: {"name": r.name, "slug": r.slug} for r in ws_r}

    # Reviews
    reviews_result = await db.execute(
        select(Review).where(Review.customer_id == user_id, Review.is_deleted == False)
        .order_by(Review.created_at.desc()).limit(10)
    )
    reviews = reviews_result.scalars().all()

    # Payments total
    total_paid = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(Booking.customer_id == user_id, Payment.status == PaymentStatus.SUCCESS, Payment.is_deleted == False)
    )).scalar()

    # Vehicle brands
    from app.models.vehicle import VehicleBrand, VehicleModel
    brand_ids = list({v.brand_id for v in vehicles if v.brand_id})
    model_ids = list({v.model_id for v in vehicles if v.model_id})
    brand_map: dict = {}
    model_map: dict = {}
    if brand_ids:
        br = await db.execute(select(VehicleBrand.id, VehicleBrand.name).where(VehicleBrand.id.in_(brand_ids)))
        brand_map = {r.id: r.name for r in br}
    if model_ids:
        mr = await db.execute(select(VehicleModel.id, VehicleModel.name).where(VehicleModel.id.in_(model_ids)))
        model_map = {r.id: r.name for r in mr}

    return {
        "user": {
            "id": str(user.id), "phone": user.phone, "email": user.email,
            "full_name": user.full_name, "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "is_active": user.is_active, "is_verified": user.is_verified,
            "avatar_url": user.avatar_url, "region": user.region,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "vehicles": [
            {"id": str(v.id), "brand": brand_map.get(v.brand_id, ""), "model": model_map.get(v.model_id, ""),
             "year": v.year, "plate": v.license_plate, "color": v.color, "mileage": v.mileage}
            for v in vehicles
        ],
        "stats": {
            "bookings_count": bookings_count,
            "total_paid": float(total_paid),
            "reviews_count": len(reviews),
            "cashback_balance": float(cashback.balance) if cashback else 0,
            "cashback_tier": cashback.tier.value if cashback else "bronze",
            "cashback_earned": float(cashback.total_earned) if cashback else 0,
        },
        "bookings": [
            {"id": str(b.id), "workshop_name": ws_map.get(b.workshop_id, {}).get("name", ""),
             "status": b.status.value if hasattr(b.status, 'value') else b.status,
             "total_price": float(b.total_price or 0), "notes": b.notes,
             "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None}
            for b in bookings
        ],
        "reviews": [
            {"id": str(r.id), "workshop_name": ws_map.get(r.workshop_id, {}).get("name", ""),
             "rating_overall": float(r.rating_overall or 0), "comment": r.comment,
             "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in reviews
        ],
    }


class UserCreateBody(BaseModel):
    phone: str
    full_name: str
    role: str  # customer or partner


@router.post("/users")
async def admin_create_user(
    body: UserCreateBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a new customer or partner user."""
    if body.role not in ("customer", "partner"):
        raise BadRequestError("Faqat 'customer' yoki 'partner' roli qo'shish mumkin")

    existing = (await db.execute(select(User).where(User.phone == body.phone, User.is_deleted == False))).scalar_one_or_none()
    if existing:
        raise BadRequestError(f"Bu telefon raqam allaqachon mavjud: {body.phone}")

    import uuid as _uuid
    user = User(
        id=_uuid.uuid4(), phone=body.phone, full_name=body.full_name,
        role=UserRole(body.role), is_active=True, is_verified=True,
    )
    db.add(user)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.CREATE, "user", str(user.id),
        f"Foydalanuvchi yaratildi: {body.full_name} ({body.role})",
        ip_address=_get_ip(request),
    )
    return {"message": "Foydalanuvchi yaratildi", "id": str(user.id)}


@router.patch("/users/{user_id}/block", response_model=SuccessResponse)
async def block_unblock_user(
    user_id: UUID,
    body: BlockBody,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Block or unblock a user."""
    user = (await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not user:
        raise NotFoundError("Foydalanuvchi")

    old_active = user.is_active
    user.is_active = body.is_active
    await db.flush()

    action = AuditAction.UNBLOCK if body.is_active else AuditAction.BLOCK
    await log_audit(
        db, current_user.id, action, "user", user_id,
        f"Foydalanuvchi {'faollashtirildi' if body.is_active else 'bloklandi'}: {user.phone}",
        old_value={"is_active": old_active},
        new_value={"is_active": body.is_active},
        ip_address=_get_ip(request),
    )

    status_text = "faollashtirildi" if body.is_active else "bloklandi"
    return SuccessResponse(message=f"Foydalanuvchi {status_text}")


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: UUID,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a user (super_admin only)."""
    user = (await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not user:
        raise NotFoundError("Foydalanuvchi")

    user.is_deleted = True
    user.is_active = False
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.DELETE, "user", user_id,
        f"Foydalanuvchi o'chirildi: {user.phone}",
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Foydalanuvchi o'chirildi")


# =========================================================================
# MODULE 4: Workshop Management
# =========================================================================


@router.get("/workshops")
async def list_workshops(
    search: str | None = Query(None),
    city: str | None = Query(None),
    is_verified: bool | None = Query(None),
    is_active: bool | None = Query(None),
    subscription_tier: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All workshops, filterable by city, status, verified."""
    query = select(Workshop).where(Workshop.is_deleted == False)
    query = _apply_region_filter(query, current_user)

    if search:
        query = query.where(
            or_(
                Workshop.name.ilike(f"%{search}%"),
                Workshop.phone.ilike(f"%{search}%"),
                Workshop.address.ilike(f"%{search}%"),
            )
        )
    if city:
        city_list = [c.strip() for c in city.split(",") if c.strip()]
        if len(city_list) == 1:
            query = query.where(Workshop.city.ilike(f"%{city_list[0]}%"))
        elif len(city_list) > 1:
            query = query.where(or_(*[Workshop.city.ilike(f"%{c}%") for c in city_list]))
    if is_verified is not None:
        query = query.where(Workshop.is_verified == is_verified)
    if is_active is not None:
        query = query.where(Workshop.is_active == is_active)
    if subscription_tier:
        try:
            query = query.where(Workshop.subscription_tier == SubscriptionTier(subscription_tier))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri tier: {subscription_tier}")

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(Workshop.created_at.desc()).offset(skip).limit(limit)
    )
    workshops = result.scalars().all()

    # Fetch main photo for each workshop
    ws_ids = [w.id for w in workshops]
    photo_map: dict = {}
    if ws_ids:
        photo_result = await db.execute(
            select(WorkshopPhoto.workshop_id, WorkshopPhoto.url)
            .where(WorkshopPhoto.workshop_id.in_(ws_ids), WorkshopPhoto.is_deleted == False)
            .order_by(WorkshopPhoto.order)
        )
        for row in photo_result:
            if row.workshop_id not in photo_map:
                photo_map[row.workshop_id] = row.url

    # Fetch partner names
    partner_ids = list({w.partner_id for w in workshops if w.partner_id})
    partner_map: dict = {}
    if partner_ids:
        pr = await db.execute(select(User.id, User.full_name).where(User.id.in_(partner_ids)))
        partner_map = {r.id: r.full_name for r in pr}

    items = []
    for w in workshops:
        items.append({
            "id": str(w.id), "name": w.name, "slug": w.slug,
            "description": w.description, "address": w.address,
            "city": w.city, "district": w.district, "phone": w.phone,
            "latitude": w.latitude, "longitude": w.longitude,
            "is_verified": w.is_verified, "is_active": w.is_active,
            "subscription_tier": w.subscription_tier.value if hasattr(w.subscription_tier, 'value') else w.subscription_tier,
            "rating_avg": float(w.rating_avg or 0), "total_reviews": w.total_reviews or 0,
            "photo_url": photo_map.get(w.id),
            "partner_name": partner_map.get(w.partner_id, ""),
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/workshops/{workshop_id}")
async def get_workshop_detail(
    workshop_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Full workshop detail with stats."""
    workshop = (await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )).scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    bookings_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id == workshop_id, Booking.is_deleted == False,
        )
    )).scalar()

    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Booking, Booking.id == Payment.booking_id)
        .where(
            Booking.workshop_id == workshop_id,
            Payment.status == PaymentStatus.SUCCESS,
            Payment.is_deleted == False,
        )
    )).scalar()

    reviews_count = (await db.execute(
        select(func.count()).select_from(Review).where(
            Review.workshop_id == workshop_id, Review.is_deleted == False,
        )
    )).scalar()

    return {
        "workshop": workshop,
        "stats": {
            "bookings_count": bookings_count,
            "total_revenue": float(total_revenue),
            "reviews_count": reviews_count,
        },
    }


@router.patch("/workshops/{workshop_id}/verify", response_model=SuccessResponse)
async def verify_workshop(
    workshop_id: UUID,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Verify a workshop."""
    workshop = (await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )).scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    old_verified = workshop.is_verified
    workshop.is_verified = True
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.VERIFY, "workshop", workshop_id,
        f"Ustaxona tasdiqlandi: {workshop.name}",
        old_value={"is_verified": old_verified},
        new_value={"is_verified": True},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Ustaxona tasdiqlandi")


@router.patch("/workshops/{workshop_id}/block", response_model=SuccessResponse)
async def block_unblock_workshop(
    workshop_id: UUID,
    body: BlockBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Block or unblock a workshop."""
    workshop = (await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )).scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    old_active = workshop.is_active
    workshop.is_active = body.is_active
    await db.flush()

    action = AuditAction.UNBLOCK if body.is_active else AuditAction.BLOCK
    await log_audit(
        db, current_user.id, action, "workshop", workshop_id,
        f"Ustaxona {'faollashtirildi' if body.is_active else 'bloklandi'}: {workshop.name}",
        old_value={"is_active": old_active},
        new_value={"is_active": body.is_active},
        ip_address=_get_ip(request),
    )

    status_text = "faollashtirildi" if body.is_active else "bloklandi"
    return SuccessResponse(message=f"Ustaxona {status_text}")


@router.patch("/workshops/{workshop_id}/subscription", response_model=SuccessResponse)
async def change_workshop_subscription(
    workshop_id: UUID,
    body: SubscriptionBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Change workshop subscription tier."""
    workshop = (await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )).scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")

    try:
        new_tier = SubscriptionTier(body.tier)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri tier: {body.tier}")

    old_tier = workshop.subscription_tier.value if hasattr(workshop.subscription_tier, "value") else workshop.subscription_tier
    workshop.subscription_tier = new_tier
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "workshop", workshop_id,
        f"Ustaxona obunasi o'zgartirildi: {old_tier} -> {body.tier}",
        old_value={"subscription_tier": old_tier},
        new_value={"subscription_tier": body.tier},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Ustaxona obunasi o'zgartirildi")


# =========================================================================
# MODULE 5: Booking Management
# =========================================================================


@router.get("/bookings")
async def list_bookings(
    status: str | None = Query(None),
    workshop_id: UUID | None = Query(None),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All bookings, filterable by status, date, workshop."""
    query = select(Booking).where(Booking.is_deleted == False)

    # Regional admin filter
    role_val = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    if role_val == "regional_admin" and current_user.region:
        query = query.join(Workshop, Workshop.id == Booking.workshop_id).where(
            Workshop.city == current_user.region
        )

    if status:
        try:
            query = query.where(Booking.status == BookingStatus(status))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri status: {status}")
    if workshop_id:
        query = query.where(Booking.workshop_id == workshop_id)
    if date_from:
        query = query.where(cast(Booking.scheduled_at, Date) >= date_from)
    if date_to:
        query = query.where(cast(Booking.scheduled_at, Date) <= date_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
    )
    bookings = result.scalars().all()

    return {"items": bookings, "total": total, "skip": skip, "limit": limit}


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Booking detail with full history."""
    booking = (await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )).scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    history = (await db.execute(
        select(BookingStatusHistory)
        .where(BookingStatusHistory.booking_id == booking_id)
        .order_by(BookingStatusHistory.timestamp.asc())
    )).scalars().all()

    return {"booking": booking, "status_history": history}


@router.patch("/bookings/{booking_id}/cancel", response_model=SuccessResponse)
async def admin_cancel_booking(
    booking_id: UUID,
    request: Request,
    note: str | None = Query(None),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin cancel a booking."""
    booking = (await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )).scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if booking.status == BookingStatus.CANCELLED:
        raise BadRequestError("Buyurtma allaqachon bekor qilingan")

    old_status = booking.status.value if hasattr(booking.status, "value") else booking.status
    booking.status = BookingStatus.CANCELLED
    await db.flush()

    # Add status history
    history = BookingStatusHistory(
        booking_id=booking_id,
        old_status=old_status,
        new_status=BookingStatus.CANCELLED.value,
        changed_by=current_user.id,
        note=note or "Admin tomonidan bekor qilindi",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "booking", booking_id,
        f"Buyurtma bekor qilindi (eski status: {old_status})",
        old_value={"status": old_status},
        new_value={"status": "cancelled"},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Buyurtma bekor qilindi")


@router.patch("/bookings/{booking_id}/status", response_model=SuccessResponse)
async def admin_change_booking_status(
    booking_id: UUID,
    body: StatusChangeBody,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin change booking status."""
    booking = (await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )).scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    try:
        new_status = BookingStatus(body.status)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri status: {body.status}")

    old_status = booking.status.value if hasattr(booking.status, "value") else booking.status
    booking.status = new_status
    await db.flush()

    history = BookingStatusHistory(
        booking_id=booking_id,
        old_status=old_status,
        new_status=new_status.value,
        changed_by=current_user.id,
        note=body.note or "Admin tomonidan o'zgartirildi",
        timestamp=datetime.now(timezone.utc),
    )
    db.add(history)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "booking", booking_id,
        f"Buyurtma statusi o'zgartirildi: {old_status} -> {new_status.value}",
        old_value={"status": old_status},
        new_value={"status": new_status.value},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message=f"Buyurtma statusi '{new_status.value}' ga o'zgartirildi")


# =========================================================================
# MODULE 6: Payment Management
# =========================================================================


@router.get("/payments")
async def list_payments(
    status: str | None = Query(None),
    method: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All payments, filterable by status and method."""
    query = select(Payment).where(Payment.is_deleted == False)

    if status:
        try:
            query = query.where(Payment.status == PaymentStatus(status))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri status: {status}")
    if method:
        try:
            query = query.where(Payment.method == PaymentMethod(method))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri metod: {method}")

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
    )
    payments = result.scalars().all()

    # Enrich with customer/workshop names via booking
    booking_ids = [p.booking_id for p in payments if p.booking_id]
    cust_ws_map: dict = {}
    if booking_ids:
        bk_rows = await db.execute(
            select(Booking.id, Booking.customer_id, Booking.workshop_id)
            .where(Booking.id.in_(booking_ids))
        )
        bk_data = {r.id: (r.customer_id, r.workshop_id) for r in bk_rows}

        cust_ids = list({cid for cid, _ in bk_data.values() if cid})
        ws_ids_p = list({wid for _, wid in bk_data.values() if wid})

        cust_map_p: dict = {}
        ws_map_p: dict = {}
        if cust_ids:
            cr = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(cust_ids)))
            cust_map_p = {r.id: {"name": r.full_name, "phone": r.phone} for r in cr}
        if ws_ids_p:
            wr = await db.execute(select(Workshop.id, Workshop.name).where(Workshop.id.in_(ws_ids_p)))
            ws_map_p = {r.id: r.name for r in wr}

        for bid, (cid, wid) in bk_data.items():
            cust_ws_map[bid] = {
                "customer_name": cust_map_p.get(cid, {}).get("name", ""),
                "customer_phone": cust_map_p.get(cid, {}).get("phone", ""),
                "workshop_name": ws_map_p.get(wid, ""),
            }

    items = []
    for p in payments:
        extra = cust_ws_map.get(p.booking_id, {})
        items.append({
            "id": str(p.id),
            "booking_id": str(p.booking_id) if p.booking_id else None,
            "amount": float(p.amount or 0),
            "method": p.method.value if hasattr(p.method, 'value') else p.method,
            "status": p.status.value if hasattr(p.status, 'value') else p.status,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "customer_name": extra.get("customer_name", ""),
            "workshop_name": extra.get("workshop_name", ""),
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/payments/{payment_id}")
async def get_payment_detail(
    payment_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Full payment detail with booking, customer, workshop info."""
    payment = (await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.is_deleted == False)
    )).scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")

    # Booking info
    booking = (await db.execute(select(Booking).where(Booking.id == payment.booking_id))).scalar_one_or_none()
    customer_info = {}
    workshop_info = {}
    if booking:
        cust = (await db.execute(select(User.full_name, User.phone).where(User.id == booking.customer_id))).one_or_none()
        if cust:
            customer_info = {"name": cust.full_name, "phone": cust.phone}
        ws = (await db.execute(select(Workshop.name, Workshop.city, Workshop.phone, Workshop.address).where(Workshop.id == booking.workshop_id))).one_or_none()
        if ws:
            workshop_info = {"name": ws.name, "city": ws.city, "phone": ws.phone, "address": ws.address}

    return {
        "id": str(payment.id),
        "booking_id": str(payment.booking_id) if payment.booking_id else None,
        "amount": float(payment.amount or 0),
        "method": payment.method.value if hasattr(payment.method, 'value') else payment.method,
        "status": payment.status.value if hasattr(payment.status, 'value') else payment.status,
        "gateway_txn_id": payment.gateway_txn_id,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "customer": customer_info,
        "workshop": workshop_info,
        "booking": {
            "id": str(booking.id) if booking else None,
            "status": booking.status.value if booking and hasattr(booking.status, 'value') else (booking.status if booking else None),
            "total_price": float(booking.total_price or 0) if booking else 0,
            "scheduled_at": booking.scheduled_at.isoformat() if booking and booking.scheduled_at else None,
            "notes": booking.notes if booking else None,
            "is_mobile": booking.is_mobile if booking else False,
        } if booking else None,
    }


@router.post("/payments/{payment_id}/refund", response_model=SuccessResponse)
async def refund_payment(
    payment_id: UUID,
    body: RefundBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Process refund (super_admin only)."""
    payment = (await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.is_deleted == False)
    )).scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")

    if payment.status != PaymentStatus.SUCCESS:
        raise BadRequestError("Faqat muvaffaqiyatli to'lovlarni qaytarish mumkin")

    old_status = payment.status.value if hasattr(payment.status, "value") else payment.status
    payment.status = PaymentStatus.REFUNDED
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.REFUND, "payment", payment_id,
        f"To'lov qaytarildi: {float(payment.amount)} so'm. Sabab: {body.reason or 'ko\'rsatilmagan'}",
        old_value={"status": old_status},
        new_value={"status": "refunded"},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="To'lov qaytarildi")


# =========================================================================
# MODULE 7: Review Moderation
# =========================================================================


@router.get("/reviews")
async def list_reviews(
    workshop_id: UUID | None = Query(None),
    rating_max: float | None = Query(None, description="Filter reviews with rating <= this"),
    is_visible: bool | None = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|rating_overall)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All reviews, filterable, sortable."""
    query = select(Review).where(Review.is_deleted == False)

    if workshop_id:
        query = query.where(Review.workshop_id == workshop_id)
    if rating_max is not None:
        query = query.where(Review.rating_overall <= rating_max)
    if is_visible is not None:
        query = query.where(Review.is_visible == is_visible)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    order_col = Review.created_at if sort_by == "created_at" else Review.rating_overall
    order_dir = order_col.desc() if sort_order == "desc" else order_col.asc()

    result = await db.execute(query.order_by(order_dir).offset(skip).limit(limit))
    reviews = result.scalars().all()

    # Enrich with customer and workshop names
    cust_ids = list({r.customer_id for r in reviews if r.customer_id})
    ws_ids = list({r.workshop_id for r in reviews if r.workshop_id})
    cust_map: dict = {}
    ws_map: dict = {}
    if cust_ids:
        cr = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(cust_ids)))
        cust_map = {r.id: {"name": r.full_name, "phone": r.phone} for r in cr}
    if ws_ids:
        wr = await db.execute(select(Workshop.id, Workshop.name, Workshop.city).where(Workshop.id.in_(ws_ids)))
        ws_map = {r.id: {"name": r.name, "city": r.city} for r in wr}

    items = []
    for r in reviews:
        cu = cust_map.get(r.customer_id, {})
        ws = ws_map.get(r.workshop_id, {})
        items.append({
            "id": str(r.id),
            "customer_name": cu.get("name", "Mijoz"),
            "customer_phone": cu.get("phone", ""),
            "workshop_name": ws.get("name", "Ustaxona"),
            "workshop_city": ws.get("city", ""),
            "rating_quality": r.rating_quality,
            "rating_price": r.rating_price,
            "rating_time": r.rating_time,
            "rating_communication": r.rating_communication,
            "rating_overall": float(r.rating_overall or 0),
            "comment": r.comment,
            "reply": r.reply,
            "is_visible": r.is_visible,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/reviews/flagged")
async def list_flagged_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Reviews that might be fake: short text with extreme ratings, or suspicious patterns."""
    query = select(Review).where(
        Review.is_deleted == False,
        Review.is_visible == True,
        or_(
            # Very short comments with extreme ratings
            and_(
                func.length(Review.comment) < 10,
                or_(Review.rating_overall <= 1.0, Review.rating_overall >= 5.0),
            ),
            # All sub-ratings identical (potential bot)
            and_(
                Review.rating_quality == Review.rating_price,
                Review.rating_price == Review.rating_time,
                Review.rating_time == Review.rating_communication,
                or_(Review.rating_quality == 1, Review.rating_quality == 5),
            ),
        ),
    )

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(Review.created_at.desc()).offset(skip).limit(limit)
    )
    reviews = result.scalars().all()

    return {"items": reviews, "total": total, "skip": skip, "limit": limit}


@router.delete("/reviews/{review_id}", response_model=SuccessResponse)
async def delete_review(
    review_id: UUID,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete/hide a review and update workshop rating."""
    review = (await db.execute(
        select(Review).where(Review.id == review_id, Review.is_deleted == False)
    )).scalar_one_or_none()
    if not review:
        raise NotFoundError("Sharh")

    review.is_visible = False
    review.is_deleted = True
    await db.flush()

    # Recalculate workshop rating
    workshop = (await db.execute(
        select(Workshop).where(Workshop.id == review.workshop_id)
    )).scalar_one_or_none()

    if workshop:
        stats = (await db.execute(
            select(
                func.coalesce(func.avg(Review.rating_overall), 0).label("avg_rating"),
                func.count().label("count"),
            ).where(
                Review.workshop_id == workshop.id,
                Review.is_deleted == False,
                Review.is_visible == True,
            )
        )).one()

        workshop.rating_avg = float(stats.avg_rating)
        workshop.total_reviews = stats.count
        await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.REVIEW_DELETE, "review", review_id,
        f"Sharh o'chirildi (workshop: {review.workshop_id}, rating: {review.rating_overall})",
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Sharh o'chirildi")


@router.post("/reviews/{review_id}/reply", response_model=SuccessResponse)
async def admin_reply_to_review(
    review_id: UUID,
    body: ReplyBody,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin reply to a review."""
    review = (await db.execute(
        select(Review).where(Review.id == review_id, Review.is_deleted == False)
    )).scalar_one_or_none()
    if not review:
        raise NotFoundError("Sharh")

    review.reply = body.reply
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "review", review_id,
        f"Sharhga javob yozildi",
        new_value={"reply": body.reply},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Javob qo'shildi")


# =========================================================================
# MODULE 8: Warranty Claims
# =========================================================================


@router.get("/warranty-claims")
async def list_warranty_claims(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All warranty claims, filterable by status."""
    query = select(WarrantyClaim).where(WarrantyClaim.is_deleted == False)
    if status:
        try:
            query = query.where(WarrantyClaim.status == WarrantyClaimStatus(status))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri status: {status}")

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(WarrantyClaim.created_at.desc()).offset(skip).limit(limit)
    )
    claims = result.scalars().all()

    return {"items": claims, "total": total, "skip": skip, "limit": limit}


@router.get("/warranty-claims/{claim_id}")
async def get_warranty_claim_detail(
    claim_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Warranty claim detail."""
    claim = (await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.id == claim_id, WarrantyClaim.is_deleted == False)
    )).scalar_one_or_none()
    if not claim:
        raise NotFoundError("Kafolat da'vosi")

    warranty = (await db.execute(
        select(Warranty).where(Warranty.id == claim.warranty_id)
    )).scalar_one_or_none()

    return {"claim": claim, "warranty": warranty}


@router.patch("/warranty-claims/{claim_id}/approve", response_model=SuccessResponse)
async def approve_warranty_claim(
    claim_id: UUID,
    body: ClaimActionBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Approve a warranty claim."""
    claim = (await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.id == claim_id, WarrantyClaim.is_deleted == False)
    )).scalar_one_or_none()
    if not claim:
        raise NotFoundError("Kafolat da'vosi")

    old_status = claim.status.value if hasattr(claim.status, "value") else claim.status
    claim.status = WarrantyClaimStatus.APPROVED
    if body.admin_notes:
        claim.admin_notes = body.admin_notes
    claim.resolved_at = datetime.now(timezone.utc)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.APPROVE, "warranty_claim", claim_id,
        f"Kafolat da'vosi tasdiqlandi",
        old_value={"status": old_status},
        new_value={"status": "approved"},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Kafolat da'vosi tasdiqlandi")


@router.patch("/warranty-claims/{claim_id}/reject", response_model=SuccessResponse)
async def reject_warranty_claim(
    claim_id: UUID,
    body: ClaimActionBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Reject a warranty claim with reason."""
    claim = (await db.execute(
        select(WarrantyClaim).where(WarrantyClaim.id == claim_id, WarrantyClaim.is_deleted == False)
    )).scalar_one_or_none()
    if not claim:
        raise NotFoundError("Kafolat da'vosi")

    if not body.admin_notes:
        raise BadRequestError("Rad etish uchun sabab ko'rsatish majburiy")

    old_status = claim.status.value if hasattr(claim.status, "value") else claim.status
    claim.status = WarrantyClaimStatus.REJECTED
    claim.admin_notes = body.admin_notes
    claim.resolved_at = datetime.now(timezone.utc)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.REJECT, "warranty_claim", claim_id,
        f"Kafolat da'vosi rad etildi: {body.admin_notes}",
        old_value={"status": old_status},
        new_value={"status": "rejected"},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Kafolat da'vosi rad etildi")


# =========================================================================
# MODULE 9: Complaints (Shikoyatlar)
# =========================================================================


@router.get("/complaints")
async def list_complaints(
    status: str | None = Query(None),
    type: str | None = Query(None),
    priority: int | None = Query(None, ge=1, le=4),
    assigned_to: UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """All complaints, filterable by status, type, priority."""
    query = select(Complaint).where(Complaint.is_deleted == False)

    if status:
        try:
            query = query.where(Complaint.status == ComplaintStatus(status))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri status: {status}")
    if type:
        try:
            query = query.where(Complaint.type == ComplaintType(type))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri tur: {type}")
    if priority is not None:
        query = query.where(Complaint.priority == priority)
    if assigned_to:
        query = query.where(Complaint.assigned_to == assigned_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(Complaint.priority.desc(), Complaint.created_at.desc()).offset(skip).limit(limit)
    )
    complaints = result.scalars().all()

    return {"items": complaints, "total": total, "skip": skip, "limit": limit}


@router.get("/complaints/{complaint_id}")
async def get_complaint_detail(
    complaint_id: UUID,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Complaint detail."""
    complaint = (await db.execute(
        select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False)
    )).scalar_one_or_none()
    if not complaint:
        raise NotFoundError("Shikoyat")

    return {"complaint": complaint}


@router.post("/complaints")
async def create_complaint(
    body: ComplaintCreateBody,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Create a complaint from admin side."""
    # Validate complainant exists
    complainant = (await db.execute(
        select(User).where(User.id == body.complainant_id, User.is_deleted == False)
    )).scalar_one_or_none()
    if not complainant:
        raise NotFoundError("Shikoyatchi foydalanuvchi")

    try:
        complaint_type = ComplaintType(body.type)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri shikoyat turi: {body.type}")

    complaint = Complaint(
        complainant_id=body.complainant_id,
        against_id=body.against_id,
        workshop_id=body.workshop_id,
        booking_id=body.booking_id,
        type=complaint_type,
        status=ComplaintStatus.OPEN,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
        assigned_to=current_user.id,
    )
    db.add(complaint)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.CREATE, "complaint", complaint.id,
        f"Shikoyat yaratildi: {body.subject}",
        new_value={"type": body.type, "subject": body.subject, "priority": body.priority},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Shikoyat yaratildi", data={"id": str(complaint.id)})


@router.patch("/complaints/{complaint_id}/assign", response_model=SuccessResponse)
async def assign_complaint(
    complaint_id: UUID,
    body: ComplaintAssignBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Assign complaint to a moderator/admin."""
    complaint = (await db.execute(
        select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False)
    )).scalar_one_or_none()
    if not complaint:
        raise NotFoundError("Shikoyat")

    # Validate assignee exists and is admin-level
    assignee = (await db.execute(
        select(User).where(User.id == body.assigned_to, User.is_deleted == False)
    )).scalar_one_or_none()
    if not assignee:
        raise NotFoundError("Tayinlanuvchi foydalanuvchi")

    assignee_role = assignee.role.value if hasattr(assignee.role, "value") else assignee.role
    if assignee_role not in ADMIN_ROLES:
        raise BadRequestError("Faqat admin darajadagi foydalanuvchiga tayinlash mumkin")

    old_assigned = str(complaint.assigned_to) if complaint.assigned_to else None
    complaint.assigned_to = body.assigned_to
    if complaint.status == ComplaintStatus.OPEN:
        complaint.status = ComplaintStatus.IN_PROGRESS
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "complaint", complaint_id,
        f"Shikoyat tayinlandi: {assignee.full_name}",
        old_value={"assigned_to": old_assigned},
        new_value={"assigned_to": str(body.assigned_to)},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Shikoyat tayinlandi")


@router.patch("/complaints/{complaint_id}/resolve", response_model=SuccessResponse)
async def resolve_complaint(
    complaint_id: UUID,
    body: ComplaintResolveBody,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Resolve complaint with resolution text."""
    complaint = (await db.execute(
        select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False)
    )).scalar_one_or_none()
    if not complaint:
        raise NotFoundError("Shikoyat")

    if complaint.status in (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED):
        raise BadRequestError("Shikoyat allaqachon hal qilingan yoki yopilgan")

    old_status = complaint.status.value if hasattr(complaint.status, "value") else complaint.status
    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolution = body.resolution
    complaint.resolved_at = datetime.now(timezone.utc)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.COMPLAINT_RESOLVE, "complaint", complaint_id,
        f"Shikoyat hal qilindi: {body.resolution[:100]}",
        old_value={"status": old_status},
        new_value={"status": "resolved", "resolution": body.resolution},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Shikoyat hal qilindi")


@router.patch("/complaints/{complaint_id}/escalate", response_model=SuccessResponse)
async def escalate_complaint(
    complaint_id: UUID,
    request: Request,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Escalate complaint to super_admin."""
    complaint = (await db.execute(
        select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False)
    )).scalar_one_or_none()
    if not complaint:
        raise NotFoundError("Shikoyat")

    old_status = complaint.status.value if hasattr(complaint.status, "value") else complaint.status
    complaint.status = ComplaintStatus.ESCALATED
    complaint.priority = min(complaint.priority + 1, 4)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "complaint", complaint_id,
        f"Shikoyat yuqori darajaga ko'tarildi (escalated)",
        old_value={"status": old_status, "priority": complaint.priority - 1},
        new_value={"status": "escalated", "priority": complaint.priority},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Shikoyat yuqori darajaga ko'tarildi")


@router.patch("/complaints/{complaint_id}/close", response_model=SuccessResponse)
async def close_complaint(
    complaint_id: UUID,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Close a complaint."""
    complaint = (await db.execute(
        select(Complaint).where(Complaint.id == complaint_id, Complaint.is_deleted == False)
    )).scalar_one_or_none()
    if not complaint:
        raise NotFoundError("Shikoyat")

    if complaint.status == ComplaintStatus.CLOSED:
        raise BadRequestError("Shikoyat allaqachon yopilgan")

    old_status = complaint.status.value if hasattr(complaint.status, "value") else complaint.status
    complaint.status = ComplaintStatus.CLOSED
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.UPDATE, "complaint", complaint_id,
        f"Shikoyat yopildi",
        old_value={"status": old_status},
        new_value={"status": "closed"},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Shikoyat yopildi")


# =========================================================================
# MODULE 10: Platform Settings (super_admin only)
# =========================================================================


@router.get("/settings")
async def list_settings(
    category: str | None = Query(None),
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """All platform settings grouped by category."""
    query = select(PlatformSettings).where(PlatformSettings.is_deleted == False)
    if category:
        query = query.where(PlatformSettings.category == category)

    result = await db.execute(query.order_by(PlatformSettings.category, PlatformSettings.key))
    settings = result.scalars().all()

    # Group by category
    grouped: dict[str, list] = {}
    for s in settings:
        cat = s.category or "general"
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            "key": s.key,
            "value": s.value,
            "description": s.description,
            "category": s.category,
            "updated_at": str(s.updated_at) if s.updated_at else None,
        })

    return {"settings": grouped}


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    body: SettingBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Update a platform setting value."""
    setting = (await db.execute(
        select(PlatformSettings).where(PlatformSettings.key == key, PlatformSettings.is_deleted == False)
    )).scalar_one_or_none()
    if not setting:
        raise NotFoundError("Sozlama")

    old_value = setting.value
    setting.value = body.value
    if body.description is not None:
        setting.description = body.description
    setting.updated_by = current_user.id
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.SETTINGS_CHANGE, "platform_settings", key,
        f"Sozlama o'zgartirildi: {key}",
        old_value={"value": old_value},
        new_value={"value": body.value},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Sozlama yangilandi")


@router.post("/settings")
async def create_setting(
    body: SettingBody,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Create a new platform setting."""
    if not body.key:
        raise BadRequestError("Kalit (key) majburiy")

    existing = (await db.execute(
        select(PlatformSettings).where(PlatformSettings.key == body.key)
    )).scalar_one_or_none()
    if existing:
        raise BadRequestError(f"'{body.key}' kaliti allaqachon mavjud")

    setting = PlatformSettings(
        key=body.key,
        value=body.value,
        description=body.description,
        category=body.category,
        updated_by=current_user.id,
    )
    db.add(setting)
    await db.flush()

    await log_audit(
        db, current_user.id, AuditAction.SETTINGS_CHANGE, "platform_settings", body.key,
        f"Yangi sozlama yaratildi: {body.key}",
        new_value={"key": body.key, "value": body.value, "category": body.category},
        ip_address=_get_ip(request),
    )

    return SuccessResponse(message="Sozlama yaratildi", data={"key": body.key})


# =========================================================================
# MODULE 11: Audit Logs (super_admin only)
# =========================================================================


@router.get("/audit-logs")
async def list_audit_logs(
    admin_id: UUID | None = Query(None),
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Paginated audit logs, filterable by admin, action, resource_type, date range."""
    query = select(AuditLog)

    if admin_id:
        query = query.where(AuditLog.admin_id == admin_id)
    if action:
        try:
            query = query.where(AuditLog.action == AuditAction(action))
        except ValueError:
            raise BadRequestError(f"Noto'g'ri action: {action}")
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if date_from:
        query = query.where(cast(AuditLog.created_at, Date) >= date_from)
    if date_to:
        query = query.where(cast(AuditLog.created_at, Date) <= date_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()

    return {"items": logs, "total": total, "skip": skip, "limit": limit}


# =====================================================================
# ADMIN WORKSHOP MANAGEMENT (create, edit, delete, photos)
# =====================================================================

REGIONS_DATA = {
    "Xorazm viloyati": {
        "cities": ["Urganch", "Xiva", "Shovot", "Bog'ot", "Gurlan", "Xonqa", "Hazorasp", "Yangiariq", "Qo'shko'pir", "Yangibozor", "Tuproqqal'a"],
    },
    "Toshkent shahri": {
        "cities": ["Toshkent"],
        "districts": ["Chilonzor", "Yakkasaroy", "Mirzo Ulug'bek", "Sergeli", "Shayxontohur", "Olmazor", "Bektemir", "Mirobod", "Yashnobod", "Uchtepa", "Yunusobod"],
    },
    "Toshkent viloyati": {
        "cities": ["Chirchiq", "Olmaliq", "Angren", "Bekobod", "Nurafshon", "Yangiyo'l"],
    },
    "Samarqand viloyati": {
        "cities": ["Samarqand", "Kattaqo'rg'on", "Urgut", "Bulung'ur"],
    },
    "Buxoro viloyati": {
        "cities": ["Buxoro", "Kogon", "G'ijduvon", "Qorako'l"],
    },
    "Farg'ona viloyati": {
        "cities": ["Farg'ona", "Marg'ilon", "Qo'qon", "Quvasoy", "Rishton"],
    },
    "Andijon viloyati": {
        "cities": ["Andijon", "Asaka", "Xonobod", "Shahrixon"],
    },
    "Namangan viloyati": {
        "cities": ["Namangan", "Chortoq", "Pop", "Chust"],
    },
    "Qashqadaryo viloyati": {
        "cities": ["Qarshi", "Shahrisabz", "Kitob", "Muborak"],
    },
    "Surxondaryo viloyati": {
        "cities": ["Termiz", "Denov", "Sherobod", "Boysun"],
    },
    "Navoiy viloyati": {
        "cities": ["Navoiy", "Zarafshon", "Uchquduq", "Konimex"],
    },
    "Jizzax viloyati": {
        "cities": ["Jizzax", "Do'stlik", "G'allaorol"],
    },
    "Sirdaryo viloyati": {
        "cities": ["Guliston", "Sirdaryo", "Yangiyer", "Boyovut"],
    },
    "Qoraqalpog'iston Respublikasi": {
        "cities": ["Nukus", "Qo'ng'irot", "Mo'ynoq", "Beruniy", "Xo'jayli"],
    },
}


@router.get("/regions")
async def get_regions():
    """Get regions, cities, districts for dropdowns."""
    return REGIONS_DATA


class WorkshopCreateBody(BaseModel):
    name: str
    description: str = ""
    address: str = ""
    city: str = ""
    district: str = ""
    phone: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    partner_phone: str = ""  # existing partner phone or empty for admin-owned


class WorkshopEditBody(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@router.post("/workshops")
async def admin_create_workshop(
    body: WorkshopCreateBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a new workshop."""
    import uuid as _uuid
    # Find or use admin as partner
    partner = current_user
    if body.partner_phone:
        r = await db.execute(select(User).where(User.phone == body.partner_phone, User.is_deleted == False))
        found = r.scalar_one_or_none()
        if found:
            partner = found

    slug = body.name.lower().replace(" ", "-").replace("'", "")[:50] + "-" + _uuid.uuid4().hex[:6]
    ws = Workshop(
        id=_uuid.uuid4(), partner_id=partner.id, name=body.name, slug=slug,
        description=body.description, address=body.address, city=body.city,
        district=body.district, phone=body.phone, latitude=body.latitude,
        longitude=body.longitude, is_active=True, is_verified=True,
        working_hours={"mon": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00", "thu": "09:00-18:00", "fri": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq"},
    )
    db.add(ws)
    await db.flush()
    await log_audit(db, current_user.id, AuditAction.CREATE, "workshop", str(ws.id), f"Ustaxona yaratildi: {body.name}")
    return {"message": "Ustaxona yaratildi", "id": str(ws.id), "slug": slug}


@router.patch("/workshops/{workshop_id}/edit")
async def admin_edit_workshop(
    workshop_id: str,
    body: WorkshopEditBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin edits workshop info."""
    ws = (await db.execute(select(Workshop).where(Workshop.id == workshop_id))).scalar_one_or_none()
    if not ws:
        raise NotFoundError("Ustaxona")
    for field in ["name", "description", "address", "city", "district", "phone", "latitude", "longitude"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(ws, field, val)
    await db.flush()
    await log_audit(db, current_user.id, AuditAction.UPDATE, "workshop", workshop_id, f"Ustaxona yangilandi: {ws.name}")
    return {"message": "Yangilandi"}


@router.delete("/workshops/{workshop_id}")
async def admin_delete_workshop(
    workshop_id: str,
    request: Request,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin soft-deletes a workshop."""
    ws = (await db.execute(select(Workshop).where(Workshop.id == workshop_id))).scalar_one_or_none()
    if not ws:
        raise NotFoundError("Ustaxona")
    ws.is_deleted = True
    await db.flush()
    await log_audit(db, current_user.id, AuditAction.DELETE, "workshop", workshop_id, f"Ustaxona o'chirildi: {ws.name}")
    return {"message": "O'chirildi"}


@router.get("/workshops/{workshop_id}/detail")
async def admin_workshop_detail(
    workshop_id: str,
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """Full workshop detail with stats for admin."""
    ws = (await db.execute(select(Workshop).where(Workshop.id == workshop_id))).scalar_one_or_none()
    if not ws:
        raise NotFoundError("Ustaxona")

    # Services
    svcs = (await db.execute(select(WorkshopService).where(WorkshopService.workshop_id == ws.id, WorkshopService.is_deleted == False))).scalars().all()
    # Photos
    photos = (await db.execute(select(WorkshopPhoto).where(WorkshopPhoto.workshop_id == ws.id, WorkshopPhoto.is_deleted == False).order_by(WorkshopPhoto.order))).scalars().all()
    # Schedules
    scheds = (await db.execute(select(WorkshopSchedule).where(WorkshopSchedule.workshop_id == ws.id, WorkshopSchedule.is_deleted == False).order_by(WorkshopSchedule.day_of_week))).scalars().all()
    # Booking count
    booking_count = (await db.execute(select(func.count()).select_from(Booking).where(Booking.workshop_id == ws.id, Booking.is_deleted == False))).scalar()
    # Revenue
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(Booking.workshop_id == ws.id, Payment.status == PaymentStatus.SUCCESS, Payment.is_deleted == False)
    )).scalar()
    # Partner info
    partner = (await db.execute(select(User.full_name, User.phone).where(User.id == ws.partner_id))).one_or_none()

    day_labels = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]
    return {
        "id": str(ws.id), "name": ws.name, "slug": ws.slug, "description": ws.description,
        "address": ws.address, "city": ws.city, "district": ws.district, "phone": ws.phone,
        "latitude": ws.latitude, "longitude": ws.longitude,
        "is_verified": ws.is_verified, "is_active": ws.is_active,
        "subscription_tier": ws.subscription_tier.value if hasattr(ws.subscription_tier, 'value') else ws.subscription_tier,
        "rating_avg": float(ws.rating_avg or 0), "total_reviews": ws.total_reviews or 0,
        "partner_name": partner.full_name if partner else None,
        "partner_phone": partner.phone if partner else None,
        "booking_count": booking_count, "total_revenue": float(total_revenue),
        "services": [{"id": str(s.id), "name": s.name, "price_from": float(s.price_from or 0), "price_to": float(s.price_to or 0), "duration": s.duration_minutes} for s in svcs],
        "photos": [{"id": str(p.id), "url": p.url, "order": p.order} for p in photos],
        "schedule": [{"day_of_week": s.day_of_week, "day_label": day_labels[s.day_of_week] if s.day_of_week < 7 else "", "open_time": str(s.open_time)[:5] if s.open_time else "09:00", "close_time": str(s.close_time)[:5] if s.close_time else "18:00", "is_closed": s.is_closed} for s in scheds],
    }


@router.post("/workshops/{workshop_id}/photos")
async def admin_add_workshop_photo(
    workshop_id: str,
    photo: UploadFile = File(...),
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Upload photo for workshop."""
    import uuid as _uuid
    import os
    import aiofiles

    ws = (await db.execute(select(Workshop).where(Workshop.id == workshop_id))).scalar_one_or_none()
    if not ws:
        raise NotFoundError("Ustaxona")

    upload_dir = "/app/uploads/workshops"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(photo.filename or "img.jpg")[1] or ".jpg"
    filename = f"{_uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(await photo.read())

    url = f"/uploads/workshops/{filename}"
    count = (await db.execute(select(func.count()).select_from(WorkshopPhoto).where(WorkshopPhoto.workshop_id == ws.id, WorkshopPhoto.is_deleted == False))).scalar() or 0

    db_photo = WorkshopPhoto(id=_uuid.uuid4(), workshop_id=ws.id, url=url, order=count + 1, is_main=(count == 0))
    db.add(db_photo)
    await db.flush()
    return {"message": "Rasm yuklandi", "id": str(db_photo.id), "url": url}


@router.delete("/workshops/{workshop_id}/photos/{photo_id}")
async def admin_delete_workshop_photo(
    workshop_id: str,
    photo_id: str,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Delete workshop photo."""
    photo = (await db.execute(select(WorkshopPhoto).where(WorkshopPhoto.id == photo_id, WorkshopPhoto.workshop_id == workshop_id))).scalar_one_or_none()
    if not photo:
        raise NotFoundError("Rasm")
    photo.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


# =====================================================================
# ADMIN PARTS & CATEGORIES CRUD
# =====================================================================

class PartCategoryBody(BaseModel):
    name: str
    slug: str = ""
    icon_url: str | None = None


class PartCreateBody(BaseModel):
    name: str
    sku: str
    category_id: str | None = None
    brand_id: str | None = None
    description: str = ""
    price_retail: float = 0
    price_wholesale: float | None = None
    quantity: int = 0
    is_active: bool = True
    vehicle_model_ids: list[str] = []


class PartUpdateBody(BaseModel):
    name: str | None = None
    sku: str | None = None
    category_id: str | None = None
    description: str | None = None
    price_retail: float | None = None
    price_wholesale: float | None = None
    quantity: int | None = None
    is_active: bool | None = None


@router.get("/parts/categories")
async def admin_list_part_categories(current_user: User = moderator_dep, db: AsyncSession = Depends(get_db)):
    cats = (await db.execute(select(PartCategory).where(PartCategory.is_deleted == False).order_by(PartCategory.name))).scalars().all()
    return [{"id": str(c.id), "name": c.name, "slug": c.slug, "icon_url": c.icon_url} for c in cats]


@router.post("/parts/categories")
async def admin_create_category(body: PartCategoryBody, current_user: User = regional_dep, db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    slug = body.slug or body.name.lower().replace(" ", "-").replace("'", "")
    cat = PartCategory(id=_uuid.uuid4(), name=body.name, slug=slug, icon_url=body.icon_url)
    db.add(cat)
    await db.flush()
    return {"message": "Kategoriya yaratildi", "id": str(cat.id)}


@router.delete("/parts/categories/{cat_id}")
async def admin_delete_category(cat_id: str, current_user: User = super_dep, db: AsyncSession = Depends(get_db)):
    cat = (await db.execute(select(PartCategory).where(PartCategory.id == cat_id))).scalar_one_or_none()
    if not cat: raise NotFoundError("Kategoriya")
    cat.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


@router.get("/parts")
async def admin_list_parts(
    search: str | None = Query(None),
    category_id: str | None = Query(None),
    vehicle_model_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    from app.models.parts import part_vehicle_models
    query = select(Part).where(Part.is_deleted == False)
    if vehicle_model_id:
        query = query.join(part_vehicle_models).where(part_vehicle_models.c.vehicle_model_id == vehicle_model_id)
    if search:
        query = query.where(or_(Part.name.ilike(f"%{search}%"), Part.sku.ilike(f"%{search}%")))
    if category_id:
        query = query.where(Part.category_id == category_id)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    parts = (await db.execute(query.order_by(Part.name).offset(skip).limit(limit))).scalars().all()

    # Get categories and brands
    cat_ids = list({p.category_id for p in parts if p.category_id})
    brand_ids = list({p.brand_id for p in parts if p.brand_id})
    cat_map: dict = {}
    brand_map: dict = {}
    if cat_ids:
        cr = await db.execute(select(PartCategory.id, PartCategory.name).where(PartCategory.id.in_(cat_ids)))
        cat_map = {r.id: r.name for r in cr}
    if brand_ids:
        br = await db.execute(select(PartBrand.id, PartBrand.name).where(PartBrand.id.in_(brand_ids)))
        brand_map = {r.id: r.name for r in br}

    # Get prices and inventory
    part_ids = [p.id for p in parts]
    price_map: dict = {}
    inv_map: dict = {}
    if part_ids:
        pr = await db.execute(select(PartPrice).where(PartPrice.part_id.in_(part_ids)))
        for pp in pr.scalars().all():
            price_map[pp.part_id] = {"retail": float(pp.price_retail or 0), "wholesale": float(pp.price_wholesale or 0) if pp.price_wholesale else None}
        ir = await db.execute(select(PartInventory).where(PartInventory.part_id.in_(part_ids)))
        for inv in ir.scalars().all():
            inv_map[inv.part_id] = inv.quantity_available or 0

    items = []
    for p in parts:
        pr = price_map.get(p.id, {})
        items.append({
            "id": str(p.id), "name": p.name, "sku": p.sku,
            "category": cat_map.get(p.category_id, ""),
            "category_id": str(p.category_id) if p.category_id else None,
            "brand": brand_map.get(p.brand_id, ""),
            "description": p.description,
            "price": pr.get("retail", 0),
            "price_wholesale": pr.get("wholesale"),
            "quantity": inv_map.get(p.id, 0),
            "is_active": p.is_active,
            "vehicles": [{"id": str(vm.id), "name": vm.name} for vm in (p.vehicle_models or [])],
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/parts")
async def admin_create_part(body: PartCreateBody, current_user: User = regional_dep, db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    from datetime import datetime as _dt, timezone as _tz

    existing = (await db.execute(select(Part).where(Part.sku == body.sku, Part.is_deleted == False))).scalar_one_or_none()
    if existing:
        raise BadRequestError(f"SKU '{body.sku}' allaqachon mavjud")

    part = Part(
        id=_uuid.uuid4(), name=body.name, sku=body.sku,
        category_id=body.category_id or None, brand_id=body.brand_id or None,
        description=body.description, is_active=body.is_active,
    )
    db.add(part)
    await db.flush()

    # Price
    if body.price_retail:
        db.add(PartPrice(id=_uuid.uuid4(), part_id=part.id, price_retail=body.price_retail,
            price_wholesale=body.price_wholesale, valid_from=_dt.now(_tz.utc)))

    # Inventory
    if body.quantity:
        db.add(PartInventory(id=_uuid.uuid4(), part_id=part.id, quantity_available=body.quantity))

    # Link to vehicle models
    if body.vehicle_model_ids:
        from app.models.parts import part_vehicle_models
        for vm_id in body.vehicle_model_ids:
            try:
                await db.execute(part_vehicle_models.insert().values(part_id=part.id, vehicle_model_id=vm_id))
            except Exception:
                pass

    await db.flush()
    return {"message": "Mahsulot yaratildi", "id": str(part.id)}


@router.patch("/parts/{part_id}")
async def admin_update_part(part_id: str, body: PartUpdateBody, current_user: User = regional_dep, db: AsyncSession = Depends(get_db)):
    part = (await db.execute(select(Part).where(Part.id == part_id, Part.is_deleted == False))).scalar_one_or_none()
    if not part: raise NotFoundError("Mahsulot")

    for f in ["name", "sku", "category_id", "description", "is_active"]:
        v = getattr(body, f, None)
        if v is not None:
            setattr(part, f, v)

    if body.price_retail is not None:
        import uuid as _uuid
        from datetime import datetime as _dt, timezone as _tz
        price = (await db.execute(select(PartPrice).where(PartPrice.part_id == part.id).order_by(PartPrice.valid_from.desc()).limit(1))).scalar_one_or_none()
        if price:
            price.price_retail = body.price_retail
            if body.price_wholesale is not None: price.price_wholesale = body.price_wholesale
        else:
            db.add(PartPrice(id=_uuid.uuid4(), part_id=part.id, price_retail=body.price_retail,
                price_wholesale=body.price_wholesale, valid_from=_dt.now(_tz.utc)))

    if body.quantity is not None:
        inv = (await db.execute(select(PartInventory).where(PartInventory.part_id == part.id))).scalar_one_or_none()
        if inv:
            inv.quantity_available = body.quantity
        else:
            import uuid as _uuid
            db.add(PartInventory(id=_uuid.uuid4(), part_id=part.id, quantity_available=body.quantity))

    await db.flush()
    return {"message": "Yangilandi"}


@router.delete("/parts/{part_id}")
async def admin_delete_part(part_id: str, current_user: User = super_dep, db: AsyncSession = Depends(get_db)):
    part = (await db.execute(select(Part).where(Part.id == part_id))).scalar_one_or_none()
    if not part: raise NotFoundError("Mahsulot")
    part.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


# =====================================================================
# ADMIN PART ORDERS MANAGEMENT
# =====================================================================

@router.get("/part-orders")
async def admin_list_part_orders(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = moderator_dep,
    db: AsyncSession = Depends(get_db),
):
    """List all part orders with workshop/customer info."""
    query = select(PartOrder).where(PartOrder.is_deleted == False)
    if status:
        try:
            query = query.where(PartOrder.status == PartOrderStatus(status))
        except ValueError:
            pass

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    orders = (await db.execute(query.order_by(PartOrder.created_at.desc()).offset(skip).limit(limit))).scalars().all()

    # Enrich
    ws_ids = list({o.workshop_id for o in orders if o.workshop_id})
    cust_ids = list({o.customer_id for o in orders if o.customer_id})
    ws_map: dict = {}
    cust_map: dict = {}
    if ws_ids:
        wr = await db.execute(select(Workshop.id, Workshop.name, Workshop.city).where(Workshop.id.in_(ws_ids)))
        ws_map = {r.id: {"name": r.name, "city": r.city} for r in wr}
    if cust_ids:
        cr = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(cust_ids)))
        cust_map = {r.id: {"name": r.full_name, "phone": r.phone} for r in cr}

    # Get items for each order
    order_ids = [o.id for o in orders]
    items_map: dict = {}
    if order_ids:
        oi_result = await db.execute(
            select(PartOrderItem).where(PartOrderItem.order_id.in_(order_ids))
        )
        for oi in oi_result.scalars().all():
            if oi.order_id not in items_map:
                items_map[oi.order_id] = []
            items_map[oi.order_id].append(oi)

    # Get part names
    part_ids_all = []
    for ois in items_map.values():
        for oi in ois:
            part_ids_all.append(oi.part_id)
    part_map: dict = {}
    if part_ids_all:
        pr = await db.execute(select(Part.id, Part.name, Part.sku).where(Part.id.in_(list(set(part_ids_all)))))
        part_map = {r.id: {"name": r.name, "sku": r.sku} for r in pr}

    # Get booking info for orders that have booking_id
    booking_ids = [o.booking_id for o in orders if o.booking_id]
    booking_map: dict = {}
    if booking_ids:
        bk_rows = await db.execute(select(Booking.id, Booking.customer_id, Booking.notes, Booking.scheduled_at).where(Booking.id.in_(booking_ids)))
        for bk in bk_rows:
            bk_cust_name = cust_map.get(bk.customer_id, {}).get("name", "") if bk.customer_id else ""
            booking_map[bk.id] = {"id": bk.id, "customer_name": bk_cust_name, "notes": bk.notes, "scheduled_at": bk.scheduled_at.isoformat() if bk.scheduled_at else None}

    result = []
    for o in orders:
        ws = ws_map.get(o.workshop_id, {})
        cu = cust_map.get(o.customer_id, {})
        order_items = items_map.get(o.id, [])

        booking_info = None
        if o.booking_id and o.booking_id in booking_map:
            booking_info = booking_map[o.booking_id]

        result.append({
            "id": str(o.id),
            "workshop_name": ws.get("name", ""),
            "workshop_city": ws.get("city", ""),
            "customer_name": cu.get("name", ""),
            "customer_phone": cu.get("phone", ""),
            "status": o.status.value if hasattr(o.status, 'value') else o.status,
            "total_amount": float(o.total_amount or 0),
            "delivery_fee": float(o.delivery_fee or 0),
            "delivery_address": o.delivery_address,
            "booking": booking_info,
            "items_count": len(order_items),
            "items": [
                {"item_id": str(oi.id), "part_name": part_map.get(oi.part_id, {}).get("name", ""), "sku": part_map.get(oi.part_id, {}).get("sku", ""),
                 "quantity": oi.quantity, "unit_price": float(oi.unit_price or 0),
                 "is_available": oi.is_available if hasattr(oi, 'is_available') and oi.is_available is not None else True,
                 "admin_note": oi.admin_note if hasattr(oi, 'admin_note') else None}
                for oi in order_items
            ],
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    return {"items": result, "total": total, "skip": skip, "limit": limit}


class PartOrderStatusBody(BaseModel):
    status: str


class PartOrderReviewBody(BaseModel):
    items: list  # [{item_id, is_available, admin_note}]


@router.patch("/part-orders/{order_id}/review")
async def admin_review_part_order(
    order_id: str,
    body: PartOrderReviewBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin reviews order: marks items available/unavailable and sends to partner."""
    from uuid import UUID as _UUID
    try:
        oid = _UUID(order_id)
    except ValueError:
        raise BadRequestError("Noto'g'ri ID")
    order = (await db.execute(select(PartOrder).where(PartOrder.id == oid))).scalar_one_or_none()
    if not order:
        raise NotFoundError("Buyurtma")
    if order.status != PartOrderStatus.PENDING:
        raise BadRequestError("Faqat yangi buyurtmani ko'rib chiqish mumkin")

    # Update items
    for item_data in body.items:
        item_id_str = item_data.get("item_id")
        if not item_id_str:
            continue
        try:
            from uuid import UUID as _UUID
            item_uuid = _UUID(str(item_id_str))
        except (ValueError, AttributeError):
            continue
        item = (await db.execute(select(PartOrderItem).where(
            PartOrderItem.id == item_uuid,
            PartOrderItem.order_id == order.id,
        ))).scalar_one_or_none()
        if item:
            item.is_available = item_data.get("is_available", True)
            item.admin_note = item_data.get("admin_note", "")

    order.status = PartOrderStatus.ADMIN_REVIEWED
    await db.flush()

    await log_audit(db, current_user.id, AuditAction.UPDATE, "part_order", order_id,
        "Buyurtma ko'rib chiqildi va ustaga yuborildi", ip_address=_get_ip(request))
    return {"message": "Ko'rib chiqildi va ustaga yuborildi"}


@router.patch("/part-orders/{order_id}/status")
async def admin_update_part_order_status(
    order_id: str,
    body: PartOrderStatusBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin changes order status with validation."""
    from uuid import UUID as _UUID
    try:
        oid = _UUID(order_id)
    except ValueError:
        raise BadRequestError("Noto'g'ri ID")
    order = (await db.execute(select(PartOrder).where(PartOrder.id == oid))).scalar_one_or_none()
    if not order:
        raise NotFoundError("Buyurtma")

    try:
        new_status = PartOrderStatus(body.status)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri status: {body.status}")

    # Validate transitions
    current = order.status.value if hasattr(order.status, 'value') else order.status
    valid_transitions = {
        "pending": ["admin_reviewed", "cancelled"],
        "admin_reviewed": ["cancelled"],
        "partner_confirmed": ["shipped", "cancelled"],
        "shipped": [],
        "partner_received": ["delivered"],
        "delivered": [],
    }
    allowed = valid_transitions.get(current, [])
    if body.status not in allowed and body.status != "cancelled":
        raise BadRequestError(f"'{current}' dan '{body.status}' ga o'tish mumkin emas")

    old_status = current
    order.status = new_status
    await db.flush()

    await log_audit(db, current_user.id, AuditAction.UPDATE, "part_order", order_id,
        f"Status: {old_status} → {body.status}", ip_address=_get_ip(request))

    return {"message": "Status yangilandi"}


# =====================================================================
# VEHICLE MODEL MANAGEMENT
# =====================================================================

class VehicleBrandCreateBody(BaseModel):
    name: str
    country: str = ""


class VehicleModelCreateBody(BaseModel):
    brand_id: str
    name: str
    year_from: int | None = None
    year_to: int | None = None


@router.post("/vehicle-brands")
async def admin_create_vehicle_brand(
    body: VehicleBrandCreateBody,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Create a new vehicle brand."""
    import uuid as _uuid
    from app.models.vehicle import VehicleBrand
    brand = VehicleBrand(id=_uuid.uuid4(), name=body.name, country=body.country)
    db.add(brand)
    await db.flush()
    return {"message": "Marka yaratildi", "id": str(brand.id)}


@router.get("/vehicle-models")
async def admin_list_vehicle_models(current_user: User = moderator_dep, db: AsyncSession = Depends(get_db)):
    """List all vehicle brands with models."""
    from app.models.vehicle import VehicleBrand, VehicleModel
    from sqlalchemy.orm import selectinload as sload
    brands = (await db.execute(select(VehicleBrand).options(sload(VehicleBrand.models)).where(VehicleBrand.is_deleted == False).order_by(VehicleBrand.name))).scalars().all()
    return [
        {"id": str(b.id), "name": b.name, "country": b.country,
         "models": [{"id": str(m.id), "name": m.name, "year_from": m.year_from, "year_to": m.year_to, "image_url": m.image_url} for m in (b.models or []) if not m.is_deleted]}
        for b in brands
    ]


@router.post("/vehicle-models")
async def admin_create_vehicle_model(
    body: VehicleModelCreateBody,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Create a new vehicle model."""
    import uuid as _uuid
    from app.models.vehicle import VehicleModel
    model = VehicleModel(id=_uuid.uuid4(), brand_id=body.brand_id, name=body.name, year_from=body.year_from, year_to=body.year_to)
    db.add(model)
    await db.flush()
    return {"message": "Moshina yaratildi", "id": str(model.id)}


@router.post("/vehicle-models/{model_id}/image")
async def admin_upload_vehicle_image(
    model_id: str,
    image: UploadFile = File(...),
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Upload image for vehicle model."""
    import uuid as _uuid
    import os
    import aiofiles
    from app.models.vehicle import VehicleModel

    model = (await db.execute(select(VehicleModel).where(VehicleModel.id == model_id))).scalar_one_or_none()
    if not model:
        raise NotFoundError("Moshina modeli")

    upload_dir = "/app/uploads/vehicles"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(image.filename or "img.jpg")[1] or ".jpg"
    filename = f"{_uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(await image.read())

    url = f"/uploads/vehicles/{filename}"
    model.image_url = url
    await db.flush()
    return {"message": "Rasm yuklandi", "image_url": url}


@router.delete("/vehicle-models/{model_id}")
async def admin_delete_vehicle_model(
    model_id: str,
    current_user: User = super_dep,
    db: AsyncSession = Depends(get_db),
):
    from app.models.vehicle import VehicleModel
    model = (await db.execute(select(VehicleModel).where(VehicleModel.id == model_id))).scalar_one_or_none()
    if not model:
        raise NotFoundError("Moshina modeli")
    model.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


# =====================================================================
# ADMIN — PARTNER BONUS MANAGEMENT
# =====================================================================

class BonusWithdrawBody(BaseModel):
    partner_id: str
    amount: float
    note: str = ""


@router.get("/partner-bonuses")
async def admin_list_partner_bonuses(current_user: User = moderator_dep, db: AsyncSession = Depends(get_db)):
    """List all partner bonus wallets."""
    from app.models.part_bonus import PartBonusWallet
    wallets = (await db.execute(select(PartBonusWallet).order_by(PartBonusWallet.balance.desc()))).scalars().all()
    partner_ids = [w.partner_id for w in wallets]
    p_map: dict = {}
    if partner_ids:
        pr = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(partner_ids)))
        p_map = {r.id: {"name": r.full_name, "phone": r.phone} for r in pr}
    return [
        {"id": str(w.id), "partner_id": str(w.partner_id), "partner_name": p_map.get(w.partner_id, {}).get("name", ""),
         "partner_phone": p_map.get(w.partner_id, {}).get("phone", ""),
         "balance": float(w.balance), "total_earned": float(w.total_earned), "total_withdrawn": float(w.total_withdrawn),
         "tier": w.tier.value if hasattr(w.tier, 'value') else w.tier, "monthly_spent": float(w.monthly_spent)}
        for w in wallets
    ]


@router.post("/partner-bonuses/withdraw")
async def admin_withdraw_bonus(
    body: BonusWithdrawBody,
    request: Request,
    current_user: User = regional_dep,
    db: AsyncSession = Depends(get_db),
):
    """Admin withdraws bonus from partner wallet."""
    import uuid as _uuid
    from app.models.part_bonus import PartBonusWallet, PartBonusTransaction
    wallet = (await db.execute(select(PartBonusWallet).where(PartBonusWallet.partner_id == body.partner_id))).scalar_one_or_none()
    if not wallet:
        raise NotFoundError("Bonus hamyon")
    if body.amount > float(wallet.balance):
        raise BadRequestError(f"Yetarli mablag' yo'q. Balans: {float(wallet.balance)}")

    wallet.balance = float(wallet.balance) - body.amount
    wallet.total_withdrawn = float(wallet.total_withdrawn) + body.amount

    db.add(PartBonusTransaction(
        id=_uuid.uuid4(), wallet_id=wallet.id, amount=body.amount,
        type="withdrawn", tier_at_time=wallet.tier.value if hasattr(wallet.tier, 'value') else wallet.tier,
        note=body.note or f"Admin tomonidan {body.amount} so'm yechildi",
    ))
    await db.flush()

    await log_audit(db, current_user.id, AuditAction.UPDATE, "part_bonus", str(wallet.id),
        f"Bonus yechildi: {body.amount} so'm", ip_address=_get_ip(request))
    return {"message": f"{body.amount} so'm bonus yechildi", "new_balance": float(wallet.balance)}
