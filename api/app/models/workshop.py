import enum
import uuid
from datetime import date, time, datetime

from sqlalchemy import (
    String, Boolean, Float, Integer, Numeric, Text, Date, Time,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SubscriptionTier(str, enum.Enum):
    BASIC = "basic"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class Workshop(Base, TimestampMixin):
    __tablename__ = "workshops"

    partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    working_hours: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(default=SubscriptionTier.BASIC)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships — heavy ones use noload to prevent recursion
    partner: Mapped["User"] = relationship("User", back_populates="workshops", lazy="noload")
    photos: Mapped[list["WorkshopPhoto"]] = relationship("WorkshopPhoto", back_populates="workshop", lazy="selectin")
    services: Mapped[list["WorkshopService"]] = relationship("WorkshopService", back_populates="workshop", lazy="selectin")
    certificates: Mapped[list["WorkshopCertificate"]] = relationship("WorkshopCertificate", back_populates="workshop", lazy="selectin")
    schedules: Mapped[list["WorkshopSchedule"]] = relationship("WorkshopSchedule", back_populates="workshop", lazy="selectin")
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="workshop", lazy="noload")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="workshop", lazy="noload")
    time_slots: Mapped[list["TimeSlot"]] = relationship("TimeSlot", back_populates="workshop", lazy="noload")
    subscriptions: Mapped[list["WorkshopSubscription"]] = relationship("WorkshopSubscription", back_populates="workshop", lazy="noload")

    def __repr__(self) -> str:
        return f"<Workshop(id={self.id}, name={self.name})>"


class WorkshopPhoto(Base, TimestampMixin):
    __tablename__ = "workshop_photos"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="photos")

    def __repr__(self) -> str:
        return f"<WorkshopPhoto(id={self.id}, workshop_id={self.workshop_id})>"


class WorkshopService(Base, TimestampMixin):
    __tablename__ = "workshop_services"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("service_categories.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    price_from: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    price_to: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="services")
    category: Mapped["ServiceCategory"] = relationship("ServiceCategory", back_populates="workshop_services")
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", secondary="booking_services", back_populates="services", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<WorkshopService(id={self.id}, name={self.name})>"


class WorkshopCertificate(Base, TimestampMixin):
    __tablename__ = "workshop_certificates"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    issued_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="certificates")

    def __repr__(self) -> str:
        return f"<WorkshopCertificate(id={self.id}, title={self.title})>"


class WorkshopSchedule(Base, TimestampMixin):
    __tablename__ = "workshop_schedules"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0-6
    open_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    max_concurrent_bookings: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="schedules")

    def __repr__(self) -> str:
        return f"<WorkshopSchedule(id={self.id}, workshop_id={self.workshop_id}, day={self.day_of_week})>"
