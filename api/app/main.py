import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Collect routers with graceful fallback
_routers: list[tuple[str, object]] = []

_router_names = [
    "auth",
    "users",
    "workshops",
    "bookings",
    "payments",
    "parts",
    "warranty",
    "reviews",
    "notifications",
    "admin",
    "partner",
]

for _name in _router_names:
    try:
        _module = __import__(f"app.routers.{_name}", fromlist=["router"])
        _routers.append((_name, _module.router))
    except (ImportError, AttributeError) as e:
        logger.warning("Router '%s' not available: %s", _name, e)


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Auto-create tables in dev mode
    from app.db.base import Base
    from app.db.session import engine
    import app.models  # noqa: F401 — ensure all models are registered

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    # Auto-seed in dev mode
    if settings.APP_ENV == "development":
        try:
            from app.db.session import AsyncSessionLocal
            from sqlalchemy import select as sa_select
            from app.models.user import User
            async with AsyncSessionLocal() as db:
                result = await db.execute(sa_select(User).limit(1))
                if not result.scalar_one_or_none():
                    await _run_seed(db)
                    print(">>> SEED DATA CREATED SUCCESSFULLY <<<")
                else:
                    print(">>> Database already has data, skipping seed <<<")
        except Exception as e:
            import traceback
            print(f">>> AUTO-SEED FAILED: {e}")
            traceback.print_exc()

    logger.info(
        "%s v%s starting up (env=%s)",
        settings.APP_NAME,
        application.version,
        settings.APP_ENV,
    )
    yield
    logger.info("%s shutting down", settings.APP_NAME)


async def _run_seed(db):
    """Create initial seed data."""
    import uuid
    from datetime import datetime, timezone
    from app.models.user import User, UserRole
    from app.models.service import ServiceCategory
    from app.models.vehicle import VehicleBrand, VehicleModel
    from app.models.workshop import Workshop, WorkshopService, WorkshopSchedule
    from app.models.subscription import SubscriptionPlan
    from app.models.admin import PlatformSettings

    # --- Users ---
    admin = User(id=uuid.uuid4(), phone="+998901234567", full_name="Super Admin", role=UserRole.SUPER_ADMIN, is_active=True, is_verified=True)
    regional = User(id=uuid.uuid4(), phone="+998903333333", full_name="Toshkent Admin", role=UserRole.REGIONAL_ADMIN, is_active=True, is_verified=True, region="Toshkent")
    moderator = User(id=uuid.uuid4(), phone="+998904444444", full_name="Moderator Anvar", role=UserRole.MODERATOR, is_active=True, is_verified=True)
    customer = User(id=uuid.uuid4(), phone="+998901111111", full_name="Test Mijoz", role=UserRole.CUSTOMER, is_active=True, is_verified=True)
    partner = User(id=uuid.uuid4(), phone="+998902222222", full_name="Test Ustaxona Egasi", role=UserRole.PARTNER, is_active=True, is_verified=True)
    db.add_all([admin, regional, moderator, customer, partner])

    # --- Service Categories ---
    cats = [("Moy almashtirish","moy-almashtirish",1),("Diagnostika","diagnostika",2),("Tormoz tizimi","tormoz-tizimi",3),("Shinalar","shinalar",4),("Dvigatel ta'miri","dvigatel-tamiri",5),("Elektrika","elektrika",6),("Kuzov ishlari","kuzov-ishlari",7),("Konditsioner","konditsioner",8)]
    for name, slug, order in cats:
        db.add(ServiceCategory(id=uuid.uuid4(), name=name, slug=slug, order=order))

    # --- Vehicle Brands & Models ---
    brands = {}
    for bname, country in [("Chevrolet","O'zbekiston"),("Hyundai","Koreya"),("Kia","Koreya"),("Toyota","Yaponiya"),("Daewoo","O'zbekiston")]:
        b = VehicleBrand(id=uuid.uuid4(), name=bname, country=country)
        db.add(b)
        brands[bname] = b
    models_data = [("Chevrolet",[("Cobalt",2012),("Malibu",2016),("Tracker",2020)]),("Daewoo",[("Nexia",1995),("Matiz",1998),("Gentra",2013)])]
    for bname, models in models_data:
        brand = brands.get(bname)
        if brand:
            for mname, yr in models:
                db.add(VehicleModel(id=uuid.uuid4(), brand_id=brand.id, name=mname, year_from=yr))

    # --- Workshops ---
    workshops_data = [
        ("Premium Avto Servis","premium-avto-servis","Toshkent, Chilonzor 9-kvartal","Toshkent","Chilonzor",41.2857,69.204),
        ("Usta Karim Servis","usta-karim-servis","Toshkent, Yakkasaroy, Shota Rustaveli","Toshkent","Yakkasaroy",41.2995,69.2796),
        ("AutoDoc Service","autodoc-service","Toshkent, Mirzo Ulug'bek tumani","Toshkent","Mirzo Ulug'bek",41.328,69.334),
        ("Master Auto","master-auto","Toshkent, Sergeli tumani","Toshkent","Sergeli",41.225,69.218),
        ("Express Avto","express-avto-tamir","Toshkent, Shayxontohur tumani","Toshkent","Shayxontohur",41.32,69.25),
    ]
    for name, slug, address, city, district, lat, lng in workshops_data:
        ws = Workshop(id=uuid.uuid4(), partner_id=partner.id, name=name, slug=slug,
            description=f"{name} — professional avto ta'mir xizmatlari.",
            address=address, city=city, district=district, latitude=lat, longitude=lng,
            phone="+998901234567", working_hours={"mon":"09:00-18:00","tue":"09:00-18:00","wed":"09:00-18:00","thu":"09:00-18:00","fri":"09:00-18:00","sat":"09:00-15:00","sun":"yopiq"},
            is_verified=True, is_active=True, rating_avg=4.5, total_reviews=28)
        db.add(ws)
        for sname, pf, pt, dur in [("Moy almashtirish",80000,150000,30),("Diagnostika",50000,100000,45),("Tormoz nakladkasi",120000,250000,60)]:
            db.add(WorkshopService(id=uuid.uuid4(), workshop_id=ws.id, name=sname, price_from=pf, price_to=pt, duration_minutes=dur, is_available=True))
        for day in range(7):
            db.add(WorkshopSchedule(id=uuid.uuid4(), workshop_id=ws.id, day_of_week=day,
                open_time=datetime.strptime("09:00","%H:%M").time(),
                close_time=datetime.strptime("18:00" if day<5 else "15:00","%H:%M").time(),
                is_closed=(day==6), slot_duration_minutes=30, max_concurrent_bookings=2))

    # --- Platform Settings ---
    for key, val, desc, cat in [
        ("commission_percent","10","Platforma komissiya foizi","payment"),
        ("warranty_default_months","3","Kafolat muddati (oy)","warranty"),
        ("max_file_size_mb","10","Max fayl hajmi (MB)","general"),
        ("booking_cancel_hours","2","Bekor qilish muddati (soat)","booking"),
        ("otp_expire_minutes","5","OTP muddati (daqiqa)","security"),
    ]:
        db.add(PlatformSettings(id=uuid.uuid4(), key=key, value=val, description=desc, category=cat))

    # --- Subscription Plans ---
    for tier, name, price, features, maxb in [("basic","Asosiy",0,{},50),("silver","Kumush",299000,{"analytics":True},150),("gold","Oltin",599000,{"analytics":True,"priority":True},500)]:
        db.add(SubscriptionPlan(id=uuid.uuid4(), tier=tier, name=name, price_monthly=price, features=features, max_bookings_per_month=maxb))

    await db.commit()


app = FastAPI(
    title=settings.APP_NAME,
    description="AVELO — find trusted car-repair workshops nearby",
    version="0.1.0",
    lifespan=lifespan,
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# --- Routers ---
for name, router in _routers:
    app.include_router(router, prefix="/api/v1")
    logger.info("Registered router: %s", name)


# --- Static files (uploads) ---
import os
os.makedirs("/app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

# --- Health / Root ---
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy"}


@app.get("/", tags=["root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": app.version,
        "environment": settings.APP_ENV,
        "docs": "/docs",
    }
