from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WarrantyResponse(BaseModel):
    id: UUID
    booking_id: UUID
    service_name: str
    duration_months: int
    expires_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class WarrantyClaimCreate(BaseModel):
    warranty_id: UUID
    description: str


class WarrantyClaimResponse(BaseModel):
    id: UUID
    warranty_id: UUID
    description: str
    status: str
    admin_notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
