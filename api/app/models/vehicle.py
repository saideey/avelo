import uuid

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class VehicleBrand(Base, TimestampMixin):
    __tablename__ = "vehicle_brands"

    name: Mapped[str] = mapped_column(String(100), unique=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    models: Mapped[list["VehicleModel"]] = relationship("VehicleModel", back_populates="brand", lazy="selectin")

    def __repr__(self) -> str:
        return f"<VehicleBrand(id={self.id}, name={self.name})>"


class VehicleModel(Base, TimestampMixin):
    __tablename__ = "vehicle_models"

    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicle_brands.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    year_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    brand: Mapped["VehicleBrand"] = relationship("VehicleBrand", back_populates="models")

    def __repr__(self) -> str:
        return f"<VehicleModel(id={self.id}, name={self.name})>"


class UserVehicle(Base, TimestampMixin):
    __tablename__ = "user_vehicles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicle_brands.id"))
    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicle_models.id"))
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license_plate: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vin_code: Mapped[str | None] = mapped_column(String(17), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mileage: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="vehicles")
    brand: Mapped["VehicleBrand"] = relationship("VehicleBrand", lazy="selectin")
    model: Mapped["VehicleModel"] = relationship("VehicleModel", lazy="selectin")

    def __repr__(self) -> str:
        return f"<UserVehicle(id={self.id}, user_id={self.user_id})>"
