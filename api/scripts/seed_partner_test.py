"""Seed test data for partner testing."""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.workshop import Workshop
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.review import Review
from app.models.warranty import Warranty, WarrantyStatus, WarrantyClaim, WarrantyClaimStatus


async def seed():
    async with AsyncSessionLocal() as db:
        # Check
        existing = (await db.execute(
            select(Review).where(Review.comment.like("%partner test%")).limit(1)
        )).scalar_one_or_none()
        if existing:
            print("Partner test data already exists.")
            return

        partner = (await db.execute(select(User).where(User.phone == "+998902222222"))).scalar_one()
        customer = (await db.execute(select(User).where(User.phone == "+998901111111"))).scalar_one()
        ws = (await db.execute(select(Workshop).where(Workshop.partner_id == partner.id).limit(1))).scalar_one()

        now = datetime.now(timezone.utc)

        # More bookings for partner's workshop
        bookings = []
        for i in range(8):
            status = [BookingStatus.COMPLETED, BookingStatus.COMPLETED, BookingStatus.CONFIRMED,
                      BookingStatus.COMPLETED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED,
                      BookingStatus.PENDING, BookingStatus.COMPLETED][i]
            price = [180000, 250000, 120000, 350000, 200000, 150000, 90000, 280000][i]
            b = Booking(
                id=uuid.uuid4(), customer_id=customer.id, workshop_id=ws.id,
                scheduled_at=now - timedelta(days=30 - i * 4) if i < 6 else now + timedelta(days=i),
                status=status, total_price=price,
                notes=f"Partner test booking #{i+1}",
            )
            db.add(b)
            bookings.append(b)
        await db.flush()

        # Payments for completed bookings
        methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.CARD,
                   PaymentMethod.CASH, PaymentMethod.CASH]
        for i, b in enumerate(bookings[:6]):
            if b.status == BookingStatus.COMPLETED:
                db.add(Payment(
                    id=uuid.uuid4(), booking_id=b.id, amount=b.total_price,
                    method=methods[i % len(methods)], status=PaymentStatus.SUCCESS,
                    paid_at=now - timedelta(days=25 - i * 4),
                ))

        # Reviews for completed bookings
        comments = [
            ("Juda yaxshi usta! Tez bajarildi. (partner test)", 5, 4, 5, 4),
            ("Narxi yaxshi, lekin biroz kechikdi. (partner test)", 4, 5, 3, 4),
            ("Zo'r xizmat, tavsiya qilaman. (partner test)", 5, 5, 5, 5),
            ("Yaxshi, lekin tozaroq bo'lsa yaxshi edi. (partner test)", 3, 4, 4, 3),
        ]
        completed = [b for b in bookings if b.status == BookingStatus.COMPLETED]
        for i, (comment, q, p, t, c) in enumerate(comments):
            if i < len(completed):
                db.add(Review(
                    id=uuid.uuid4(), booking_id=completed[i].id,
                    customer_id=customer.id, workshop_id=ws.id,
                    rating_quality=q, rating_price=p, rating_time=t, rating_communication=c,
                    rating_overall=round((q + p + t + c) / 4, 1),
                    comment=comment, is_visible=True,
                ))

        # Warranty + claim
        w = Warranty(
            id=uuid.uuid4(), booking_id=completed[0].id,
            customer_id=customer.id, workshop_id=ws.id,
            duration_months=6, mileage_km=10000,
            expires_at=now + timedelta(days=120), status=WarrantyStatus.ACTIVE,
        )
        db.add(w)
        await db.flush()

        claim = WarrantyClaim(
            id=uuid.uuid4(), warranty_id=w.id, customer_id=customer.id,
            description="Moy almashtirilganidan keyin dvigateldan shovqin chiqmoqda",
            status=WarrantyClaimStatus.SUBMITTED,
        )
        db.add(claim)

        await db.commit()
        print("=== PARTNER TEST DATA CREATED ===")
        print(f"  Workshop: {ws.name}")
        print(f"  Bookings: 8 (5 completed, 1 confirmed, 1 in_progress, 1 pending)")
        print(f"  Payments: 5")
        print(f"  Reviews: 4")
        print(f"  Warranties: 1 (active)")
        print(f"  Warranty Claims: 1 (submitted)")


if __name__ == "__main__":
    asyncio.run(seed())
