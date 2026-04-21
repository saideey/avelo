import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    String, Boolean, Float, Integer, Numeric, Text, DateTime, ForeignKey, Table, Column,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

# M2M: Part ↔ VehicleModel
part_vehicle_models = Table(
    "part_vehicle_models", Base.metadata,
    Column("part_id", UUID(as_uuid=True), ForeignKey("parts.id"), primary_key=True),
    Column("vehicle_model_id", UUID(as_uuid=True), ForeignKey("vehicle_models.id"), primary_key=True),
)


class PartOrderStatus(str, enum.Enum):
    PENDING = "pending"                    # 1. Usta buyurtma berdi
    ADMIN_REVIEWED = "admin_reviewed"      # 2. Admin ko'rib chiqdi, ustaga yubordi
    PARTNER_CONFIRMED = "partner_confirmed" # 3. Usta tasdiqladi
    SHIPPED = "shipped"                    # 4. Admin jo'natdi
    PARTNER_RECEIVED = "partner_received"  # 5. Usta qabul qildi
    DELIVERED = "delivered"                # 6. Admin yakunladi
    CANCELLED = "cancelled"


class PartCategory(Base, TimestampMixin):
    __tablename__ = "part_categories"

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("part_categories.id"), nullable=True
    )
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    parent: Mapped["PartCategory | None"] = relationship(
        "PartCategory", remote_side="PartCategory.id", back_populates="children"
    )
    children: Mapped[list["PartCategory"]] = relationship(
        "PartCategory", back_populates="parent", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<PartCategory(id={self.id}, name={self.name})>"


class PartBrand(Base, TimestampMixin):
    __tablename__ = "part_brands"

    name: Mapped[str] = mapped_column(String(200), unique=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<PartBrand(id={self.id}, name={self.name})>"


class Part(Base, TimestampMixin):
    __tablename__ = "parts"

    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("part_categories.id"), index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("part_brands.id"), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    specifications: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    compatible_vehicles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    images: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    category: Mapped["PartCategory"] = relationship("PartCategory", lazy="selectin")
    brand: Mapped["PartBrand"] = relationship("PartBrand", lazy="selectin")
    inventory: Mapped["PartInventory | None"] = relationship("PartInventory", back_populates="part", uselist=False, lazy="selectin")
    prices: Mapped[list["PartPrice"]] = relationship("PartPrice", back_populates="part", lazy="selectin")
    vehicle_models: Mapped[list["VehicleModel"]] = relationship("VehicleModel", secondary=part_vehicle_models, lazy="selectin")

    def __repr__(self) -> str:
        return f"<Part(id={self.id}, sku={self.sku}, name={self.name})>"


class PartInventory(Base, TimestampMixin):
    __tablename__ = "part_inventories"

    part_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parts.id"), index=True)
    quantity_available: Mapped[int] = mapped_column(Integer)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    part: Mapped["Part"] = relationship("Part", back_populates="inventory")

    def __repr__(self) -> str:
        return f"<PartInventory(id={self.id}, part_id={self.part_id})>"


class PartPrice(Base, TimestampMixin):
    __tablename__ = "part_prices"

    part_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parts.id"), index=True)
    price_retail: Mapped[float] = mapped_column(Numeric(12, 2))
    price_wholesale: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    part: Mapped["Part"] = relationship("Part", back_populates="prices")

    def __repr__(self) -> str:
        return f"<PartPrice(id={self.id}, part_id={self.part_id})>"


class PartOrder(Base, TimestampMixin):
    __tablename__ = "part_orders"

    workshop_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workshops.id"), nullable=True, index=True
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True, index=True
    )
    status: Mapped[PartOrderStatus] = mapped_column(default=PartOrderStatus.PENDING)
    delivery_address: Mapped[str] = mapped_column(Text)
    delivery_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))

    # Relationships
    workshop: Mapped["Workshop | None"] = relationship("Workshop", lazy="noload")
    customer: Mapped["User | None"] = relationship("User", lazy="noload")
    items: Mapped[list["PartOrderItem"]] = relationship("PartOrderItem", back_populates="order", lazy="selectin")

    def __repr__(self) -> str:
        return f"<PartOrder(id={self.id}, status={self.status})>"


class PartOrderItem(Base, TimestampMixin):
    __tablename__ = "part_order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("part_orders.id"), index=True)
    part_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parts.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    admin_note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    order: Mapped["PartOrder"] = relationship("PartOrder", back_populates="items")
    part: Mapped["Part"] = relationship("Part", lazy="selectin")

    def __repr__(self) -> str:
        return f"<PartOrderItem(id={self.id}, order_id={self.order_id})>"
