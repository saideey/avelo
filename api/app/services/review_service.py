from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, BadRequestError
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.models.workshop import Workshop
from app.schemas.review import ReviewCreate


async def create_review(
    db: AsyncSession, customer_id, data: ReviewCreate
) -> Review:
    """Create a review for a completed booking and update the workshop rating."""
    # Verify booking
    result = await db.execute(
        select(Booking).where(
            Booking.id == data.booking_id,
            Booking.customer_id == customer_id,
            Booking.is_deleted == False,
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if booking.status != BookingStatus.COMPLETED:
        raise BadRequestError("Faqat yakunlangan buyurtmalar uchun sharh qoldirish mumkin")

    # Check for existing review
    existing = await db.execute(
        select(Review).where(Review.booking_id == data.booking_id)
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Bu buyurtma uchun sharh allaqachon mavjud")

    rating_overall = (
        data.rating_quality + data.rating_price
        + data.rating_time + data.rating_communication
    ) / 4.0

    review = Review(
        booking_id=data.booking_id,
        customer_id=customer_id,
        workshop_id=booking.workshop_id,
        rating_quality=data.rating_quality,
        rating_price=data.rating_price,
        rating_time=data.rating_time,
        rating_communication=data.rating_communication,
        rating_overall=rating_overall,
        comment=data.comment,
    )
    db.add(review)
    await db.flush()

    # Update workshop average rating
    avg_result = await db.execute(
        select(
            func.avg(Review.rating_overall),
            func.count(Review.id),
        ).where(
            Review.workshop_id == booking.workshop_id,
            Review.is_visible == True,
        )
    )
    row = avg_result.one()
    avg_rating = float(row[0]) if row[0] else 0.0
    total_reviews = row[1] or 0

    ws_result = await db.execute(
        select(Workshop).where(Workshop.id == booking.workshop_id)
    )
    workshop = ws_result.scalar_one()
    workshop.rating_avg = round(avg_rating, 2)
    workshop.total_reviews = total_reviews
    await db.flush()

    return review


async def get_workshop_reviews(
    db: AsyncSession,
    workshop_id,
    skip: int = 0,
    limit: int = 20,
) -> list[Review]:
    """Get paginated reviews for a workshop."""
    result = await db.execute(
        select(Review)
        .where(
            Review.workshop_id == workshop_id,
            Review.is_visible == True,
        )
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
