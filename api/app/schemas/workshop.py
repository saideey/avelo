from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WorkshopCreate(BaseModel):
    name: str
    description: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class WorkshopUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class WorkshopServiceCreate(BaseModel):
    category_id: UUID | None = None
    name: str
    price_from: float | None = None
    price_to: float | None = None
    duration_minutes: int | None = None


class WorkshopServiceResponse(BaseModel):
    id: UUID
    name: str
    price_from: float | None
    price_to: float | None
    duration_minutes: int | None
    is_available: bool

    model_config = ConfigDict(from_attributes=True)


class WorkshopScheduleCreate(BaseModel):
    day_of_week: int
    open_time: str
    close_time: str
    is_closed: bool = False
    slot_duration_minutes: int = 30


class WorkshopListItem(BaseModel):
    id: UUID
    name: str
    slug: str
    address: str | None
    city: str | None
    rating_avg: float
    total_reviews: int
    is_verified: bool
    subscription_tier: str
    distance: float | None = None
    main_photo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class WorkshopDetailResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    address: str | None
    city: str | None
    district: str | None
    phone: str | None
    latitude: float | None
    longitude: float | None
    is_verified: bool
    subscription_tier: str
    rating_avg: float
    total_reviews: int
    services: list[WorkshopServiceResponse]
    schedule: list[dict]
    photos: list[dict]
    certificates: list[dict]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NearbyWorkshopFilter(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = 5.0
    service_category: str | None = None
    rating_min: float | None = None
