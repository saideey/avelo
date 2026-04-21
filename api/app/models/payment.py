import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    CLICK = "click"
    PAYME = "payme"
    UZUM = "uzum"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class EscrowStatus(str, enum.Enum):
    HELD = "held"
    RELEASED = "released"
    REFUNDED = "refunded"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    method: Mapped[PaymentMethod] = mapped_column(default=PaymentMethod.CASH)
    status: Mapped[PaymentStatus] = mapped_column(default=PaymentStatus.PENDING)
    gateway_txn_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gateway_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="payment", lazy="noload")
    escrow: Mapped["Escrow | None"] = relationship("Escrow", back_populates="payment", uselist=False, lazy="noload")

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, amount={self.amount}, status={self.status})>"


class Escrow(Base, TimestampMixin):
    __tablename__ = "escrows"

    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), index=True)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[EscrowStatus] = mapped_column(default=EscrowStatus.HELD)
    released_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    payment: Mapped["Payment"] = relationship("Payment", back_populates="escrow")
    workshop: Mapped["Workshop"] = relationship("Workshop", lazy="noload")

    def __repr__(self) -> str:
        return f"<Escrow(id={self.id}, amount={self.amount}, status={self.status})>"


class Payout(Base, TimestampMixin):
    __tablename__ = "payouts"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(50))
    bank_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", lazy="noload")

    def __repr__(self) -> str:
        return f"<Payout(id={self.id}, amount={self.amount}, status={self.status})>"
