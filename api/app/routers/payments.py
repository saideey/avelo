from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.user import User
from app.models.payment import Payment, PaymentStatus, PaymentMethod, Escrow, EscrowStatus
from app.models.booking import Booking
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentInitBody(BaseModel):
    booking_id: str
    method: str = "cash"
    amount: float | None = None


@router.post("/initiate", status_code=201)
async def initiate_payment(
    body: PaymentInitBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a payment for a booking."""
    result = await db.execute(
        select(Booking).where(
            Booking.id == body.booking_id,
            Booking.is_deleted == False,
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError("Buyurtma")

    if booking.customer_id != current_user.id:
        raise BadRequestError("Bu buyurtma sizga tegishli emas")

    amount = body.amount or float(booking.total_price or 0)
    method = body.method

    # Check no existing payment
    existing = await db.execute(
        select(Payment).where(
            Payment.booking_id == body.booking_id,
            Payment.is_deleted == False,
            Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.SUCCESS]),
        )
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Bu buyurtma uchun to'lov allaqachon mavjud")

    try:
        payment_method = PaymentMethod(method)
    except ValueError:
        raise BadRequestError(f"Noto'g'ri to'lov usuli: {method}")

    payment = Payment(
        booking_id=body.booking_id,
        amount=amount,
        method=payment_method,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    await db.flush()

    # Update booking total_price
    booking.total_price = amount
    await db.flush()
    await db.refresh(payment)

    return payment


@router.get("/status/{payment_id}")
async def get_payment_status(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get payment status."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.is_deleted == False)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")

    # Verify ownership via booking
    booking_result = await db.execute(
        select(Booking).where(Booking.id == payment.booking_id)
    )
    booking = booking_result.scalar_one_or_none()
    if not booking or (booking.customer_id != current_user.id and current_user.role != "admin"):
        from app.models.workshop import Workshop
        ws_result = await db.execute(
            select(Workshop).where(Workshop.id == booking.workshop_id)
        )
        ws = ws_result.scalar_one_or_none()
        if not ws or ws.partner_id != current_user.id:
            raise BadRequestError("Ruxsat yo'q")

    return payment


@router.post("/test-complete/{payment_id}")
async def test_complete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """TEST ONLY: Mark a payment as successful (for development)."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.is_deleted == False)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("To'lov")

    if payment.status != PaymentStatus.PENDING:
        raise BadRequestError(f"To'lov holati '{payment.status.value}', kutilmoqda 'pending'")

    payment.status = PaymentStatus.SUCCESS
    payment.paid_at = datetime.now(timezone.utc)
    payment.gateway_txn_id = f"TEST-{payment.id}"

    # Create escrow
    booking_result = await db.execute(
        select(Booking).where(Booking.id == payment.booking_id)
    )
    booking = booking_result.scalar_one_or_none()
    if booking:
        escrow = Escrow(
            payment_id=payment.id,
            workshop_id=booking.workshop_id,
            amount=float(payment.amount),
            status=EscrowStatus.HELD,
        )
        db.add(escrow)

    await db.flush()
    await db.refresh(payment)
    return payment
