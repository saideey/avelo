from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PartResponse(BaseModel):
    id: UUID
    sku: str
    name: str
    category: str
    brand: str
    price: float
    images: list[str] | None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PartSearchFilter(BaseModel):
    category_id: UUID | None = None
    brand_id: UUID | None = None
    q: str | None = None
    price_min: float | None = None
    price_max: float | None = None


class PartOrderItemCreate(BaseModel):
    part_id: UUID
    quantity: int


class PartOrderCreate(BaseModel):
    items: list[PartOrderItemCreate]
    delivery_address: str
