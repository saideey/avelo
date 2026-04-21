from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.user import User
from app.models.review import Review
from app.models.booking import Booking, BookingStatus
from app.models.workshop import Workshop

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/", status_code=201)
async def create_review(
    booking_id: UUID,
    rating_quality: int,
    rating_price: int,
    rating_time: int,
    rating_communication: int,
    comment: str | None = None,
    photos: list[str] | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a review for a completed booking."""
    # Verify booking
    result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.customer_id == current_user.id,
            Booking.is_deleted == False,
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if booking.status != BookingStatus.COMPLETED:
        raise BadRequestError("Faqat tugatilgan buyurtmalarga sharh qoldirish mumkin")

    # Check if review already exists
    existing = await db.execute(
        select(Review).where(Review.booking_id == booking_id, Review.is_deleted == False)
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Bu buyurtma uchun sharh allaqachon mavjud")

    # Validate ratings
    for rating in [rating_quality, rating_price, rating_time, rating_communication]:
        if not 1 <= rating <= 5:
            raise BadRequestError("Baho 1 dan 5 gacha bo'lishi kerak")

    rating_overall = (rating_quality + rating_price + rating_time + rating_communication) / 4.0

    review = Review(
        booking_id=booking_id,
        customer_id=current_user.id,
        workshop_id=booking.workshop_id,
        rating_quality=rating_quality,
        rating_price=rating_price,
        rating_time=rating_time,
        rating_communication=rating_communication,
        rating_overall=round(rating_overall, 2),
        comment=comment,
        photos=photos,
    )
    db.add(review)

    # Update workshop average rating
    ws_result = await db.execute(
        select(Workshop).where(Workshop.id == booking.workshop_id)
    )
    workshop = ws_result.scalar_one_or_none()
    if workshop:
        avg_result = await db.execute(
            select(func.avg(Review.rating_overall), func.count(Review.id)).where(
                Review.workshop_id == workshop.id,
                Review.is_visible == True,
                Review.is_deleted == False,
            )
        )
        row = avg_result.one()
        # Account for the new review being added
        current_avg = row[0] or 0
        current_count = row[1] or 0
        new_avg = ((current_avg * current_count) + rating_overall) / (current_count + 1)
        workshop.rating_avg = round(float(new_avg), 2)
        workshop.total_reviews = current_count + 1

    await db.flush()
    await db.refresh(review)
    return review


@router.get("/workshop/{workshop_id}")
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
