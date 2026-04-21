from datetime import datetime, timedelta, timezone, date
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select, func, and_, cast, Date, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import require_role
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.user import User
from app.models.workshop import Workshop, WorkshopSchedule, WorkshopService, WorkshopPhoto
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.warranty import WarrantyClaim, WarrantyClaimStatus, Warranty
from app.models.review import Review
from app.models.parts import Part, PartPrice, PartOrder, PartOrderItem, PartOrderStatus
from app.models.part_bonus import PartBonusWallet, PartBonusTransaction, BonusTier, BONUS_TIERS

router = APIRouter(prefix="/partner", tags=["Partner"])

partner_dep = Depends(require_role("partner", "admin"))


async def _get_partner_workshop(user: User, db: AsyncSession) -> Workshop:
    """Get the first workshop owned by this partner."""
    result = await db.execute(
        select(Workshop).where(
            Workshop.partner_id == user.id,
            Workshop.is_deleted == False,
        ).limit(1)
    )
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise NotFoundError("Ustaxona")
    return workshop


async def _get_partner_workshop_ids(user: User, db: AsyncSession) -> list:
    """Get ALL workshop IDs owned by this partner."""
    result = await db.execute(
        select(Workshop.id).where(Workshop.partner_id == user.id, Workshop.is_deleted == False)
    )
    return [r.id for r in result]


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Today's stats across ALL partner workshops."""
    ws_ids = await _get_partner_workshop_ids(current_user, db)
    if not ws_ids:
        raise NotFoundError("Ustaxona")

    # Get first workshop for name/rating
    workshop = (await db.execute(select(Workshop).where(Workshop.id == ws_ids[0]))).scalar_one()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Today's bookings count (ALL workshops)
    bookings_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.scheduled_at >= today_start,
            Booking.scheduled_at < today_end,
        )
    )).scalar()

    # Today's revenue
    today_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= today_start,
            Payment.paid_at < today_end,
            Payment.is_deleted == False,
        )
    )).scalar()

    # Pending bookings
    pending_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.PENDING,
        )
    )).scalar()

    # Confirmed bookings
    confirmed_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.CONFIRMED,
        )
    )).scalar()

    # In-progress bookings
    in_progress_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.IN_PROGRESS,
        )
    )).scalar()

    # Completed today
    completed_today = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.COMPLETED,
            Booking.updated_at >= today_start,
            Booking.updated_at < today_end,
        )
    )).scalar()

    # Empty slots today: get today's schedule, calculate total slots minus booked
    now = datetime.now(timezone.utc)
    day_of_week = now.weekday()  # 0=Monday
    schedule_result = await db.execute(
        select(WorkshopSchedule).where(
            WorkshopSchedule.workshop_id.in_(ws_ids),
            WorkshopSchedule.day_of_week == day_of_week,
            WorkshopSchedule.is_deleted == False,
        ).limit(1)
    )
    schedule = schedule_result.scalar_one_or_none()
    empty_slots_today = 0
    if schedule and not schedule.is_closed and schedule.open_time and schedule.close_time:
        open_dt = datetime.combine(now.date(), schedule.open_time)
        close_dt = datetime.combine(now.date(), schedule.close_time)
        total_minutes = (close_dt - open_dt).total_seconds() / 60
        total_slots = int(total_minutes / schedule.slot_duration_minutes) * schedule.max_concurrent_bookings
        empty_slots_today = max(0, total_slots - bookings_count)

    # Next 3 upcoming confirmed bookings
    # Next confirmed bookings with customer names
    next_bookings_result = await db.execute(
        select(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            Booking.scheduled_at >= now,
        ).order_by(Booking.scheduled_at.asc()).limit(5)
    )
    next_bookings = next_bookings_result.scalars().all()
    cust_ids = list({b.customer_id for b in next_bookings if b.customer_id})
    cust_map = {}
    if cust_ids:
        cr = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(cust_ids)))
        cust_map = {str(r.id): {"name": r.full_name, "phone": r.phone} for r in cr}
    next_customers = []
    for b in next_bookings:
        c = cust_map.get(str(b.customer_id), {})
        next_customers.append({
            "id": str(b.id),
            "customer_name": c.get("name", "Mijoz"),
            "customer_phone": c.get("phone", ""),
            "status": b.status.value if hasattr(b.status, 'value') else b.status,
            "total_price": float(b.total_price or 0),
            "notes": b.notes,
            "time": b.scheduled_at.strftime("%H:%M") if b.scheduled_at else "",
            "date": b.scheduled_at.strftime("%d.%m") if b.scheduled_at else "",
        })

    # Weekly revenue (last 7 days)
    week_start = today_start - timedelta(days=6)
    weekly_rows = (await db.execute(
        select(
            cast(Payment.paid_at, Date).label("day"),
            func.sum(Payment.amount).label("rev"),
        ).join(Booking, Payment.booking_id == Booking.id).where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= week_start,
            Payment.is_deleted == False,
        ).group_by("day").order_by("day")
    )).all()
    day_labels = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"]
    weekly_revenue = []
    for i in range(7):
        d = (week_start + timedelta(days=i)).date()
        rev = next((float(r.rev) for r in weekly_rows if r.day == d), 0)
        weekly_revenue.append({"day": day_labels[d.weekday()], "date": str(d), "revenue": rev})

    # Total stats
    total_bookings = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids), Booking.is_deleted == False,
        )
    )).scalar()
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id).where(
            Booking.workshop_id.in_(ws_ids), Payment.status == PaymentStatus.SUCCESS, Payment.is_deleted == False,
        )
    )).scalar()

    # Average rating across all workshops
    avg_rating_result = (await db.execute(
        select(func.avg(Workshop.rating_avg), func.sum(Workshop.total_reviews))
        .where(Workshop.id.in_(ws_ids))
    )).one()
    avg_rating = float(avg_rating_result[0] or 0)
    total_reviews_all = int(avg_rating_result[1] or 0)

    return {
        "workshop_id": str(workshop.id),
        "workshop_name": f"{workshop.name}" + (f" (+{len(ws_ids)-1})" if len(ws_ids) > 1 else ""),
        "workshops_count": len(ws_ids),
        "today_bookings_count": bookings_count,
        "today_revenue": float(today_revenue),
        "pending_count": pending_count,
        "confirmed_count": confirmed_count,
        "in_progress_count": in_progress_count,
        "completed_today": completed_today,
        "rating_avg": round(avg_rating, 1),
        "total_reviews": total_reviews_all,
        "empty_slots_today": empty_slots_today,
        "next_customers": next_customers,
        "weekly_revenue": weekly_revenue,
        "total_bookings": total_bookings,
        "total_revenue": float(total_revenue),
    }


@router.get("/bookings")
async def get_partner_bookings(
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Get partner's workshop bookings."""
    workshop = await _get_partner_workshop(current_user, db)

    query = select(Booking).where(
        Booking.workshop_id == workshop.id,
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

    # Enrich with customer names
    customer_ids = list({b.customer_id for b in bookings if b.customer_id})
    customer_map = {}
    if customer_ids:
        cust_result = await db.execute(select(User.id, User.full_name, User.phone).where(User.id.in_(customer_ids)))
        customer_map = {str(r.id): {"name": r.full_name, "phone": r.phone} for r in cust_result}

    items = []
    for b in bookings:
        cust = customer_map.get(str(b.customer_id), {})
        items.append({
            "id": str(b.id),
            "customer_name": cust.get("name", "Mijoz"),
            "customer_phone": cust.get("phone", ""),
            "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
            "status": b.status.value if hasattr(b.status, 'value') else b.status,
            "total_price": float(b.total_price or 0),
            "notes": b.notes,
            "is_mobile": b.is_mobile,
            "address": b.address,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/analytics")
async def get_analytics(
    period: str = Query("week", description="week or month"),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Weekly/monthly revenue data across ALL partner workshops."""
    ws_ids = await _get_partner_workshop_ids(current_user, db)
    if not ws_ids:
        raise NotFoundError("Ustaxona")
    workshop = (await db.execute(select(Workshop).where(Workshop.id == ws_ids[0]))).scalar_one()

    now = datetime.now(timezone.utc)
    if period == "year":
        start_date = now - timedelta(days=365)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=7)

    # Total revenue in period
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= start_date,
            Payment.is_deleted == False,
        )
    )).scalar()

    # Total bookings in period
    bookings_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.created_at >= start_date,
        )
    )).scalar()

    # Completed bookings in period
    completed_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.COMPLETED,
            Booking.updated_at >= start_date,
        )
    )).scalar()

    # Cancelled bookings in period
    cancelled_count = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.status == BookingStatus.CANCELLED,
            Booking.updated_at >= start_date,
        )
    )).scalar()

    avg_per_booking = float(revenue) / bookings_count if bookings_count else 0

    # Revenue chart — daily breakdown
    daily_rows = (await db.execute(
        select(
            cast(Payment.paid_at, Date).label("day"),
            func.sum(Payment.amount).label("rev"),
        )
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= start_date,
            Payment.is_deleted == False,
        )
        .group_by("day").order_by("day")
    )).all()
    revenue_chart = [{"date": str(r.day), "revenue": float(r.rev)} for r in daily_rows]

    # Services breakdown with real revenue
    from app.models.workshop import WorkshopService as WS
    svc_rows = (await db.execute(
        select(
            WS.name,
            func.count(func.distinct(Booking.id)).label("cnt"),
            func.coalesce(func.sum(
                case((Payment.status == PaymentStatus.SUCCESS, Payment.amount), else_=0)
            ), 0).label("revenue"),
        )
        .select_from(Booking)
        .join(WS, WS.workshop_id == Booking.workshop_id)
        .outerjoin(Payment, and_(Payment.booking_id == Booking.id, Payment.is_deleted == False))
        .where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.created_at >= start_date,
        )
        .group_by(WS.name).order_by(func.count(func.distinct(Booking.id)).desc())
    )).all()
    services_breakdown = [{"name": r.name, "count": r.cnt, "revenue": float(r.revenue)} for r in svc_rows]

    # Rating trend — use average per week
    rating_trend = [{"date": str(now.date()), "rating": float(workshop.rating_avg or 0)}]

    return {
        "period": period,
        "total_revenue": float(revenue),
        "total_bookings": bookings_count,
        "completed_bookings": completed_count,
        "cancelled_bookings": cancelled_count,
        "avg_per_booking": round(avg_per_booking),
        "growth_percent": 0,
        "rating": workshop.rating_avg,
        "revenue_chart": revenue_chart,
        "services_breakdown": services_breakdown,
        "rating_trend": rating_trend,
    }


@router.get("/warranty-claims")
async def get_workshop_warranty_claims(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Get workshop's warranty claims."""
    workshop = await _get_partner_workshop(current_user, db)

    # Get claims via warranty -> workshop
    query = (
        select(WarrantyClaim)
        .join(Warranty, WarrantyClaim.warranty_id == Warranty.id)
        .where(
            Warranty.workshop_id == workshop.id,
            WarrantyClaim.is_deleted == False,
        )
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(WarrantyClaim.created_at.desc()).offset(skip).limit(limit)
    )
    claims = result.scalars().all()

    return {"items": claims, "total": total, "skip": skip, "limit": limit}


# ──────────────────────────────────────────────
# 1. Partner Review Management
# ──────────────────────────────────────────────

@router.get("/reviews")
async def get_workshop_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """List reviews for partner's workshop(s)."""
    workshop = await _get_partner_workshop(current_user, db)

    query = select(Review).where(
        Review.workshop_id == workshop.id,
        Review.is_deleted == False,
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Review.created_at.desc()).offset(skip).limit(limit)
    )
    reviews = result.scalars().all()

    # Enrich with customer name
    customer_ids = [r.customer_id for r in reviews]
    if customer_ids:
        customers_result = await db.execute(
            select(User.id, User.full_name).where(User.id.in_(customer_ids))
        )
        customer_map = {str(row.id): row.full_name for row in customers_result}
    else:
        customer_map = {}

    items = []
    for r in reviews:
        items.append({
            "id": str(r.id),
            "customer_name": customer_map.get(str(r.customer_id), "Mijoz"),
            "rating_quality": r.rating_quality,
            "rating_price": r.rating_price,
            "rating_time": r.rating_time,
            "rating_communication": r.rating_communication,
            "rating_overall": float(r.rating_overall or 0),
            "comment": r.comment,
            "reply": r.reply,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


class ReviewReplyBody(BaseModel):
    reply: str


@router.post("/reviews/{review_id}/reply")
async def reply_to_review(
    review_id: UUID,
    body: ReviewReplyBody,
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Partner replies to a review on their workshop."""
    workshop = await _get_partner_workshop(current_user, db)

    result = await db.execute(
        select(Review).where(Review.id == review_id, Review.is_deleted == False)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise NotFoundError("Sharh")

    if review.workshop_id != workshop.id:
        raise ForbiddenError("Bu sharh sizning ustaxonangizga tegishli emas")

    review.reply = body.reply
    await db.commit()
    await db.refresh(review)

    return review


# ──────────────────────────────────────────────
# 2. Partner Warranty Claim Management
# ──────────────────────────────────────────────

class WarrantyClaimAcceptBody(BaseModel):
    partner_notes: str | None = None


@router.patch("/warranty-claims/{claim_id}/accept")
async def accept_warranty_claim(
    claim_id: UUID,
    body: WarrantyClaimAcceptBody,
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Partner accepts a warranty claim."""
    workshop = await _get_partner_workshop(current_user, db)

    result = await db.execute(
        select(WarrantyClaim)
        .join(Warranty, WarrantyClaim.warranty_id == Warranty.id)
        .where(
            WarrantyClaim.id == claim_id,
            WarrantyClaim.is_deleted == False,
        )
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise NotFoundError("Kafolat da'vosi")

    # Verify the claim's warranty belongs to the partner's workshop
    warranty_result = await db.execute(
        select(Warranty).where(Warranty.id == claim.warranty_id)
    )
    warranty = warranty_result.scalar_one_or_none()
    if not warranty or warranty.workshop_id != workshop.id:
        raise ForbiddenError("Bu kafolat da'vosi sizning ustaxonangizga tegishli emas")

    claim.status = WarrantyClaimStatus.APPROVED
    if body.partner_notes:
        claim.admin_notes = body.partner_notes
    await db.commit()
    await db.refresh(claim)

    return claim


class WarrantyClaimRejectBody(BaseModel):
    reason: str


@router.patch("/warranty-claims/{claim_id}/reject")
async def reject_warranty_claim(
    claim_id: UUID,
    body: WarrantyClaimRejectBody,
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Partner rejects a warranty claim with reason."""
    workshop = await _get_partner_workshop(current_user, db)

    result = await db.execute(
        select(WarrantyClaim)
        .join(Warranty, WarrantyClaim.warranty_id == Warranty.id)
        .where(
            WarrantyClaim.id == claim_id,
            WarrantyClaim.is_deleted == False,
        )
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise NotFoundError("Kafolat da'vosi")

    warranty_result = await db.execute(
        select(Warranty).where(Warranty.id == claim.warranty_id)
    )
    warranty = warranty_result.scalar_one_or_none()
    if not warranty or warranty.workshop_id != workshop.id:
        raise ForbiddenError("Bu kafolat da'vosi sizning ustaxonangizga tegishli emas")

    claim.status = WarrantyClaimStatus.REJECTED
    claim.admin_notes = body.reason
    await db.commit()
    await db.refresh(claim)

    return claim


# ──────────────────────────────────────────────
# 4. Partner Financial Report
# ──────────────────────────────────────────────

@router.get("/finance/summary")
async def get_finance_summary(
    period: str = Query("monthly", description="weekly, monthly, or yearly"),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Financial summary for a given period across ALL workshops."""
    ws_ids = await _get_partner_workshop_ids(current_user, db)
    if not ws_ids:
        raise NotFoundError("Ustaxona")
    workshop = (await db.execute(select(Workshop).where(Workshop.id == ws_ids[0]))).scalar_one()

    now = datetime.now(timezone.utc)
    if period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "yearly":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)

    # Total revenue
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= start_date,
            Payment.is_deleted == False,
        )
    )).scalar()
    total_revenue = float(total_revenue)

    # Total bookings in period
    total_bookings = (await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.workshop_id.in_(ws_ids),
            Booking.is_deleted == False,
            Booking.created_at >= start_date,
        )
    )).scalar()

    total_commission = round(total_revenue * 0.10, 2)
    net_income = round(total_revenue - total_commission, 2)
    avg_per_booking = round(total_revenue / total_bookings, 2) if total_bookings else 0

    # Payment method breakdown
    method_rows = (await db.execute(
        select(
            Payment.method,
            func.count().label("count"),
            func.coalesce(func.sum(Payment.amount), 0).label("amount"),
        )
        .select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= start_date,
            Payment.is_deleted == False,
        )
        .group_by(Payment.method)
    )).all()
    payment_method_breakdown = [
        {"method": row.method, "count": row.count, "amount": float(row.amount)}
        for row in method_rows
    ]

    # Daily breakdown
    daily_rows = (await db.execute(
        select(
            cast(Payment.paid_at, Date).label("date"),
            func.coalesce(func.sum(Payment.amount), 0).label("revenue"),
            func.count().label("bookings"),
        )
        .select_from(Payment)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.paid_at >= start_date,
            Payment.is_deleted == False,
        )
        .group_by(cast(Payment.paid_at, Date))
        .order_by(cast(Payment.paid_at, Date))
    )).all()
    daily_breakdown = [
        {"date": str(row.date), "revenue": float(row.revenue), "bookings": row.bookings}
        for row in daily_rows
    ]

    # Get commission % from settings
    from app.models.admin import PlatformSettings
    comm_setting = (await db.execute(select(PlatformSettings).where(PlatformSettings.key == "commission_percent"))).scalar_one_or_none()
    commission_percent = int(comm_setting.value) if comm_setting else 10

    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "commission_percent": commission_percent,
        "net_income": net_income,
        "total_bookings": total_bookings,
        "avg_per_booking": avg_per_booking,
        "payment_method_breakdown": payment_method_breakdown,
        "daily_breakdown": daily_breakdown,
    }


@router.get("/finance/commission")
async def get_finance_commission(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Commission details across ALL workshops."""
    ws_ids = await _get_partner_workshop_ids(current_user, db)
    if not ws_ids:
        raise NotFoundError("Ustaxona")

    query = (
        select(Payment, Booking)
        .join(Booking, Payment.booking_id == Booking.id)
        .where(
            Booking.workshop_id.in_(ws_ids),
            Payment.status == PaymentStatus.SUCCESS,
            Payment.is_deleted == False,
        )
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Payment.paid_at.desc()).offset(skip).limit(limit)
    )
    rows = result.all()

    items = []
    for payment, booking in rows:
        amount = float(payment.amount)
        commission = round(amount * 0.10, 2)
        items.append({
            "booking_id": str(booking.id),
            "payment_id": str(payment.id),
            "amount": amount,
            "commission": commission,
            "net": round(amount - commission, 2),
            "method": payment.method,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


# ──────────────────────────────────────────────
# 5. Partner Parts Ordering
# ──────────────────────────────────────────────

@router.get("/parts/catalog")
async def get_parts_catalog(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    vehicle_model_id: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Browse parts catalog with B2B (wholesale) pricing, filterable by vehicle and category."""
    from app.models.parts import part_vehicle_models
    from app.models.parts import PartCategory
    from sqlalchemy import or_
    query = select(Part).where(Part.is_active == True, Part.is_deleted == False)
    if vehicle_model_id:
        query = query.join(part_vehicle_models).where(part_vehicle_models.c.vehicle_model_id == vehicle_model_id)
    if category:
        cat = (await db.execute(select(PartCategory).where(PartCategory.name.ilike(f"%{category}%")))).scalar_one_or_none()
        if cat:
            query = query.where(Part.category_id == cat.id)
    if search:
        query = query.where(or_(Part.name.ilike(f"%{search}%"), Part.sku.ilike(f"%{search}%")))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Part.name.asc()).offset(skip).limit(limit)
    )
    parts = result.scalars().all()

    items = []
    for part in parts:
        # Get the current price (latest valid)
        price_result = await db.execute(
            select(PartPrice)
            .where(
                PartPrice.part_id == part.id,
                PartPrice.is_deleted == False,
            )
            .order_by(PartPrice.valid_from.desc())
            .limit(1)
        )
        price = price_result.scalar_one_or_none()
        items.append({
            "id": str(part.id),
            "sku": part.sku,
            "name": part.name,
            "category": part.category.name if part.category else None,
            "brand": part.brand.name if part.brand else None,
            "description": part.description,
            "price": float(price.price_wholesale or price.price_retail) if price else 0,
            "price_retail": float(price.price_retail) if price else None,
            "price_wholesale": float(price.price_wholesale) if price and price.price_wholesale else None,
            "in_stock": part.inventory.quantity_available if part.inventory else 0,
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


class PartOrderItemBody(BaseModel):
    part_id: UUID
    quantity: int


class PartOrderBody(BaseModel):
    items: List[PartOrderItemBody]
    delivery_address: str
    booking_id: str | None = None  # qaysi mijoz/buyurtma uchun


@router.post("/parts/order")
async def create_part_order(
    body: PartOrderBody,
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Place a part order for partner's workshop."""
    workshop = await _get_partner_workshop(current_user, db)

    if not body.items:
        raise BadRequestError("Buyurtma uchun kamida bitta qism kerak")

    total_amount = 0.0
    order_items_data = []

    for item in body.items:
        part_result = await db.execute(
            select(Part).where(Part.id == item.part_id, Part.is_active == True, Part.is_deleted == False)
        )
        part = part_result.scalar_one_or_none()
        if not part:
            raise NotFoundError(f"Qism (ID: {item.part_id})")

        # Get wholesale price
        price_result = await db.execute(
            select(PartPrice)
            .where(PartPrice.part_id == part.id, PartPrice.is_deleted == False)
            .order_by(PartPrice.valid_from.desc())
            .limit(1)
        )
        price = price_result.scalar_one_or_none()
        if not price:
            raise BadRequestError(f"Narx topilmadi: {part.name}")

        unit_price = float(price.price_wholesale) if price.price_wholesale else float(price.price_retail)
        total_amount += unit_price * item.quantity
        order_items_data.append((part.id, item.quantity, unit_price))

    order = PartOrder(
        workshop_id=workshop.id,
        customer_id=current_user.id,
        booking_id=body.booking_id or None,
        status=PartOrderStatus.PENDING,
        delivery_address=body.delivery_address,
        delivery_fee=0,
        total_amount=round(total_amount, 2),
    )
    db.add(order)
    await db.flush()

    for part_id, quantity, unit_price in order_items_data:
        order_item = PartOrderItem(
            order_id=order.id,
            part_id=part_id,
            quantity=quantity,
            unit_price=unit_price,
        )
        db.add(order_item)

    await db.commit()
    await db.refresh(order)

    return order


@router.get("/parts/orders")
async def get_part_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """List partner's part orders."""
    workshop = await _get_partner_workshop(current_user, db)

    query = select(PartOrder).where(
        PartOrder.workshop_id == workshop.id,
        PartOrder.is_deleted == False,
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(PartOrder.created_at.desc()).offset(skip).limit(limit)
    )
    orders = result.scalars().all()

    # Enrich orders with items and booking info
    enriched = []
    for o in orders:
        enriched.append({
            "id": str(o.id),
            "status": o.status.value if hasattr(o.status, 'value') else o.status,
            "total_amount": float(o.total_amount or 0),
            "delivery_address": o.delivery_address,
            "booking_id": str(o.booking_id) if o.booking_id else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return {"items": enriched, "total": total, "skip": skip, "limit": limit}


@router.patch("/parts/orders/{order_id}/confirm")
async def partner_confirm_order(order_id: str, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    """Partner confirms after admin reviewed."""
    from uuid import UUID as _UUID
    workshop = await _get_partner_workshop(current_user, db)
    try: oid = _UUID(order_id)
    except ValueError: raise BadRequestError("Noto'g'ri ID")
    order = (await db.execute(select(PartOrder).where(PartOrder.id == oid, PartOrder.workshop_id == workshop.id))).scalar_one_or_none()
    if not order: raise NotFoundError("Buyurtma")
    if order.status != PartOrderStatus.ADMIN_REVIEWED:
        raise BadRequestError("Faqat admin ko'rib chiqqan buyurtmani tasdiqlash mumkin")
    order.status = PartOrderStatus.PARTNER_CONFIRMED
    await db.flush()
    return {"message": "Usta tomonidan tasdiqlandi"}


@router.patch("/parts/orders/{order_id}/received")
async def partner_received_order(order_id: str, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    """Partner confirms delivery received."""
    from uuid import UUID as _UUID
    workshop = await _get_partner_workshop(current_user, db)
    try: oid = _UUID(order_id)
    except ValueError: raise BadRequestError("Noto'g'ri ID")
    order = (await db.execute(select(PartOrder).where(PartOrder.id == oid, PartOrder.workshop_id == workshop.id))).scalar_one_or_none()
    if not order: raise NotFoundError("Buyurtma")
    if order.status != PartOrderStatus.SHIPPED:
        raise BadRequestError("Faqat jo'natilgan buyurtmani qabul qilish mumkin")
    order.status = PartOrderStatus.PARTNER_RECEIVED
    await db.flush()
    return {"message": "Qabul qilindi"}


# ──────────────────────────────────────────────
# 6. Partner Customers List
# ──────────────────────────────────────────────

@router.get("/customers")
async def get_partner_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """List unique customers who booked at the partner's workshop."""
    workshop = await _get_partner_workshop(current_user, db)

    # Subquery: unique customers with aggregates
    customer_stats = (
        select(
            Booking.customer_id,
            func.count().label("total_bookings"),
            func.max(Booking.scheduled_at).label("last_visit"),
            func.coalesce(func.sum(Booking.total_price), 0).label("total_spent"),
        )
        .where(
            Booking.workshop_id == workshop.id,
            Booking.is_deleted == False,
        )
        .group_by(Booking.customer_id)
    ).subquery()

    # Total unique customers
    total = (await db.execute(
        select(func.count()).select_from(customer_stats)
    )).scalar()

    # Join with User to get name and phone
    query = (
        select(
            User.id,
            User.full_name,
            User.phone,
            customer_stats.c.total_bookings,
            customer_stats.c.last_visit,
            customer_stats.c.total_spent,
        )
        .join(customer_stats, User.id == customer_stats.c.customer_id)
        .order_by(customer_stats.c.last_visit.desc())
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        phone = row.phone
        # Mask phone: show first 4 and last 2 digits
        if phone and len(phone) > 6:
            masked_phone = phone[:4] + "*" * (len(phone) - 6) + phone[-2:]
        else:
            masked_phone = phone

        items.append({
            "customer_id": str(row.id),
            "customer_name": row.full_name,
            "phone": masked_phone,
            "total_bookings": row.total_bookings,
            "last_visit": row.last_visit.isoformat() if row.last_visit else None,
            "total_spent": float(row.total_spent),
        })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


# =====================================================================
# PARTNER SETTINGS
# =====================================================================

class WorkshopInfoBody(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    city: str | None = None


class ServiceBody(BaseModel):
    name: str
    price_from: float
    price_to: float
    duration: int


class ScheduleItem(BaseModel):
    day_of_week: int
    open_time: str
    close_time: str
    is_closed: bool = False


@router.get("/settings")
async def get_settings(
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    workshop = await _get_partner_workshop(current_user, db)
    svcs = (await db.execute(select(WorkshopService).where(WorkshopService.workshop_id == workshop.id, WorkshopService.is_deleted == False).order_by(WorkshopService.name))).scalars().all()
    scheds = (await db.execute(select(WorkshopSchedule).where(WorkshopSchedule.workshop_id == workshop.id, WorkshopSchedule.is_deleted == False).order_by(WorkshopSchedule.day_of_week))).scalars().all()
    photos = (await db.execute(select(WorkshopPhoto).where(WorkshopPhoto.workshop_id == workshop.id, WorkshopPhoto.is_deleted == False).order_by(WorkshopPhoto.order))).scalars().all()
    day_labels = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"]
    return {
        "info": {"id": str(workshop.id), "name": workshop.name, "description": workshop.description, "address": workshop.address, "phone": workshop.phone, "city": workshop.city},
        "services": [{"id": str(s.id), "name": s.name, "price_from": float(s.price_from or 0), "price_to": float(s.price_to or 0), "duration": s.duration_minutes} for s in svcs],
        "schedule": [{"day_of_week": s.day_of_week, "day_label": day_labels[s.day_of_week] if s.day_of_week < 7 else str(s.day_of_week), "open_time": str(s.open_time)[:5] if s.open_time else "09:00", "close_time": str(s.close_time)[:5] if s.close_time else "18:00", "is_closed": s.is_closed} for s in scheds],
        "photos": [{"id": str(p.id), "url": p.url or "", "order": p.order} for p in photos],
    }


@router.put("/settings/info")
async def update_info(body: WorkshopInfoBody, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    workshop = await _get_partner_workshop(current_user, db)
    for field in ["name", "description", "address", "phone", "city"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(workshop, field, val)
    await db.flush()
    return {"message": "Saqlandi"}


@router.put("/settings/schedule")
async def update_schedule(body: dict, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    from datetime import datetime as _dt
    workshop = await _get_partner_workshop(current_user, db)
    old = (await db.execute(select(WorkshopSchedule).where(WorkshopSchedule.workshop_id == workshop.id))).scalars().all()
    for s in old:
        await db.delete(s)
    for item in body.get("schedule", []):
        db.add(WorkshopSchedule(id=_uuid.uuid4(), workshop_id=workshop.id, day_of_week=item.get("day_of_week", 0),
            open_time=_dt.strptime(item.get("open_time", "09:00"), "%H:%M").time(),
            close_time=_dt.strptime(item.get("close_time", "18:00"), "%H:%M").time(),
            is_closed=item.get("is_closed", False), slot_duration_minutes=30, max_concurrent_bookings=2))
    await db.flush()
    return {"message": "Grafik saqlandi"}


@router.post("/settings/services")
async def add_service(body: ServiceBody, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    workshop = await _get_partner_workshop(current_user, db)
    svc = WorkshopService(id=_uuid.uuid4(), workshop_id=workshop.id, name=body.name, price_from=body.price_from, price_to=body.price_to, duration_minutes=body.duration, is_available=True)
    db.add(svc)
    await db.flush()
    return {"message": "Qo'shildi", "id": str(svc.id)}


@router.put("/settings/services/{service_id}")
async def update_service(service_id: str, body: ServiceBody, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    workshop = await _get_partner_workshop(current_user, db)
    svc = (await db.execute(select(WorkshopService).where(WorkshopService.id == service_id, WorkshopService.workshop_id == workshop.id))).scalar_one_or_none()
    if not svc:
        raise NotFoundError("Xizmat")
    svc.name = body.name
    svc.price_from = body.price_from
    svc.price_to = body.price_to
    svc.duration_minutes = body.duration
    await db.flush()
    return {"message": "Yangilandi"}


@router.delete("/settings/services/{service_id}")
async def delete_service(service_id: str, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    workshop = await _get_partner_workshop(current_user, db)
    svc = (await db.execute(select(WorkshopService).where(WorkshopService.id == service_id, WorkshopService.workshop_id == workshop.id))).scalar_one_or_none()
    if not svc:
        raise NotFoundError("Xizmat")
    svc.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


@router.post("/settings/photos")
async def add_photo(
    photo: UploadFile = File(...),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    import uuid as _uuid
    import os
    import aiofiles

    workshop = await _get_partner_workshop(current_user, db)

    # Save file to /app/uploads/
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(photo.filename or "img.jpg")[1] or ".jpg"
    filename = f"{_uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await photo.read()
        await f.write(content)

    url = f"/uploads/{filename}"

    count = (await db.execute(select(func.count()).select_from(WorkshopPhoto).where(
        WorkshopPhoto.workshop_id == workshop.id, WorkshopPhoto.is_deleted == False
    ))).scalar() or 0

    db_photo = WorkshopPhoto(
        id=_uuid.uuid4(), workshop_id=workshop.id,
        url=url, order=count + 1, is_main=(count == 0),
    )
    db.add(db_photo)
    await db.flush()
    return {"message": "Rasm yuklandi", "id": str(db_photo.id), "url": url}


@router.delete("/settings/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: User = partner_dep, db: AsyncSession = Depends(get_db)):
    workshop = await _get_partner_workshop(current_user, db)
    photo = (await db.execute(select(WorkshopPhoto).where(WorkshopPhoto.id == photo_id, WorkshopPhoto.workshop_id == workshop.id))).scalar_one_or_none()
    if not photo:
        raise NotFoundError("Rasm")
    photo.is_deleted = True
    await db.flush()
    return {"message": "O'chirildi"}


# =====================================================================
# PARTNER PART BONUS & STATS
# =====================================================================

@router.get("/parts/stats")
async def get_parts_stats(
    period: str = Query("monthly"),
    current_user: User = partner_dep,
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive part order statistics for partner."""
    import uuid as _uuid
    ws_ids = await _get_partner_workshop_ids(current_user, db)
    if not ws_ids:
        raise NotFoundError("Ustaxona")

    now = datetime.now(timezone.utc)
    if period == "weekly":
        start_date = now - timedelta(days=7)
    elif period == "yearly":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)

    # Get or create bonus wallet
    wallet = (await db.execute(select(PartBonusWallet).where(PartBonusWallet.partner_id == current_user.id))).scalar_one_or_none()
    if not wallet:
        wallet = PartBonusWallet(id=_uuid.uuid4(), partner_id=current_user.id, balance=0, total_earned=0, total_withdrawn=0, tier=BonusTier.STANDART, monthly_spent=0)
        db.add(wallet)
        await db.flush()

    # Total orders (all time)
    total_orders = (await db.execute(
        select(func.count()).select_from(PartOrder).where(PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False)
    )).scalar()

    # Total spent (all time)
    total_spent = (await db.execute(
        select(func.coalesce(func.sum(PartOrder.total_amount), 0)).where(
            PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False,
            PartOrder.status.in_([PartOrderStatus.DELIVERED, PartOrderStatus.PARTNER_RECEIVED, PartOrderStatus.PARTNER_CONFIRMED, PartOrderStatus.SHIPPED])
        )
    )).scalar()

    # Period orders
    period_orders = (await db.execute(
        select(func.count()).select_from(PartOrder).where(
            PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False, PartOrder.created_at >= start_date)
    )).scalar()

    # Period spent
    period_spent = (await db.execute(
        select(func.coalesce(func.sum(PartOrder.total_amount), 0)).where(
            PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False, PartOrder.created_at >= start_date,
            PartOrder.status.in_([PartOrderStatus.DELIVERED, PartOrderStatus.PARTNER_RECEIVED, PartOrderStatus.PARTNER_CONFIRMED, PartOrderStatus.SHIPPED])
        )
    )).scalar()

    # Calculate current tier
    monthly_spent_val = float(period_spent) if period == "monthly" else float(total_spent)
    current_tier = "standart"
    bonus_percent = 3
    for tier_name, tier_info in BONUS_TIERS.items():
        if monthly_spent_val >= tier_info["min"]:
            current_tier = tier_name
            bonus_percent = tier_info["percent"]

    # Update wallet
    wallet.monthly_spent = monthly_spent_val
    wallet.tier = BonusTier(current_tier)

    # Period bonus
    period_bonus = round(float(period_spent) * bonus_percent / 100)

    # Update total earned if needed
    if wallet.total_earned < period_bonus:
        wallet.total_earned = period_bonus
        wallet.balance = period_bonus - float(wallet.total_withdrawn)
    await db.flush()

    # Daily breakdown
    daily_rows = (await db.execute(
        select(
            cast(PartOrder.created_at, Date).label("day"),
            func.count(PartOrder.id).label("cnt"),
            func.sum(PartOrder.total_amount).label("spent"),
        ).where(
            PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False, PartOrder.created_at >= start_date
        ).group_by("day").order_by("day")
    )).all()
    daily_breakdown = [{"date": str(r.day), "orders": r.cnt, "spent": float(r.spent or 0)} for r in daily_rows]

    # Top parts (most ordered)
    top_parts_rows = (await db.execute(
        select(Part.name, func.sum(PartOrderItem.quantity).label("qty"), func.sum(PartOrderItem.quantity * PartOrderItem.unit_price).label("total"))
        .select_from(PartOrderItem)
        .join(PartOrder, PartOrderItem.order_id == PartOrder.id)
        .join(Part, PartOrderItem.part_id == Part.id)
        .where(PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False)
        .group_by(Part.name).order_by(func.sum(PartOrderItem.quantity).desc()).limit(10)
    )).all()
    top_parts = [{"name": r.name, "quantity": int(r.qty), "total": float(r.total or 0)} for r in top_parts_rows]

    # Orders by status
    status_rows = (await db.execute(
        select(PartOrder.status, func.count(PartOrder.id).label("cnt"))
        .where(PartOrder.workshop_id.in_(ws_ids), PartOrder.is_deleted == False)
        .group_by(PartOrder.status)
    )).all()
    by_status = {r.status.value if hasattr(r.status, 'value') else r.status: r.cnt for r in status_rows}

    # Bonus history
    bonus_txns = (await db.execute(
        select(PartBonusTransaction).where(PartBonusTransaction.wallet_id == wallet.id)
        .order_by(PartBonusTransaction.created_at.desc()).limit(20)
    )).scalars().all()

    return {
        "wallet": {
            "balance": float(wallet.balance),
            "total_earned": float(wallet.total_earned),
            "total_withdrawn": float(wallet.total_withdrawn),
            "tier": current_tier,
            "bonus_percent": bonus_percent,
            "monthly_spent": monthly_spent_val,
        },
        "tiers": BONUS_TIERS,
        "stats": {
            "total_orders": total_orders,
            "total_spent": float(total_spent),
            "period_orders": period_orders,
            "period_spent": float(period_spent),
            "period_bonus": period_bonus,
            "by_status": by_status,
        },
        "top_parts": top_parts,
        "daily_breakdown": daily_breakdown,
        "bonus_history": [
            {"id": str(t.id), "amount": float(t.amount), "type": t.type, "tier": t.tier_at_time,
             "note": t.note, "created_at": t.created_at.isoformat() if t.created_at else None}
            for t in bonus_txns
        ],
    }
