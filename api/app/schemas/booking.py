from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BookingCreate(BaseModel):
    workshop_id: UUID
    vehicle_id: UUID | None = None
    service_ids: list[UUID]
    scheduled_at: datetime
    is_mobile: bool = False
    address: str | None = None
    notes: str | None = None


class BookingServiceInfo(BaseModel):
    id: UUID
    name: str
    price_from: float | None
    price_to: float | None

    model_config = ConfigDict(from_attributes=True)


class BookingResponse(BaseModel):
    id: UUID
    workshop_name: str
    vehicle_info: str | None
    services: list[BookingServiceInfo]
    scheduled_at: datetime
    status: str
    total_price: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingStatusUpdate(BaseModel):
    status: str


class TimeSlotQuery(BaseModel):
    workshop_id: UUID
    date: date


class AvailableSlot(BaseModel):
    time: str
    is_available: bool
