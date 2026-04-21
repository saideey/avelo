import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    tier: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 2))
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    max_bookings_per_month: Mapped[int] = mapped_column(Integer)

    # Relationships
    subscriptions: Mapped[list["WorkshopSubscription"]] = relationship(
        "WorkshopSubscription", back_populates="plan", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<SubscriptionPlan(id={self.id}, tier={self.tier})>"


class WorkshopSubscription(Base, TimestampMixin):
    __tablename__ = "workshop_subscriptions"

    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="subscriptions")
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="subscriptions")

    def __repr__(self) -> str:
        return f"<WorkshopSubscription(id={self.id}, workshop_id={self.workshop_id})>"
