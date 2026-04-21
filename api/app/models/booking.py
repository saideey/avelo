import enum
import uuid
from datetime import datetime, date, time

from sqlalchemy import (
    String, Boolean, Float, Integer, Numeric, Text, Date, Time,
    DateTime, ForeignKey, Table, Column,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


# Association table for Booking <-> WorkshopService
booking_services = Table(
    "booking_services",
    Base.metadata,
    Column("booking_id", UUID(as_uuid=True), ForeignKey("bookings.id"), primary_key=True),
    Column("service_id", UUID(as_uuid=True), ForeignKey("workshop_services.id"), primary_key=True),
)


class TimeSlot(Base, TimestampMixin):
    __tablename__ = "time_slots"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    time: Mapped[time] = mapped_column(Time)
    capacity: Mapped[int] = mapped_column(Integer)
    booked_count: Mapped[int] = mapped_column(Integer, default=0)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="time_slots")

    def __repr__(self) -> str:
        return f"<TimeSlot(id={self.id}, date={self.date}, time={self.time})>"


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_vehicles.id"), nullable=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[BookingStatus] = mapped_column(default=BookingStatus.PENDING)
    total_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mechanic_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mobile: Mapped[bool] = mapped_column(Boolean, default=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships — noload to prevent recursion; use selectinload() in queries when needed
    customer: Mapped["User"] = relationship("User", back_populates="bookings", foreign_keys=[customer_id], lazy="noload")
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="bookings", lazy="noload")
    vehicle: Mapped["UserVehicle | None"] = relationship("UserVehicle", lazy="noload")
    services: Mapped[list["WorkshopService"]] = relationship(
        "WorkshopService", secondary=booking_services, back_populates="bookings", lazy="noload"
    )
    status_history: Mapped[list["BookingStatusHistory"]] = relationship(
        "BookingStatusHistory", back_populates="booking", lazy="noload"
    )
    payment: Mapped["Payment | None"] = relationship("Payment", back_populates="booking", uselist=False, lazy="noload")
    review: Mapped["Review | None"] = relationship("Review", back_populates="booking", uselist=False, lazy="noload")
    warranty: Mapped["Warranty | None"] = relationship("Warranty", back_populates="booking", uselist=False, lazy="noload")

    def __repr__(self) -> str:
        return f"<Booking(id={self.id}, status={self.status})>"


class BookingStatusHistory(Base, TimestampMixin):
    __tablename__ = "booking_status_history"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50))
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="status_history")

    def __repr__(self) -> str:
        return f"<BookingStatusHistory(id={self.id}, booking_id={self.booking_id})>"
