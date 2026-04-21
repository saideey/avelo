from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CashbackWalletResponse(BaseModel):
    balance: float
    tier: str
    total_earned: float
    total_spent: float

    model_config = ConfigDict(from_attributes=True)


class CashbackTransactionResponse(BaseModel):
    id: UUID
    amount: float
    type: str
    source: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
