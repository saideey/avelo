import uuid

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ServiceCategory(Base, TimestampMixin):
    __tablename__ = "service_categories"

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_categories.id"), nullable=True
    )
    order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    parent: Mapped["ServiceCategory | None"] = relationship(
        "ServiceCategory", remote_side="ServiceCategory.id", back_populates="children"
    )
    children: Mapped[list["ServiceCategory"]] = relationship(
        "ServiceCategory", back_populates="parent", lazy="selectin"
    )
    workshop_services: Mapped[list["WorkshopService"]] = relationship(
        "WorkshopService", back_populates="category", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ServiceCategory(id={self.id}, name={self.name})>"


class ServiceTag(Base, TimestampMixin):
    __tablename__ = "service_tags"

    name: Mapped[str] = mapped_column(String(100), unique=True)

    def __repr__(self) -> str:
        return f"<ServiceTag(id={self.id}, name={self.name})>"
