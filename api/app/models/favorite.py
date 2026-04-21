import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class FavoriteWorkshop(Base, TimestampMixin):
    __tablename__ = "favorite_workshops"
    __table_args__ = (
        UniqueConstraint("user_id", "workshop_id", name="uq_favorite_user_workshop"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    workshop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workshops.id"), index=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="noload")
    workshop: Mapped["Workshop"] = relationship("Workshop", lazy="noload")

    def __repr__(self) -> str:
        return f"<FavoriteWorkshop(user_id={self.user_id}, workshop_id={self.workshop_id})>"
