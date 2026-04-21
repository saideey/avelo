import enum
import uuid
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class CashbackTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class CashbackTransactionType(str, enum.Enum):
    EARNED = "earned"
    SPENT = "spent"
    EXPIRED = "expired"
    TRANSFERRED = "transferred"


class CashbackWallet(Base, TimestampMixin):
    __tablename__ = "cashback_wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True
    )
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tier: Mapped[CashbackTier] = mapped_column(default=CashbackTier.BRONZE)
    total_earned: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_spent: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cashback_wallet")
    transactions: Mapped[list["CashbackTransaction"]] = relationship(
        "CashbackTransaction", back_populates="wallet", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<CashbackWallet(id={self.id}, user_id={self.user_id}, balance={self.balance})>"


class CashbackTransaction(Base, TimestampMixin):
    __tablename__ = "cashback_transactions"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cashback_wallets.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    type: Mapped[CashbackTransactionType] = mapped_column()
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    wallet: Mapped["CashbackWallet"] = relationship("CashbackWallet", back_populates="transactions")

    def __repr__(self) -> str:
        return f"<CashbackTransaction(id={self.id}, type={self.type}, amount={self.amount})>"
