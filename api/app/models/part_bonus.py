import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Float, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class BonusTier(str, enum.Enum):
    STANDART = "standart"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


# Tier thresholds (monthly spend) and bonus percentages
BONUS_TIERS = {
    "standart":  {"min": 0,        "max": 2000000,  "percent": 3},
    "silver":    {"min": 2000000,   "max": 10000000, "percent": 5},
    "gold":      {"min": 10000000,  "max": 30000000, "percent": 7},
    "platinum":  {"min": 30000000,  "max": 999999999,"percent": 10},
}


class PartBonusWallet(Base, TimestampMixin):
    """Partner's part bonus wallet."""
    __tablename__ = "part_bonus_wallets"

    partner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True)
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_withdrawn: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tier: Mapped[BonusTier] = mapped_column(default=BonusTier.STANDART)
    monthly_spent: Mapped[float] = mapped_column(Numeric(12, 2), default=0)


class PartBonusTransaction(Base, TimestampMixin):
    """Individual bonus transaction."""
    __tablename__ = "part_bonus_transactions"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("part_bonus_wallets.id"), index=True)
    part_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("part_orders.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    type: Mapped[str] = mapped_column(String(20))  # "earned" or "withdrawn"
    tier_at_time: Mapped[str] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
