from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.booking import Booking
from app.models.payment import Payment, PaymentMethod, PaymentStatus

settings = get_settings()


async def initiate_payment(
    db: AsyncSession, booking_id, method: str
) -> Payment:
    """Create a pending payment for a booking."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.is_deleted == False)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    # Check for existing payment
    existing = await db.execute(
        select(Payment).where(Payment.booking_id == booking_id)
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Bu buyurtma uchun to'lov allaqachon mavjud")

    try:
        payment_method = PaymentMethod(method)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri to'lov usuli: {method}")

    payment = Payment(
        booking_id=booking_id,
        amount=float(booking.total_price or 0),
        method=payment_method,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    await db.flush()
    return payment


async def process_payment(db: AsyncSession, payment_id) -> Payment:
    """Process a payment. In test mode, auto-succeed."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")

    if payment.status != PaymentStatus.PENDING:
        raise BadRequestError("Faqat kutilayotgan to'lovlarni qayta ishlash mumkin")

    if settings.APP_ENV in ("development", "testing") or settings.OTP_TEST_MODE:
        # Auto-succeed in test/dev mode
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = datetime.now(timezone.utc)
        payment.gateway_txn_id = f"test_{payment.id}"
    else:
        # In production, mark as processing (gateway callback would complete it)
        payment.status = PaymentStatus.PROCESSING

    await db.flush()
    return payment


async def get_payment_status(db: AsyncSession, payment_id) -> Payment:
    """Get the current status of a payment."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")
    return payment
