import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    BLOCK = "block"
    UNBLOCK = "unblock"
    VERIFY = "verify"
    APPROVE = "approve"
    REJECT = "reject"
    LOGIN = "login"
    LOGOUT = "logout"
    SETTINGS_CHANGE = "settings_change"
    REFUND = "refund"
    REVIEW_DELETE = "review_delete"
    COMPLAINT_RESOLVE = "complaint_resolve"


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action: Mapped[AuditAction] = mapped_column()
    resource_type: Mapped[str] = mapped_column(String(50))  # user, workshop, booking, payment, review, etc.
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    old_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)

    admin: Mapped["User"] = relationship("User", foreign_keys=[admin_id], lazy="noload")

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, admin_id={self.admin_id}, action={self.action})>"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class ComplaintType(str, enum.Enum):
    SERVICE_QUALITY = "service_quality"
    PAYMENT_ISSUE = "payment_issue"
    WARRANTY_ISSUE = "warranty_issue"
    FRAUD = "fraud"
    RUDE_BEHAVIOR = "rude_behavior"
    FAKE_REVIEW = "fake_review"
    PRICE_DISPUTE = "price_dispute"
    OTHER = "other"


class Complaint(Base, TimestampMixin):
    __tablename__ = "complaints"

    complainant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    against_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    workshop_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), nullable=True)
    booking_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    type: Mapped[ComplaintType] = mapped_column(default=ComplaintType.OTHER)
    status: Mapped[ComplaintStatus] = mapped_column(default=ComplaintStatus.OPEN)
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1=low, 2=medium, 3=high, 4=critical

    complainant: Mapped["User"] = relationship("User", foreign_keys=[complainant_id], lazy="noload")
    against: Mapped["User | None"] = relationship("User", foreign_keys=[against_id], lazy="noload")
    assignee: Mapped["User | None"] = relationship("User", foreign_keys=[assigned_to], lazy="noload")

    def __repr__(self) -> str:
        return f"<Complaint(id={self.id}, type={self.type}, status={self.status})>"


class PlatformSettings(Base, TimestampMixin):
    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, payment, warranty, etc.
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<PlatformSettings(key={self.key}, value={self.value})>"
