from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: UUID
    phone: str
    full_name: str | None
    role: str
    avatar_url: str | None
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class VehicleCreate(BaseModel):
    brand_id: UUID
    model_id: UUID
    year: int
    license_plate: str | None = None
    color: str | None = None


class VehicleUpdate(BaseModel):
    year: int | None = None
    license_plate: str | None = None
    mileage: int | None = None
    color: str | None = None


class VehicleResponse(BaseModel):
    id: UUID
    brand_name: str
    model_name: str
    year: int | None
    license_plate: str | None
    color: str | None
    mileage: int | None

    model_config = ConfigDict(from_attributes=True)
