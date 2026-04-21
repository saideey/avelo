from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PaymentInitRequest(BaseModel):
    booking_id: UUID
    method: str


class PaymentResponse(BaseModel):
    id: UUID
    booking_id: UUID
    amount: float
    method: str
    status: str
    paid_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
