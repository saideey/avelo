import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    PARTNER = "partner"
    MECHANIC = "mechanic"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    REGIONAL_ADMIN = "regional_admin"
    MODERATOR = "moderator"


class OTPPurpose(str, enum.Enum):
    LOGIN = "login"
    REGISTER = "register"
    RESET = "reset"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(default=UserRole.CUSTOMER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)  # for regional_admin

    # Relationships — use "noload" by default to prevent recursion; load explicitly via selectinload() in queries
    vehicles: Mapped[list["UserVehicle"]] = relationship("UserVehicle", back_populates="user", lazy="noload")
    workshops: Mapped[list["Workshop"]] = relationship("Workshop", back_populates="partner", lazy="noload")
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="customer", foreign_keys="[Booking.customer_id]", lazy="noload")
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="customer", lazy="noload")
    cashback_wallet: Mapped["CashbackWallet | None"] = relationship("CashbackWallet", back_populates="user", uselist=False, lazy="noload")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", lazy="noload")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship("RefreshToken", back_populates="user", lazy="noload")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone={self.phone}, role={self.role})>"


class OTPCode(Base, TimestampMixin):
    __tablename__ = "otp_codes"

    user_phone: Mapped[str] = mapped_column(String(20), index=True)
    code: Mapped[str] = mapped_column(String(10))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    purpose: Mapped[OTPPurpose] = mapped_column(default=OTPPurpose.LOGIN)

    def __repr__(self) -> str:
        return f"<OTPCode(id={self.id}, phone={self.user_phone}, purpose={self.purpose})>"


class RefreshToken(Base, TimestampMixin):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(500))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    device_info: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")

    def __repr__(self) -> str:
        return f"<RefreshToken(id={self.id}, user_id={self.user_id})>"
