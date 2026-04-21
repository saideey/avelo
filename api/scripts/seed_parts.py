import asyncio, uuid
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.parts import Part, PartCategory, PartBrand, PartPrice, PartInventory

async def seed():
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(Part).where(Part.sku == "MOY-001"))).scalar_one_or_none()
        if existing:
            print("Parts already seeded"); return

        # Categories
        cats = {}
        for name, slug in [("Dvigatel moylari", "moylar"), ("Filtrlar", "filtrlar"), ("Tormoz qismlari", "tormoz")]:
            c = PartCategory(id=uuid.uuid4(), name=name, slug=slug)
            db.add(c); cats[slug] = c

        # Brands
        brands = {}
        for name, country in [("Castrol", "Angliya"), ("Mobil", "AQSH"), ("Bosch", "Germaniya"), ("Mann-Filter", "Germaniya"), ("TRW", "Germaniya")]:
            b = PartBrand(id=uuid.uuid4(), name=name, country=country)
            db.add(b); brands[name] = b
        await db.flush()

        parts_data = [
            ("Castrol Edge 5W-30 4L", "MOY-001", "moylar", "Castrol", "To'liq sintetik dvigatel moyi, 4 litr", 185000, 160000, 25),
            ("Castrol Magnatec 10W-40 4L", "MOY-002", "moylar", "Castrol", "Yarim sintetik dvigatel moyi", 140000, 120000, 40),
            ("Mobil 1 5W-40 4L", "MOY-003", "moylar", "Mobil", "Premium sintetik moy", 210000, 185000, 18),
            ("Mobil Super 3000 5W-30 4L", "MOY-004", "moylar", "Mobil", "Sintetik dvigatel moyi", 165000, 145000, 30),
            ("Castrol GTX 15W-40 4L", "MOY-005", "moylar", "Castrol", "Mineral dvigatel moyi", 95000, 80000, 50),
            ("Mann W 712/95 moy filtri", "FLT-001", "filtrlar", "Mann-Filter", "Chevrolet Cobalt/Nexia uchun moy filtri", 35000, 28000, 80),
            ("Mann C 2568 havo filtri", "FLT-002", "filtrlar", "Mann-Filter", "Universal havo filtri", 28000, 22000, 65),
            ("Mann CU 2545 salon filtri", "FLT-003", "filtrlar", "Mann-Filter", "Salon havo filtri", 32000, 26000, 45),
            ("Bosch F 026 402 097 yoqilgi filtri", "FLT-004", "filtrlar", "Bosch", "Dizel yoqilgi filtri", 42000, 35000, 35),
            ("Mann W 610/3 moy filtri", "FLT-005", "filtrlar", "Mann-Filter", "Hyundai/Kia uchun moy filtri", 38000, 30000, 55),
            ("TRW GDB1550 tormoz kolodkasi old", "TRM-001", "tormoz", "TRW", "Chevrolet Cobalt old tormoz kolodkasi", 120000, 100000, 20),
            ("TRW GDB3422 tormoz kolodkasi orqa", "TRM-002", "tormoz", "TRW", "Chevrolet Cobalt orqa tormoz kolodkasi", 95000, 80000, 15),
            ("Bosch tormoz diski old", "TRM-003", "tormoz", "Bosch", "Old tormoz diski, diametr 256mm", 180000, 155000, 10),
            ("TRW tormoz suyuqligi DOT4 1L", "TRM-004", "tormoz", "TRW", "Tormoz suyuqligi DOT4, 1 litr", 45000, 38000, 60),
            ("Bosch tormoz kolodkasi universal", "TRM-005", "tormoz", "Bosch", "Universal old tormoz kolodkasi", 135000, 115000, 25),
        ]

        now = datetime.now(timezone.utc)
        for name, sku, cat_slug, brand_name, desc, price_r, price_w, qty in parts_data:
            p = Part(id=uuid.uuid4(), name=name, sku=sku, category_id=cats[cat_slug].id,
                brand_id=brands[brand_name].id, description=desc, is_active=True)
            db.add(p)
            await db.flush()
            db.add(PartPrice(id=uuid.uuid4(), part_id=p.id, price_retail=price_r, price_wholesale=price_w, valid_from=now))
            db.add(PartInventory(id=uuid.uuid4(), part_id=p.id, quantity_available=qty))

        await db.commit()
        print(f"=== 3 CATEGORIES + 15 PARTS CREATED ===")

if __name__ == "__main__":
    asyncio.run(seed())
