from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ReviewCreate(BaseModel):
    booking_id: UUID
    rating_quality: int
    rating_price: int
    rating_time: int
    rating_communication: int
    comment: str | None = None

    @field_validator("rating_quality", "rating_price", "rating_time", "rating_communication")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Baho 1 dan 5 gacha bo'lishi kerak")
        return v


class ReviewResponse(BaseModel):
    id: UUID
    customer_name: str | None
    rating_quality: int
    rating_price: int
    rating_time: int
    rating_communication: int
    rating_overall: float
    comment: str | None
    reply: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
