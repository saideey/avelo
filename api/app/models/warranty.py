import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WarrantyStatus(str, enum.Enum):
    ACTIVE = "active"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    VOID = "void"


class WarrantyClaimStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESOLVED = "resolved"


class Warranty(Base, TimestampMixin):
    __tablename__ = "warranties"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    duration_months: Mapped[int] = mapped_column(Integer)
    mileage_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[WarrantyStatus] = mapped_column(default=WarrantyStatus.ACTIVE)

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="warranty", lazy="noload")
    customer: Mapped["User"] = relationship("User", lazy="noload")
    workshop: Mapped["Workshop"] = relationship("Workshop", lazy="noload")
    claims: Mapped[list["WarrantyClaim"]] = relationship("WarrantyClaim", back_populates="warranty", lazy="noload")

    def __repr__(self) -> str:
        return f"<Warranty(id={self.id}, status={self.status})>"


class WarrantyClaim(Base, TimestampMixin):
    __tablename__ = "warranty_claims"

    warranty_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("warranties.id"), index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    description: Mapped[str] = mapped_column(Text)
    photos: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[WarrantyClaimStatus] = mapped_column(default=WarrantyClaimStatus.SUBMITTED)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    warranty: Mapped["Warranty"] = relationship("Warranty", back_populates="claims", lazy="noload")
    customer: Mapped["User"] = relationship("User", lazy="noload")

    def __repr__(self) -> str:
        return f"<WarrantyClaim(id={self.id}, status={self.status})>"
