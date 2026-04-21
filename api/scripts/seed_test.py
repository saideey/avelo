"""Seed test data for customer testing."""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User
from app.models.vehicle import UserVehicle, VehicleBrand, VehicleModel
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.review import Review
from app.models.warranty import Warranty, WarrantyStatus
from app.models.cashback import CashbackWallet, CashbackTransaction, CashbackTier, CashbackTransactionType
from app.models.admin import Complaint, ComplaintType, ComplaintStatus
from app.models.notification import Notification
from app.models.workshop import Workshop, WorkshopService
from app.models.favorite import FavoriteWorkshop


async def seed():
    async with AsyncSessionLocal() as db:
        # Check if test data exists
        existing = (await db.execute(
            select(UserVehicle).limit(1)
        )).scalar_one_or_none()
        if existing:
            print("Test data already exists. Skipping.")
            return

        customer = (await db.execute(select(User).where(User.phone == "+998901111111"))).scalar_one()
        partner = (await db.execute(select(User).where(User.phone == "+998902222222"))).scalar_one()
        workshops = (await db.execute(select(Workshop).limit(3))).scalars().all()
        ws1, ws2, ws3 = workshops[0], workshops[1], workshops[2]
        brand = (await db.execute(select(VehicleBrand).limit(1))).scalar_one()
        model = (await db.execute(select(VehicleModel).where(VehicleModel.brand_id == brand.id).limit(1))).scalar_one()

        # Vehicles
        v1 = UserVehicle(id=uuid.uuid4(), user_id=customer.id, brand_id=brand.id, model_id=model.id,
            year=2020, license_plate="01A777AA", color="Oq", mileage=45000)
        v2 = UserVehicle(id=uuid.uuid4(), user_id=customer.id, brand_id=brand.id, model_id=model.id,
            year=2018, license_plate="01B999BB", color="Qora", mileage=82000)
        db.add_all([v1, v2])

        # Bookings
        b1 = Booking(id=uuid.uuid4(), customer_id=customer.id, workshop_id=ws1.id, vehicle_id=v1.id,
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=2), status=BookingStatus.CONFIRMED,
            total_price=150000, notes="Moy almashtirish kerak")
        b2 = Booking(id=uuid.uuid4(), customer_id=customer.id, workshop_id=ws2.id, vehicle_id=v1.id,
            scheduled_at=datetime.now(timezone.utc) - timedelta(days=5), status=BookingStatus.COMPLETED,
            total_price=250000, notes="Tormoz kolodkasi")
        b3 = Booking(id=uuid.uuid4(), customer_id=customer.id, workshop_id=ws3.id, vehicle_id=v2.id,
            scheduled_at=datetime.now(timezone.utc) - timedelta(days=15), status=BookingStatus.COMPLETED,
            total_price=100000)
        db.add_all([b1, b2, b3])
        await db.flush()

        # Status history
        for b, statuses in [(b1, ["pending", "confirmed"]), (b2, ["pending", "confirmed", "in_progress", "completed"]), (b3, ["pending", "confirmed", "in_progress", "completed"])]:
            for i, s in enumerate(statuses):
                prev = statuses[i - 1] if i > 0 else ""
                db.add(BookingStatusHistory(id=uuid.uuid4(), booking_id=b.id, old_status=prev, new_status=s,
                    changed_by=customer.id, note=f"Status: {s}",
                    timestamp=datetime.now(timezone.utc) - timedelta(days=20 - i)))

        # Payments
        db.add(Payment(id=uuid.uuid4(), booking_id=b2.id, amount=250000, method=PaymentMethod.CASH,
            status=PaymentStatus.SUCCESS, paid_at=datetime.now(timezone.utc) - timedelta(days=5)))
        db.add(Payment(id=uuid.uuid4(), booking_id=b3.id, amount=100000, method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCESS, paid_at=datetime.now(timezone.utc) - timedelta(days=15)))

        # Reviews
        db.add(Review(id=uuid.uuid4(), booking_id=b2.id, customer_id=customer.id, workshop_id=ws2.id,
            rating_quality=5, rating_price=4, rating_time=5, rating_communication=4, rating_overall=4.5,
            comment="Juda yaxshi xizmat! Tez va sifatli bajarildi.", is_visible=True))
        db.add(Review(id=uuid.uuid4(), booking_id=b3.id, customer_id=customer.id, workshop_id=ws3.id,
            rating_quality=4, rating_price=5, rating_time=4, rating_communication=5, rating_overall=4.5,
            comment="Narxi yaxshi, xizmat sifatli.", is_visible=True))

        # Warranties
        db.add(Warranty(id=uuid.uuid4(), booking_id=b2.id, customer_id=customer.id, workshop_id=ws2.id,
            duration_months=6, mileage_km=10000, expires_at=datetime.now(timezone.utc) + timedelta(days=150),
            status=WarrantyStatus.ACTIVE))
        db.add(Warranty(id=uuid.uuid4(), booking_id=b3.id, customer_id=customer.id, workshop_id=ws3.id,
            duration_months=3, expires_at=datetime.now(timezone.utc) + timedelta(days=60),
            status=WarrantyStatus.ACTIVE))

        # Cashback
        wallet = CashbackWallet(id=uuid.uuid4(), user_id=customer.id, balance=35000,
            tier=CashbackTier.SILVER, total_earned=85000, total_spent=50000)
        db.add(wallet)
        await db.flush()
        db.add_all([
            CashbackTransaction(id=uuid.uuid4(), wallet_id=wallet.id, amount=5000,
                type=CashbackTransactionType.EARNED, source="booking"),
            CashbackTransaction(id=uuid.uuid4(), wallet_id=wallet.id, amount=7500,
                type=CashbackTransactionType.EARNED, source="booking"),
            CashbackTransaction(id=uuid.uuid4(), wallet_id=wallet.id, amount=3000,
                type=CashbackTransactionType.SPENT, source="discount"),
        ])

        # Notifications
        db.add_all([
            Notification(id=uuid.uuid4(), user_id=customer.id, title="Buyurtma tasdiqlandi",
                body="Premium Avto Servis buyurtmangizni tasdiqladi", type="booking", is_read=False),
            Notification(id=uuid.uuid4(), user_id=customer.id, title="Kafolat eslatmasi",
                body="Tormoz kolodkasi kafolati 5 oydan keyin tugaydi", type="warranty", is_read=True),
            Notification(id=uuid.uuid4(), user_id=customer.id, title="Cashback olindi!",
                body="7 500 som cashback hisobingizga qoshildi", type="cashback", is_read=False),
        ])

        # Favorite workshops
        db.add(FavoriteWorkshop(id=uuid.uuid4(), user_id=customer.id, workshop_id=ws1.id))
        db.add(FavoriteWorkshop(id=uuid.uuid4(), user_id=customer.id, workshop_id=ws3.id))

        # Complaint
        db.add(Complaint(id=uuid.uuid4(), complainant_id=customer.id, workshop_id=ws1.id,
            type=ComplaintType.SERVICE_QUALITY, status=ComplaintStatus.OPEN,
            subject="Xizmat sifati past", description="Moy almashtirilgandan keyin dvigatel shovqin qilmoqda",
            priority=2))

        await db.commit()
        print("=== TEST DATA CREATED ===")
        print("  Vehicles: 2 (Cobalt 2020 Oq, Cobalt 2018 Qora)")
        print("  Bookings: 3 (1 confirmed, 2 completed)")
        print("  Payments: 2 (cash + card)")
        print("  Reviews: 2")
        print("  Warranties: 2 (active)")
        print("  Cashback: 35,000 som (Silver tier)")
        print("  Notifications: 3")
        print("  Favorites: 2 workshops")
        print("  Complaints: 1 (open)")


if __name__ == "__main__":
    asyncio.run(seed())
