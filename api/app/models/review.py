import uuid

from sqlalchemy import Boolean, Float, Integer, Text, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), unique=True, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    workshop_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workshops.id"), index=True)
    rating_quality: Mapped[int] = mapped_column(Integer)  # 1-5
    rating_price: Mapped[int] = mapped_column(Integer)  # 1-5
    rating_time: Mapped[int] = mapped_column(Integer)  # 1-5
    rating_communication: Mapped[int] = mapped_column(Integer)  # 1-5
    rating_overall: Mapped[float] = mapped_column(Float)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    photos: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking", back_populates="review")
    customer: Mapped["User"] = relationship("User", back_populates="reviews")
    workshop: Mapped["Workshop"] = relationship("Workshop", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<Review(id={self.id}, rating_overall={self.rating_overall})>"
