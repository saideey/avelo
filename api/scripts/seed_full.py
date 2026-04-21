"""AVELO — Full comprehensive test data seed."""
import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.vehicle import VehicleBrand, VehicleModel, UserVehicle
from app.models.service import ServiceCategory
from app.models.workshop import Workshop, WorkshopService, WorkshopSchedule, WorkshopPhoto
from app.models.booking import Booking, BookingStatus, BookingStatusHistory
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.review import Review
from app.models.warranty import Warranty, WarrantyStatus, WarrantyClaim, WarrantyClaimStatus
from app.models.cashback import CashbackWallet, CashbackTransaction, CashbackTier, CashbackTransactionType
from app.models.notification import Notification
from app.models.subscription import SubscriptionPlan
from app.models.admin import PlatformSettings, AuditLog, AuditAction, Complaint, ComplaintType, ComplaintStatus
from app.models.favorite import FavoriteWorkshop
from app.models.parts import Part, PartCategory, PartBrand, PartPrice, PartInventory, PartOrder, PartOrderItem, PartOrderStatus


async def seed():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # ============================================================
        # 1. USERS (10 ta)
        # ============================================================
        users_data = [
            ("+998901234567", "Islom Karimov", UserRole.SUPER_ADMIN, None),
            ("+998903333333", "Toshkent Admin", UserRole.REGIONAL_ADMIN, "Toshkent"),
            ("+998903334444", "Xorazm Admin", UserRole.REGIONAL_ADMIN, "Urganch"),
            ("+998904444444", "Moderator Anvar", UserRole.MODERATOR, None),
            ("+998901111111", "Aziz Rahimov", UserRole.CUSTOMER, None),
            ("+998901111222", "Dilshod Toshmatov", UserRole.CUSTOMER, None),
            ("+998901111333", "Nodira Karimova", UserRole.CUSTOMER, None),
            ("+998901111444", "Sardor Umarov", UserRole.CUSTOMER, None),
            ("+998902222222", "Jamshid Ustaxona", UserRole.PARTNER, None),
            ("+998902222333", "Bobur Servis", UserRole.PARTNER, None),
        ]
        users = {}
        for phone, name, role, region in users_data:
            existing = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
            if existing:
                users[phone] = existing
                continue
            u = User(id=uuid.uuid4(), phone=phone, full_name=name, role=role, region=region, is_active=True, is_verified=True)
            db.add(u)
            users[phone] = u
        await db.flush()

        partner1 = users["+998902222222"]
        partner2 = users["+998902222333"]
        customers = [users[f"+998901111{i}"] for i in ["111", "222", "333", "444"]]

        # ============================================================
        # 2. VEHICLE BRANDS & MODELS (7 brend, 20+ model)
        # ============================================================
        brands_data = [
            ("Chevrolet", "AQSH", [
                ("Cobalt", 2012, "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/2020_Chevrolet_Cobalt.jpg/280px-2020_Chevrolet_Cobalt.jpg"),
                ("Malibu", 2016, "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2019_Chevrolet_Malibu_LT%2C_front_3.23.19.jpg/280px-2019_Chevrolet_Malibu_LT%2C_front_3.23.19.jpg"),
                ("Tracker", 2020, "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/2021_Chevrolet_Tracker_1.0T.jpg/280px-2021_Chevrolet_Tracker_1.0T.jpg"),
                ("Onix", 2022, None),
                ("Equinox", 2018, None),
            ]),
            ("Daewoo", "O'zbekiston", [
                ("Nexia", 1995, "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Daewoo_Nexia_II_001.JPG/280px-Daewoo_Nexia_II_001.JPG"),
                ("Matiz", 1998, "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Daewoo_Matiz_front_20080918.jpg/280px-Daewoo_Matiz_front_20080918.jpg"),
                ("Gentra", 2013, None),
                ("Damas", 1996, None),
            ]),
            ("Hyundai", "Koreya", [
                ("Sonata", 2019, "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Hyundai_Sonata_DN8_001.jpg/280px-Hyundai_Sonata_DN8_001.jpg"),
                ("Tucson", 2020, None),
                ("Accent", 2017, None),
                ("Santa Fe", 2018, None),
            ]),
            ("Kia", "Koreya", [("K5", 2020, None), ("Sportage", 2021, None), ("Seltos", 2020, None)]),
            ("Toyota", "Yaponiya", [("Camry", 2017, None), ("Corolla", 2018, None), ("RAV4", 2019, None)]),
            ("BYD", "Xitoy", [("Song Plus", 2023, None), ("Han", 2022, None)]),
            ("Tesla", "AQSH", [("Model 3", 2020, None), ("Model Y", 2021, None)]),
        ]
        all_models = []
        for bname, country, models in brands_data:
            brand = (await db.execute(select(VehicleBrand).where(VehicleBrand.name == bname))).scalar_one_or_none()
            if not brand:
                brand = VehicleBrand(id=uuid.uuid4(), name=bname, country=country)
                db.add(brand)
                await db.flush()
            for mname, year, img in models:
                model = (await db.execute(select(VehicleModel).where(VehicleModel.name == mname, VehicleModel.brand_id == brand.id))).scalar_one_or_none()
                if not model:
                    model = VehicleModel(id=uuid.uuid4(), brand_id=brand.id, name=mname, year_from=year, image_url=img)
                    db.add(model)
                all_models.append((brand, model))
        await db.flush()

        # ============================================================
        # 3. USER VEHICLES (har bir mijozga 1-2 ta)
        # ============================================================
        plates = ["01A777AA", "01B999BB", "01C123CD", "01D456EF", "01E789GH", "01F012IJ", "01G345KL", "01H678MN"]
        colors = ["Oq", "Qora", "Kumush", "Ko'k", "Qizil"]
        vi = 0
        for cust in customers:
            existing_v = (await db.execute(select(UserVehicle).where(UserVehicle.user_id == cust.id).limit(1))).scalar_one_or_none()
            if existing_v:
                continue
            for j in range(random.randint(1, 2)):
                brand, model = random.choice(all_models[:10])
                v = UserVehicle(id=uuid.uuid4(), user_id=cust.id, brand_id=brand.id, model_id=model.id,
                    year=random.randint(2015, 2024), license_plate=plates[vi % len(plates)],
                    color=random.choice(colors), mileage=random.randint(10000, 120000))
                db.add(v)
                vi += 1
        await db.flush()

        # ============================================================
        # 4. SERVICE CATEGORIES (12 ta)
        # ============================================================
        cats_data = [
            ("Moy almashtirish", "moy-almashtirish", 1), ("Diagnostika", "diagnostika", 2),
            ("Tormoz tizimi", "tormoz-tizimi", 3), ("Shinalar", "shinalar", 4),
            ("Dvigatel ta'miri", "dvigatel-tamiri", 5), ("Elektrika", "elektrika", 6),
            ("Kuzov ishlari", "kuzov-ishlari", 7), ("Konditsioner", "konditsioner", 8),
            ("Uzatmalar qutisi", "uzatmalar", 9), ("Osma tizim", "osma-tizim", 10),
            ("Salon tozalash", "salon-tozalash", 11), ("Texnik ko'rik", "texnik-korik", 12),
        ]
        for name, slug, order in cats_data:
            existing = (await db.execute(select(ServiceCategory).where(ServiceCategory.slug == slug))).scalar_one_or_none()
            if not existing:
                db.add(ServiceCategory(id=uuid.uuid4(), name=name, slug=slug, order=order))
        await db.flush()

        # ============================================================
        # 5. WORKSHOPS (15 ta — Toshkent + Xorazm)
        # ============================================================
        workshops_data = [
            ("Premium Avto Servis", "premium-avto-servis", "Toshkent, Chilonzor 9-kvartal", "Toshkent", "Chilonzor", 41.2857, 69.204, partner1.id, 4.8, 52),
            ("Usta Karim Servis", "usta-karim-servis", "Toshkent, Yakkasaroy, Shota Rustaveli", "Toshkent", "Yakkasaroy", 41.2995, 69.2796, partner1.id, 4.6, 38),
            ("AutoDoc Service", "autodoc-service", "Toshkent, Mirzo Ulug'bek tumani", "Toshkent", "Mirzo Ulug'bek", 41.328, 69.334, partner1.id, 4.9, 67),
            ("Master Auto", "master-auto", "Toshkent, Sergeli tumani", "Toshkent", "Sergeli", 41.225, 69.218, partner2.id, 4.3, 25),
            ("Express Avto", "express-avto-tamir", "Toshkent, Shayxontohur tumani", "Toshkent", "Shayxontohur", 41.32, 69.25, partner2.id, 4.5, 31),
            ("Xorazm Avto Servis", "xorazm-avto-servis", "Urganch, Al-Xorazmiy ko'chasi", "Urganch", "Al-Xorazmiy", 41.5513, 60.6317, partner1.id, 4.8, 42),
            ("Usta Bobur Service", "usta-bobur-service", "Urganch, Mustaqillik ko'chasi", "Urganch", "Markaz", 41.5534, 60.6285, partner1.id, 4.6, 35),
            ("Premium Motor Urganch", "premium-motor-urganch", "Urganch, Navoiy ko'chasi", "Urganch", "Navoiy", 41.548, 60.635, partner2.id, 4.9, 58),
            ("Turbo Avto Xorazm", "turbo-avto-xorazm", "Urganch, Amir Temur ko'chasi", "Urganch", "Amir Temur", 41.556, 60.625, partner2.id, 4.3, 21),
            ("Express Ta'mir Urganch", "express-tamir-urganch", "Urganch, Beruniy ko'chasi", "Urganch", "Beruniy", 41.5445, 60.64, partner1.id, 4.7, 38),
            ("Xiva Avto Servis", "xiva-avto-servis", "Xiva, Ichan Qal'a yonida", "Xiva", "Markaz", 41.3783, 60.3639, partner2.id, 4.5, 15),
            ("Samarqand Auto", "samarqand-auto", "Samarqand, Registon yonida", "Samarqand", "Markaz", 39.6542, 66.9597, partner1.id, 4.4, 20),
            ("Buxoro Usta", "buxoro-usta", "Buxoro, Lyabi Hovuz", "Buxoro", "Markaz", 39.7745, 64.4286, partner2.id, 4.2, 12),
            ("Andijon Servis", "andijon-servis", "Andijon, Bobur ko'chasi", "Andijon", "Markaz", 40.7821, 72.3442, partner1.id, 4.6, 28),
            ("Nukus Avto", "nukus-avto", "Nukus, Berdax ko'chasi", "Nukus", "Markaz", 42.4619, 59.6003, partner2.id, 4.1, 8),
        ]
        all_workshops = []
        for name, slug, addr, city, district, lat, lng, pid, rating, reviews in workshops_data:
            ws = (await db.execute(select(Workshop).where(Workshop.slug == slug))).scalar_one_or_none()
            if not ws:
                ws = Workshop(id=uuid.uuid4(), partner_id=pid, name=name, slug=slug, description=f"{name} — professional avto ta'mir xizmatlari.",
                    address=addr, city=city, district=district, latitude=lat, longitude=lng, phone="+998901234567",
                    working_hours={"mon": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00", "thu": "09:00-18:00", "fri": "09:00-18:00", "sat": "09:00-15:00", "sun": "yopiq"},
                    is_verified=True, is_active=True, rating_avg=rating, total_reviews=reviews)
                db.add(ws)
                await db.flush()
                # Services
                for sname, pf, pt, dur in [("Moy almashtirish", 80000, 150000, 30), ("Diagnostika", 50000, 100000, 45),
                    ("Tormoz nakladkasi", 120000, 250000, 60), ("Shina almashtirish", 40000, 80000, 20),
                    ("Konditsioner to'ldirish", 60000, 120000, 40), ("Akumlyator almashtirish", 150000, 300000, 30)]:
                    db.add(WorkshopService(id=uuid.uuid4(), workshop_id=ws.id, name=sname, price_from=pf, price_to=pt, duration_minutes=dur, is_available=True))
                # Schedule
                for day in range(7):
                    db.add(WorkshopSchedule(id=uuid.uuid4(), workshop_id=ws.id, day_of_week=day,
                        open_time=datetime.strptime("09:00", "%H:%M").time(),
                        close_time=datetime.strptime("18:00" if day < 5 else "15:00", "%H:%M").time(),
                        is_closed=(day == 6), slot_duration_minutes=30, max_concurrent_bookings=2))
            all_workshops.append(ws)
        await db.flush()

        # ============================================================
        # 6. BOOKINGS (30 ta — turli statuslarda)
        # ============================================================
        existing_bookings = (await db.execute(select(Booking).limit(1))).scalar_one_or_none()
        bookings_list = []
        if not existing_bookings:
            statuses = [BookingStatus.COMPLETED] * 12 + [BookingStatus.CONFIRMED] * 6 + [BookingStatus.PENDING] * 5 + [BookingStatus.IN_PROGRESS] * 4 + [BookingStatus.CANCELLED] * 3
            for i in range(30):
                cust = random.choice(customers)
                ws = random.choice(all_workshops[:10])
                status = statuses[i % len(statuses)]
                price = random.choice([80000, 120000, 150000, 200000, 250000, 350000, 450000])
                days_ago = random.randint(-3, 45)
                scheduled = now - timedelta(days=days_ago, hours=random.randint(0, 8))
                b = Booking(id=uuid.uuid4(), customer_id=cust.id, workshop_id=ws.id,
                    scheduled_at=scheduled, status=status, total_price=price,
                    notes=random.choice(["Moy almashtirish kerak", "Tormoz tekshirish", "Diagnostika", "Shina almashtirish", "Dvigatel shovqin qiladi", None]))
                db.add(b)
                bookings_list.append(b)
            await db.flush()

        # ============================================================
        # 7. PAYMENTS (tugallangan buyurtmalar uchun)
        # ============================================================
        completed_bookings = [b for b in bookings_list if b.status == BookingStatus.COMPLETED]
        for b in completed_bookings:
            existing_p = (await db.execute(select(Payment).where(Payment.booking_id == b.id))).scalar_one_or_none()
            if not existing_p:
                method = random.choice([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.CARD])
                db.add(Payment(id=uuid.uuid4(), booking_id=b.id, amount=b.total_price, method=method,
                    status=PaymentStatus.SUCCESS, paid_at=b.scheduled_at + timedelta(hours=2)))
        await db.flush()

        # ============================================================
        # 8. REVIEWS (15 ta)
        # ============================================================
        comments = [
            "Juda yaxshi xizmat! Tez va sifatli bajarildi.", "Narxi adolatli, tavsiya qilaman.",
            "Usta professional, lekin biroz kechikdi.", "Zo'r! Mashinam yangiday bo'ldi.",
            "Xizmat sifati yaxshi, tozaroq bo'lsa yaxshi.", "Professional yondashuv, kafolatli ish.",
            "Diagnostika aniq, muammo tez aniqlandi.", "Konditsioner zo'r ishlayapti, rahmat!",
            "Narxi biroz yuqori lekin sifatli.", "Tez bajarildi, vaqtimni tejadi.",
            "Yaxshi usta, lekin navbat ko'p.", "Ajoyib xizmat, yana kelaman.",
            "Hammasi zo'r, 5 yulduz!", "Moy almashtirish tez bajarildi.", "Tormoz kolodkasi sifatli o'rnatildi.",
        ]
        for i, b in enumerate(completed_bookings[:15]):
            existing_r = (await db.execute(select(Review).where(Review.booking_id == b.id))).scalar_one_or_none()
            if not existing_r:
                q, p, t, c = random.randint(3, 5), random.randint(3, 5), random.randint(3, 5), random.randint(3, 5)
                reply = random.choice([None, None, "Rahmat! Sizni yana kutamiz.", "Kechikish uchun uzr, keyingi safar tezroq xizmat ko'rsatamiz."])
                db.add(Review(id=uuid.uuid4(), booking_id=b.id, customer_id=b.customer_id, workshop_id=b.workshop_id,
                    rating_quality=q, rating_price=p, rating_time=t, rating_communication=c,
                    rating_overall=round((q + p + t + c) / 4, 1), comment=comments[i % len(comments)],
                    reply=reply, is_visible=True))
        await db.flush()

        # ============================================================
        # 9. WARRANTIES (8 ta)
        # ============================================================
        for b in completed_bookings[:8]:
            existing_w = (await db.execute(select(Warranty).where(Warranty.booking_id == b.id))).scalar_one_or_none()
            if not existing_w:
                months = random.choice([3, 6, 6, 12])
                db.add(Warranty(id=uuid.uuid4(), booking_id=b.id, customer_id=b.customer_id, workshop_id=b.workshop_id,
                    duration_months=months, mileage_km=random.choice([5000, 10000, None]),
                    expires_at=now + timedelta(days=months * 30), status=WarrantyStatus.ACTIVE))
        await db.flush()

        # ============================================================
        # 10. CASHBACK WALLETS (har bir mijozga)
        # ============================================================
        tiers = [CashbackTier.BRONZE, CashbackTier.SILVER, CashbackTier.GOLD, CashbackTier.SILVER]
        for i, cust in enumerate(customers):
            existing_cw = (await db.execute(select(CashbackWallet).where(CashbackWallet.user_id == cust.id))).scalar_one_or_none()
            if not existing_cw:
                earned = random.randint(20000, 150000)
                spent = random.randint(5000, earned // 2)
                w = CashbackWallet(id=uuid.uuid4(), user_id=cust.id, balance=earned - spent,
                    tier=tiers[i], total_earned=earned, total_spent=spent)
                db.add(w)
                await db.flush()
                for _ in range(random.randint(2, 5)):
                    typ = random.choice([CashbackTransactionType.EARNED, CashbackTransactionType.EARNED, CashbackTransactionType.SPENT])
                    db.add(CashbackTransaction(id=uuid.uuid4(), wallet_id=w.id,
                        amount=random.randint(3000, 15000), type=typ, source="booking"))
        await db.flush()

        # ============================================================
        # 11. PART CATEGORIES & BRANDS
        # ============================================================
        part_cats_data = [("Dvigatel moylari", "moylar"), ("Filtrlar", "filtrlar"), ("Tormoz qismlari", "tormoz"),
            ("Akkumulyatorlar", "akkumulyator"), ("Elektr qismlari", "elektr"), ("Sovutish tizimi", "sovutish")]
        part_cats = {}
        for name, slug in part_cats_data:
            c = (await db.execute(select(PartCategory).where(PartCategory.slug == slug))).scalar_one_or_none()
            if not c:
                c = PartCategory(id=uuid.uuid4(), name=name, slug=slug)
                db.add(c)
            part_cats[slug] = c
        await db.flush()

        part_brands_data = [("Castrol", "Angliya"), ("Mobil", "AQSH"), ("Bosch", "Germaniya"),
            ("Mann-Filter", "Germaniya"), ("TRW", "Germaniya"), ("Varta", "Germaniya"), ("Denso", "Yaponiya")]
        part_brands = {}
        for name, country in part_brands_data:
            b = (await db.execute(select(PartBrand).where(PartBrand.name == name))).scalar_one_or_none()
            if not b:
                b = PartBrand(id=uuid.uuid4(), name=name, country=country)
                db.add(b)
            part_brands[name] = b
        await db.flush()

        # ============================================================
        # 12. PARTS (25 ta)
        # ============================================================
        parts_data = [
            ("Castrol Edge 5W-30 4L", "MOY-001", "moylar", "Castrol", 185000, 160000, 25),
            ("Castrol Magnatec 10W-40 4L", "MOY-002", "moylar", "Castrol", 140000, 120000, 40),
            ("Mobil 1 5W-40 4L", "MOY-003", "moylar", "Mobil", 210000, 185000, 18),
            ("Mobil Super 3000 5W-30", "MOY-004", "moylar", "Mobil", 165000, 145000, 30),
            ("Castrol GTX 15W-40 4L", "MOY-005", "moylar", "Castrol", 95000, 80000, 50),
            ("Mann W 712/95 moy filtri", "FLT-001", "filtrlar", "Mann-Filter", 35000, 28000, 80),
            ("Mann C 2568 havo filtri", "FLT-002", "filtrlar", "Mann-Filter", 28000, 22000, 65),
            ("Mann CU 2545 salon filtri", "FLT-003", "filtrlar", "Mann-Filter", 32000, 26000, 45),
            ("Bosch yoqilgi filtri", "FLT-004", "filtrlar", "Bosch", 42000, 35000, 35),
            ("Mann W 610/3 moy filtri", "FLT-005", "filtrlar", "Mann-Filter", 38000, 30000, 55),
            ("TRW tormoz kolodkasi old", "TRM-001", "tormoz", "TRW", 120000, 100000, 20),
            ("TRW tormoz kolodkasi orqa", "TRM-002", "tormoz", "TRW", 95000, 80000, 15),
            ("Bosch tormoz diski", "TRM-003", "tormoz", "Bosch", 180000, 155000, 10),
            ("TRW tormoz suyuqligi DOT4", "TRM-004", "tormoz", "TRW", 45000, 38000, 60),
            ("Bosch tormoz kolodkasi", "TRM-005", "tormoz", "Bosch", 135000, 115000, 25),
            ("Varta Blue Dynamic 60Ah", "AKK-001", "akkumulyator", "Varta", 450000, 400000, 12),
            ("Bosch S4 005 60Ah", "AKK-002", "akkumulyator", "Bosch", 520000, 470000, 8),
            ("Varta Silver Dynamic 74Ah", "AKK-003", "akkumulyator", "Varta", 650000, 590000, 6),
            ("Denso generator", "ELK-001", "elektr", "Denso", 350000, 310000, 5),
            ("Bosch starter", "ELK-002", "elektr", "Bosch", 420000, 380000, 4),
            ("Denso sham (4 dona)", "ELK-003", "elektr", "Denso", 48000, 40000, 100),
            ("Bosch radiator", "SOV-001", "sovutish", "Bosch", 280000, 250000, 7),
            ("Mann antifreez 5L", "SOV-002", "sovutish", "Mann-Filter", 85000, 72000, 30),
            ("Denso suv nasosi", "SOV-003", "sovutish", "Denso", 190000, 165000, 9),
            ("Bosch termostat", "SOV-004", "sovutish", "Bosch", 65000, 55000, 20),
        ]
        # Link to vehicle models
        cobalt = next((m for _, m in all_models if m.name == "Cobalt"), None)
        nexia = next((m for _, m in all_models if m.name == "Nexia"), None)
        malibu = next((m for _, m in all_models if m.name == "Malibu"), None)
        sonata = next((m for _, m in all_models if m.name == "Sonata"), None)

        for name, sku, cat_slug, brand_name, price_r, price_w, qty in parts_data:
            existing_part = (await db.execute(select(Part).where(Part.sku == sku))).scalar_one_or_none()
            if not existing_part:
                p = Part(id=uuid.uuid4(), name=name, sku=sku, category_id=part_cats[cat_slug].id,
                    brand_id=part_brands[brand_name].id, description=f"{name} — sifatli mahsulot", is_active=True)
                db.add(p)
                await db.flush()
                db.add(PartPrice(id=uuid.uuid4(), part_id=p.id, price_retail=price_r, price_wholesale=price_w, valid_from=now))
                db.add(PartInventory(id=uuid.uuid4(), part_id=p.id, quantity_available=qty))
                # Link to vehicles
                vehicles_for_part = [cobalt, nexia, malibu] if sku.startswith("MOY") or sku.startswith("FLT") else [cobalt, nexia] if sku.startswith("TRM") else [cobalt, malibu, sonata]
                for vm in vehicles_for_part:
                    if vm:
                        try:
                            await db.execute(text("INSERT INTO part_vehicle_models (part_id, vehicle_model_id) VALUES (:pid, :mid)").bindparams(pid=p.id, mid=vm.id))
                        except:
                            pass
        await db.flush()

        # ============================================================
        # 13. PART ORDERS (5 ta)
        # ============================================================
        existing_po = (await db.execute(select(PartOrder).limit(1))).scalar_one_or_none()
        if not existing_po:
            parts_list = (await db.execute(select(Part).where(Part.is_deleted == False).limit(10))).scalars().all()
            for i in range(5):
                ws = random.choice(all_workshops[:5])
                p1, p2 = random.sample(parts_list, 2) if len(parts_list) >= 2 else (parts_list[0], parts_list[0])
                pr1 = (await db.execute(select(PartPrice).where(PartPrice.part_id == p1.id).limit(1))).scalar_one_or_none()
                total = float(pr1.price_retail * 2 if pr1 else 200000)
                status = [PartOrderStatus.PENDING, PartOrderStatus.ADMIN_REVIEWED, PartOrderStatus.PARTNER_CONFIRMED, PartOrderStatus.SHIPPED, PartOrderStatus.DELIVERED][i]
                o = PartOrder(id=uuid.uuid4(), workshop_id=ws.id, customer_id=partner1.id, status=status,
                    delivery_address=ws.address or "Urganch", delivery_fee=20000, total_amount=total + 20000)
                db.add(o)
                await db.flush()
                db.add(PartOrderItem(id=uuid.uuid4(), order_id=o.id, part_id=p1.id, quantity=2, unit_price=float(pr1.price_retail if pr1 else 100000)))
        await db.flush()

        # ============================================================
        # 14. COMPLAINTS (5 ta)
        # ============================================================
        existing_comp = (await db.execute(select(Complaint).limit(1))).scalar_one_or_none()
        if not existing_comp:
            for i in range(5):
                cust = random.choice(customers)
                ws = random.choice(all_workshops[:5])
                db.add(Complaint(id=uuid.uuid4(), complainant_id=cust.id, workshop_id=ws.id,
                    type=random.choice([ComplaintType.SERVICE_QUALITY, ComplaintType.PAYMENT_ISSUE, ComplaintType.WARRANTY_ISSUE]),
                    status=[ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.OPEN, ComplaintStatus.ESCALATED][i],
                    subject=random.choice(["Xizmat sifati past", "To'lov muammosi", "Kafolat bajarilmadi", "Vaqtida bajarilmadi", "Narx o'zgartirildi"]),
                    description="Test shikoyat tavsifi — bu test ma'lumot.", priority=random.randint(1, 4)))
        await db.flush()

        # ============================================================
        # 15. FAVORITES (har bir mijozga 2-3 ta)
        # ============================================================
        for cust in customers:
            existing_fav = (await db.execute(select(FavoriteWorkshop).where(FavoriteWorkshop.user_id == cust.id).limit(1))).scalar_one_or_none()
            if not existing_fav:
                for ws in random.sample(all_workshops[:8], min(3, len(all_workshops))):
                    try:
                        db.add(FavoriteWorkshop(id=uuid.uuid4(), user_id=cust.id, workshop_id=ws.id))
                    except:
                        pass
        await db.flush()

        # ============================================================
        # 16. NOTIFICATIONS (har bir mijozga 3-5 ta)
        # ============================================================
        notif_titles = [
            ("Buyurtma tasdiqlandi", "booking"), ("Kafolat eslatmasi", "warranty"),
            ("Cashback olindi!", "cashback"), ("Yangi aksiya!", "promo"),
            ("Ustaxona sharhi", "review"),
        ]
        for cust in customers:
            existing_n = (await db.execute(select(Notification).where(Notification.user_id == cust.id).limit(1))).scalar_one_or_none()
            if not existing_n:
                for title, ntype in random.sample(notif_titles, 3):
                    db.add(Notification(id=uuid.uuid4(), user_id=cust.id, title=title,
                        body=f"{title} — test bildirishnoma", type=ntype, is_read=random.choice([True, False])))
        await db.flush()

        # ============================================================
        # 17. AUDIT LOGS (10 ta)
        # ============================================================
        existing_al = (await db.execute(select(AuditLog).limit(1))).scalar_one_or_none()
        if not existing_al:
            admin = users["+998901234567"]
            for action, resource, desc in [
                (AuditAction.CREATE, "user", "Yangi foydalanuvchi yaratildi"),
                (AuditAction.VERIFY, "workshop", "Ustaxona tasdiqlandi: Premium Avto"),
                (AuditAction.BLOCK, "user", "Foydalanuvchi bloklandi"),
                (AuditAction.APPROVE, "warranty_claim", "Kafolat talabi tasdiqlandi"),
                (AuditAction.SETTINGS_CHANGE, "settings", "Komissiya 10% ga o'zgartirildi"),
                (AuditAction.REVIEW_DELETE, "review", "Soxta sharh o'chirildi"),
                (AuditAction.CREATE, "admin", "Yangi moderator yaratildi"),
                (AuditAction.UPDATE, "workshop", "Ustaxona manzili yangilandi"),
                (AuditAction.CREATE, "workshop", "Yangi ustaxona yaratildi"),
                (AuditAction.COMPLAINT_RESOLVE, "complaint", "Shikoyat hal qilindi"),
            ]:
                db.add(AuditLog(id=uuid.uuid4(), admin_id=admin.id, action=action,
                    resource_type=resource, resource_id=str(uuid.uuid4())[:8], description=desc, ip_address="192.168.1.1"))
        await db.flush()

        # ============================================================
        # 18. PLATFORM SETTINGS
        # ============================================================
        settings_data = [
            ("commission_percent", "10", "Platforma komissiya foizi", "payment"),
            ("warranty_default_months", "3", "Kafolat muddati (oy)", "warranty"),
            ("max_file_size_mb", "10", "Max fayl hajmi (MB)", "general"),
            ("booking_cancel_hours", "2", "Bekor qilish muddati (soat)", "booking"),
            ("otp_expire_minutes", "5", "OTP muddati (daqiqa)", "security"),
            ("max_daily_bookings", "50", "Kunlik max buyurtmalar", "booking"),
            ("min_withdrawal_amount", "100000", "Min pul yechish", "payment"),
        ]
        for key, val, desc, cat in settings_data:
            existing_s = (await db.execute(select(PlatformSettings).where(PlatformSettings.key == key))).scalar_one_or_none()
            if not existing_s:
                db.add(PlatformSettings(id=uuid.uuid4(), key=key, value=val, description=desc, category=cat))

        # ============================================================
        # 19. SUBSCRIPTION PLANS
        # ============================================================
        for tier, name, price, features, maxb in [
            ("basic", "Asosiy", 0, {"max_photos": 5}, 50),
            ("silver", "Kumush", 299000, {"analytics": True, "max_photos": 15}, 150),
            ("gold", "Oltin", 599000, {"analytics": True, "priority": True, "max_photos": 30}, 500),
            ("platinum", "Platinum", 999000, {"analytics": True, "priority": True, "support": True, "max_photos": 50}, 99999),
        ]:
            existing_sp = (await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.tier == tier))).scalar_one_or_none()
            if not existing_sp:
                db.add(SubscriptionPlan(id=uuid.uuid4(), tier=tier, name=name, price_monthly=price, features=features, max_bookings_per_month=maxb))

        await db.commit()

        print("=" * 60)
        print("  AVELO — TO'LIQ TEST DATA YARATILDI!")
        print("=" * 60)
        print(f"  Foydalanuvchilar:  10 (4 mijoz, 2 partner, 4 admin)")
        print(f"  Moshina brendlari: 7 (25+ model)")
        print(f"  Xizmat kategoriyalari: 12")
        print(f"  Ustaxonalar:       15 (5 shahar)")
        print(f"  Buyurtmalar:       30 (turli statuslarda)")
        print(f"  To'lovlar:         12+")
        print(f"  Sharhlar:          15")
        print(f"  Kafolatlar:        8")
        print(f"  Cashback:          4 hamyon")
        print(f"  Ehtiyot qismlar:   25 (6 kategoriya)")
        print(f"  Qism buyurtmalari: 5")
        print(f"  Shikoyatlar:       5")
        print(f"  Bildirishnomalar:  12+")
        print(f"  Audit loglar:      10")
        print(f"  Sozlamalar:        7")
        print(f"  Obuna tariflari:   4")
        print("=" * 60)
        print("  LOGIN:")
        print(f"  Super Admin:     +998901234567 (OTP: 1234)")
        print(f"  Regional Tosh:   +998903333333 (OTP: 1234)")
        print(f"  Regional Xorazm: +998903334444 (OTP: 1234)")
        print(f"  Moderator:       +998904444444 (OTP: 1234)")
        print(f"  Mijoz Aziz:      +998901111111 (OTP: 1234)")
        print(f"  Mijoz Dilshod:   +998901111222 (OTP: 1234)")
        print(f"  Partner Jamshid: +998902222222 (OTP: 1234)")
        print(f"  Partner Bobur:   +998902222333 (OTP: 1234)")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
