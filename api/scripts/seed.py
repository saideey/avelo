"""
AVELO — Seed Data Script
Run: docker compose exec api python scripts/seed.py
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.base import Base
from app.db.session import engine
from app.models.user import User, UserRole
from app.models.service import ServiceCategory
from app.models.vehicle import VehicleBrand, VehicleModel
from app.models.workshop import Workshop, WorkshopService, WorkshopSchedule, WorkshopPhoto
from app.models.subscription import SubscriptionPlan
from app.models.parts import PartCategory, PartBrand
from app.core.security import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # --- Super Admin ---
        admin = User(
            id=uuid.uuid4(),
            phone="+998901234567",
            full_name="Super Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_verified=True,
        )
        db.add(admin)

        # --- Regional Admin (Toshkent) ---
        regional_admin = User(
            id=uuid.uuid4(),
            phone="+998903333333",
            full_name="Toshkent Admin",
            role=UserRole.REGIONAL_ADMIN,
            is_active=True,
            is_verified=True,
            region="Toshkent",
        )
        db.add(regional_admin)

        # --- Moderator ---
        moderator = User(
            id=uuid.uuid4(),
            phone="+998904444444",
            full_name="Moderator Anvar",
            role=UserRole.MODERATOR,
            is_active=True,
            is_verified=True,
        )
        db.add(moderator)

        # --- Test Customer ---
        customer = User(
            id=uuid.uuid4(),
            phone="+998901111111",
            full_name="Test Mijoz",
            role=UserRole.customer,
            is_active=True,
            is_verified=True,
        )
        db.add(customer)

        # --- Test Partner ---
        partner = User(
            id=uuid.uuid4(),
            phone="+998902222222",
            full_name="Test Ustaxona Egasi",
            role=UserRole.partner,
            is_active=True,
            is_verified=True,
        )
        db.add(partner)

        # --- Service Categories ---
        categories_data = [
            ("Moy almashtirish", "moy-almashtirish", 1),
            ("Diagnostika", "diagnostika", 2),
            ("Tormoz tizimi", "tormoz-tizimi", 3),
            ("Shinalar", "shinalar", 4),
            ("Dvigatel ta'miri", "dvigatel-tamiri", 5),
            ("Elektrika", "elektrika", 6),
            ("Kuzov ishlari", "kuzov-ishlari", 7),
            ("Konditsioner", "konditsioner", 8),
            ("Uzatmalar qutisi", "uzatmalar-qutisi", 9),
            ("Osma tizimi", "osma-tizimi", 10),
            ("Chiqindi gaz tizimi", "chiqindi-gaz", 11),
            ("Ichki bezak", "ichki-bezak", 12),
        ]
        categories = {}
        for name, slug, order in categories_data:
            cat = ServiceCategory(id=uuid.uuid4(), name=name, slug=slug, order=order)
            db.add(cat)
            categories[slug] = cat

        # --- Vehicle Brands ---
        brands_data = [
            ("Chevrolet", "🇺🇿", "O'zbekiston"),
            ("Hyundai", "🇰🇷", "Koreya"),
            ("Kia", "🇰🇷", "Koreya"),
            ("Toyota", "🇯🇵", "Yaponiya"),
            ("BMW", "🇩🇪", "Germaniya"),
            ("Mercedes-Benz", "🇩🇪", "Germaniya"),
            ("Volkswagen", "🇩🇪", "Germaniya"),
            ("Daewoo", "🇺🇿", "O'zbekiston"),
        ]
        brands = {}
        for name, logo, country in brands_data:
            brand = VehicleBrand(id=uuid.uuid4(), name=name, logo_url=logo, country=country)
            db.add(brand)
            brands[name] = brand

        # --- Vehicle Models ---
        models_data = [
            ("Chevrolet", [("Cobalt", 2012, None), ("Malibu", 2016, None), ("Tracker", 2020, None), ("Onix", 2022, None), ("Lacetti", 2004, 2013)]),
            ("Hyundai", [("Sonata", 2019, None), ("Tucson", 2020, None), ("Accent", 2017, None), ("Santa Fe", 2018, None)]),
            ("Kia", [("K5", 2020, None), ("Sportage", 2021, None), ("Seltos", 2020, None)]),
            ("Toyota", [("Camry", 2017, None), ("Corolla", 2018, None), ("RAV4", 2019, None)]),
            ("Daewoo", [("Nexia", 1995, 2016), ("Matiz", 1998, 2015), ("Gentra", 2013, 2020)]),
        ]
        for brand_name, models in models_data:
            brand = brands.get(brand_name)
            if brand:
                for model_name, year_from, year_to in models:
                    model = VehicleModel(id=uuid.uuid4(), brand_id=brand.id, name=model_name, year_from=year_from, year_to=year_to)
                    db.add(model)

        # --- Subscription Plans ---
        plans = [
            ("basic", "Asosiy", 0, {"max_photos": 5, "priority_listing": False}, 50),
            ("silver", "Kumush", 299000, {"max_photos": 15, "priority_listing": False, "analytics": True}, 150),
            ("gold", "Oltin", 599000, {"max_photos": 30, "priority_listing": True, "analytics": True, "badge": True}, 500),
            ("platinum", "Platinum", 999000, {"max_photos": 50, "priority_listing": True, "analytics": True, "badge": True, "support": True}, 99999),
        ]
        for tier, name, price, features, max_bookings in plans:
            plan = SubscriptionPlan(id=uuid.uuid4(), tier=tier, name=name, price_monthly=price, features=features, max_bookings_per_month=max_bookings)
            db.add(plan)

        # --- Part Categories ---
        part_cats = [
            ("Dvigatel qismlari", "dvigatel-qismlari"),
            ("Tormoz qismlari", "tormoz-qismlari"),
            ("Filtrlar", "filtrlar"),
            ("Moylar va suyuqliklar", "moylar"),
            ("Elektr qismlari", "elektr-qismlari"),
            ("Osma qismlari", "osma-qismlari"),
            ("Kuzov qismlari", "kuzov-qismlari"),
        ]
        for name, slug in part_cats:
            pc = PartCategory(id=uuid.uuid4(), name=name, slug=slug)
            db.add(pc)

        # --- Part Brands ---
        part_brands = [
            ("Bosch", "Germaniya"), ("Denso", "Yaponiya"), ("NGK", "Yaponiya"),
            ("Mobil", "AQSH"), ("Castrol", "Angliya"), ("Mann-Filter", "Germaniya"),
        ]
        for name, country in part_brands:
            pb = PartBrand(id=uuid.uuid4(), name=name, country=country)
            db.add(pb)

        # --- Sample Workshops ---
        workshops_data = [
            ("Premium Avto Servis", "premium-avto-servis", "Toshkent, Chilonzor tumani, 9-kvartal", "Toshkent", "Chilonzor", 41.2857, 69.2040),
            ("Usta Karim Servis", "usta-karim-servis", "Toshkent, Yakkasaroy tumani, Shota Rustaveli", "Toshkent", "Yakkasaroy", 41.2995, 69.2796),
            ("AutoDoc Service Center", "autodoc-service", "Toshkent, Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li", "Toshkent", "Mirzo Ulug'bek", 41.3280, 69.3340),
            ("Master Auto", "master-auto", "Toshkent, Sergeli tumani, Sergeli ko'chasi", "Toshkent", "Sergeli", 41.2250, 69.2180),
            ("Express Avto Ta'mir", "express-avto-tamir", "Toshkent, Shayxontohur tumani, Navoiy ko'chasi", "Toshkent", "Shayxontohur", 41.3200, 69.2500),
        ]

        for name, slug, address, city, district, lat, lng in workshops_data:
            ws = Workshop(
                id=uuid.uuid4(),
                partner_id=partner.id,
                name=name,
                slug=slug,
                description=f"{name} — professional avto ta'mir xizmatlari. Tajribali ustalar, zamonaviy uskunalar.",
                address=address,
                city=city,
                district=district,
                latitude=lat,
                longitude=lng,
                phone="+998901234567",
                working_hours={"mon": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00", "thu": "09:00-18:00", "fri": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq"},
                is_verified=True,
                is_active=True,
                rating_avg=4.5,
                total_reviews=28,
            )
            db.add(ws)

            # Add services to each workshop
            service_data = [
                ("Moy almashtirish", 80000, 150000, 30),
                ("Kompyuter diagnostikasi", 50000, 100000, 45),
                ("Tormoz nakladkasi almashtirish", 120000, 250000, 60),
                ("Shina almashtirish", 40000, 80000, 20),
                ("Akumlyator tekshirish", 30000, 50000, 15),
            ]
            for svc_name, p_from, p_to, duration in service_data:
                svc = WorkshopService(
                    id=uuid.uuid4(),
                    workshop_id=ws.id,
                    name=svc_name,
                    price_from=p_from,
                    price_to=p_to,
                    duration_minutes=duration,
                    is_available=True,
                )
                db.add(svc)

            # Add schedule
            for day in range(7):
                schedule = WorkshopSchedule(
                    id=uuid.uuid4(),
                    workshop_id=ws.id,
                    day_of_week=day,
                    open_time=datetime.strptime("09:00", "%H:%M").time(),
                    close_time=datetime.strptime("18:00" if day < 5 else "15:00", "%H:%M").time(),
                    is_closed=(day == 6),
                    slot_duration_minutes=30,
                    max_concurrent_bookings=2,
                )
                db.add(schedule)

        # --- Default Platform Settings ---
        from app.models.admin import PlatformSettings
        default_settings = [
            ("commission_percent", "10", "Platforma komissiya foizi", "payment"),
            ("warranty_default_months", "3", "Kafolat standart muddati (oy)", "warranty"),
            ("max_file_size_mb", "10", "Maksimal fayl hajmi (MB)", "general"),
            ("booking_cancel_hours", "2", "Buyurtma bekor qilish muddati (soat)", "booking"),
            ("min_withdrawal_amount", "100000", "Minimum pul yechish summasi", "payment"),
            ("max_daily_bookings", "50", "Kunlik maksimal buyurtmalar soni", "booking"),
            ("otp_expire_minutes", "5", "OTP kodi amal qilish muddati (daqiqa)", "security"),
            ("max_login_attempts", "5", "Maksimal kirish urinishlari", "security"),
        ]
        for key, value, desc, category in default_settings:
            setting = PlatformSettings(id=uuid.uuid4(), key=key, value=value, description=desc, category=category)
            db.add(setting)

        await db.commit()
        print("Seed data created successfully!")
        print(f"  Super Admin:    +998901234567 (OTP: 1234)")
        print(f"  Regional Admin: +998903333333 (OTP: 1234) — Toshkent")
        print(f"  Moderator:      +998904444444 (OTP: 1234)")
        print(f"  Customer:       +998901111111 (OTP: 1234)")
        print(f"  Partner:        +998902222222 (OTP: 1234)")


if __name__ == "__main__":
    asyncio.run(seed())
