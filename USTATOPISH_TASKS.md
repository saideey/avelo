# UstaTopish — To'liq Loyiha Spesifikatsiyasi
> Outsource Ustaxona Platformasi | Python + React + PostgreSQL + Docker

---

## Loyiha Arxitekturasi

```
ustatopish/
├── api/                          # FastAPI backend
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── dependencies.py
│   │   │   └── exceptions.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── migrations/       # Alembic migrations
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── routers/              # API route handlers
│   │   ├── services/             # Business logic layer
│   │   ├── tasks/                # Celery async tasks
│   │   └── utils/
│   ├── tests/
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── Dockerfile
│
├── frontend/                     # React + Vite + TypeScript
│   ├── src/
│   │   ├── app/                  # Redux store, router
│   │   ├── features/             # Feature-based modules
│   │   ├── shared/               # Shared components, hooks, utils
│   │   ├── pages/
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## Port Taqsimoti

| Servis | Port | Tavsif |
|---|---|---|
| Frontend (Vite dev) | **3741** | React dev server |
| API (FastAPI) | **8741** | REST API + WebSocket |
| PostgreSQL | **5741** | Asosiy ma'lumotlar bazasi |
| Redis | **6741** | Cache + Celery broker |
| Celery Flower | **5542** | Task monitoring UI |
| PgAdmin | **5543** | DB admin UI (dev only) |

---

## Docker Compose Konfiguratsiyasi

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    container_name: ustatopish_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5741:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ustatopish_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6741:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: development
    container_name: ustatopish_api
    restart: unless-stopped
    env_file: .env
    ports:
      - "8741:8000"
    volumes:
      - ./api:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  celery_worker:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: development
    container_name: ustatopish_celery
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./api:/app
    depends_on:
      - redis
      - db
    command: celery -A app.tasks.worker worker --loglevel=info -Q default,notifications,payments,warranty

  celery_beat:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: development
    container_name: ustatopish_beat
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./api:/app
    depends_on:
      - redis
    command: celery -A app.tasks.worker beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

  flower:
    image: mher/flower:2.0
    container_name: ustatopish_flower
    restart: unless-stopped
    environment:
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - FLOWER_BASIC_AUTH=${FLOWER_USER}:${FLOWER_PASSWORD}
    ports:
      - "5542:5555"
    depends_on:
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    container_name: ustatopish_frontend
    restart: unless-stopped
    env_file: .env
    ports:
      - "3741:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - api

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: ustatopish_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "5543:80"
    depends_on:
      - db
    profiles:
      - tools

volumes:
  postgres_data:
  redis_data:
```

---

## Environment Variables (`.env.example`)

```env
# App
APP_NAME=UstaTopish
APP_ENV=development
SECRET_KEY=change-this-to-a-very-long-random-secret-key-in-production
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1

# PostgreSQL
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=ustatopish
POSTGRES_USER=ustatopish_user
POSTGRES_PASSWORD=strong_password_here
DATABASE_URL=postgresql+asyncpg://ustatopish_user:strong_password_here@db:5432/ustatopish

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here
REDIS_URL=redis://:redis_password_here@redis:6379/0

# JWT
JWT_SECRET_KEY=another-long-random-secret-for-jwt
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# SMS (Eskiz.uz)
ESKIZ_EMAIL=your@email.com
ESKIZ_PASSWORD=eskiz_password
ESKIZ_FROM=4546

# Payment Gateways
CLICK_SERVICE_ID=
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=
CLICK_MERCHANT_USER_ID=

PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=
PAYME_TEST_KEY=

UZUM_MERCHANT_ID=
UZUM_SECRET_KEY=
UZUM_CALLBACK_URL=https://yourdomain.com/api/v1/payments/uzum/callback

# Maps
YANDEX_MAPS_API_KEY=
GOOGLE_MAPS_API_KEY=

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# File Storage (S3-compatible)
S3_ENDPOINT_URL=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET_NAME=ustatopish-media
S3_REGION=us-east-1

# Celery
CELERY_BROKER_URL=redis://:redis_password_here@redis:6379/0
CELERY_RESULT_BACKEND=redis://:redis_password_here@redis:6379/1

# Flower
FLOWER_USER=admin
FLOWER_PASSWORD=flower_password

# PgAdmin
PGADMIN_EMAIL=admin@ustatopish.uz
PGADMIN_PASSWORD=pgadmin_password

# Frontend
VITE_API_URL=http://localhost:8741/api/v1
VITE_WS_URL=ws://localhost:8741/ws
VITE_YANDEX_MAPS_KEY=
```

---

## API Backend — Qilinadigan Ishlar

### 1. Loyiha Asosi (Foundation)

#### 1.1 FastAPI App Sozlash
- [ ] `pyproject.toml` — barcha dependencylarni aniqlash:
  - `fastapi[all]`, `uvicorn[standard]`, `pydantic[email]`, `pydantic-settings`
  - `sqlalchemy[asyncio]`, `asyncpg`, `alembic`
  - `redis[hiredis]`, `celery[redis]`, `flower`
  - `python-jose[cryptography]`, `passlib[bcrypt]`
  - `httpx`, `boto3`, `python-multipart`
  - `pytest`, `pytest-asyncio`, `httpx` (test uchun)
- [ ] `app/main.py` — FastAPI instance, middleware, router yig'ish
  - CORS middleware (frontend origin)
  - GZip middleware
  - Request ID middleware (har so'rov uchun unique ID)
  - Structured logging middleware
- [ ] `app/core/config.py` — Pydantic Settings, `.env` o'qish
- [ ] `app/core/security.py` — JWT yaratish, tekshirish, hash
- [ ] `app/core/exceptions.py` — Custom exception handlers, HTTP error response format
- [ ] `app/core/dependencies.py` — `get_db`, `get_current_user`, `get_current_active_user`, permission checkers

#### 1.2 Ma'lumotlar Bazasi
- [ ] `app/db/base.py` — SQLAlchemy async engine, Base model
- [ ] `app/db/session.py` — AsyncSession factory, dependency
- [ ] `alembic.ini` + `alembic/env.py` — async migration setup
- [ ] Base model mixin: `id (UUID)`, `created_at`, `updated_at`, `is_deleted` (soft delete)

---

### 2. Database Models (SQLAlchemy)

#### 2.1 `models/user.py`
- [ ] `User` — telefon, email, full_name, role (ENUM: customer/partner/mechanic/admin), is_active, is_verified, firebase_token, avatar_url
- [ ] `OTPCode` — user_id, code, expires_at, is_used, purpose (login/register/reset)
- [ ] `RefreshToken` — user_id, token_hash, expires_at, device_info

#### 2.2 `models/vehicle.py`
- [ ] `VehicleBrand` — name, logo_url, country
- [ ] `VehicleModel` — brand_id, name, year_from, year_to
- [ ] `UserVehicle` — user_id, brand_id, model_id, year, license_plate, vin_code, color, mileage

#### 2.3 `models/workshop.py`
- [ ] `Workshop` — partner_id (User FK), name, slug, description, address, city, district, latitude, longitude, phone, working_hours (JSONB), is_verified, is_active, subscription_tier (ENUM: basic/silver/gold/platinum), rating_avg, total_reviews
- [ ] `WorkshopPhoto` — workshop_id, url, order, is_main
- [ ] `WorkshopService` — workshop_id, category_id, name, price_from, price_to, duration_minutes, is_available
- [ ] `WorkshopCertificate` — workshop_id, title, issued_by, issue_date, image_url
- [ ] `WorkshopSchedule` — workshop_id, day_of_week (0-6), open_time, close_time, is_closed, slot_duration_minutes, max_concurrent_bookings

#### 2.4 `models/service.py`
- [ ] `ServiceCategory` — name, slug, icon_url, parent_id (self-ref, nested cats), order
- [ ] `ServiceTag` — name (tezkor, uyga, diagnostika, express...)

#### 2.5 `models/booking.py`
- [ ] `TimeSlot` — workshop_id, date, time, capacity, booked_count, is_available
- [ ] `Booking` — customer_id, workshop_id, vehicle_id, service_ids (ARRAY), scheduled_at, status (ENUM: pending/confirmed/in_progress/completed/cancelled/no_show), total_price, notes, mechanic_notes, is_mobile (uyga boradimi), address (mobile uchun), latitude, longitude
- [ ] `BookingStatusHistory` — booking_id, old_status, new_status, changed_by, note, timestamp

#### 2.6 `models/payment.py`
- [ ] `Payment` — booking_id, amount, method (ENUM: click/payme/uzum_nasiya/alif/card/cash), status (ENUM: pending/processing/success/failed/refunded), gateway_txn_id, gateway_response (JSONB), paid_at
- [ ] `Escrow` — payment_id, workshop_id, amount, status (ENUM: held/released/refunded), released_at
- [ ] `Payout` — workshop_id, amount, status, bank_account, processed_at

#### 2.7 `models/review.py`
- [ ] `Review` — booking_id, customer_id, workshop_id, rating_quality (1-5), rating_price (1-5), rating_time (1-5), rating_communication (1-5), rating_overall (1-5), comment, photos (ARRAY), reply (ustaxona javobi), is_visible
- [ ] Trigger yoki service: Workshop `rating_avg` ni avtomatik yangilash

#### 2.8 `models/warranty.py`
- [ ] `Warranty` — booking_id, service_id, customer_id, workshop_id, duration_months, mileage_km, expires_at, status (ENUM: active/claimed/expired/void)
- [ ] `WarrantyClaim` — warranty_id, customer_id, description, photos (ARRAY), status (ENUM: submitted/reviewing/approved/rejected/resolved), admin_notes, resolved_at
- [ ] `WarrantyPartDelivery` — claim_id, part_id, quantity, delivery_status, delivered_at

#### 2.9 `models/parts.py` (Ehtiyot Qismlar)
- [ ] `PartCategory` — name, slug, parent_id, icon_url
- [ ] `PartBrand` — name, country, logo_url
- [ ] `Part` — sku, name, category_id, brand_id, description, specifications (JSONB), compatible_vehicles (JSONB — marka/model/yil), images (ARRAY), weight_kg, is_active
- [ ] `PartInventory` — part_id, warehouse_id, quantity_available, quantity_reserved, quantity_in_transit, last_updated
- [ ] `PartPrice` — part_id, price_b2b, price_b2c, price_premium, valid_from, valid_to
- [ ] `PartOrder` — workshop_id (nullable), customer_id (nullable), status (ENUM), items (relationship), delivery_address, delivery_type (express/standard/scheduled), delivery_fee, total_amount, estimated_delivery
- [ ] `PartOrderItem` — order_id, part_id, quantity, unit_price, warranty_months
- [ ] `Warehouse` — name, city, address, latitude, longitude, is_active

#### 2.10 `models/cashback.py`
- [ ] `CashbackWallet` — user_id, balance, tier (ENUM: bronze/silver/gold/platinum), total_earned, total_spent
- [ ] `CashbackTransaction` — wallet_id, amount, type (ENUM: earned/spent/expired/transferred), source (booking/referral/birthday), reference_id, expires_at

#### 2.11 `models/notification.py`
- [ ] `Notification` — user_id, title, body, type (booking/payment/warranty/promo), data (JSONB), is_read, sent_via (push/sms/both)
- [ ] `NotificationTemplate` — key, title_uz, title_ru, body_uz, body_ru

#### 2.12 `models/subscription.py`
- [ ] `SubscriptionPlan` — tier, name, price_monthly, features (JSONB), max_bookings_per_month
- [ ] `WorkshopSubscription` — workshop_id, plan_id, starts_at, expires_at, is_active, auto_renew

---

### 3. Pydantic Schemas

#### 3.1 `schemas/auth.py`
- [ ] `PhoneLoginRequest` — telefon kiritish
- [ ] `OTPVerifyRequest` — telefon + OTP kodi
- [ ] `TokenResponse` — access_token, refresh_token, token_type, expires_in
- [ ] `RefreshTokenRequest`
- [ ] `UserRegisterRequest` — telefon, full_name, role

#### 3.2 `schemas/user.py`
- [ ] `UserCreate`, `UserUpdate`, `UserResponse`, `UserPublicResponse`
- [ ] `VehicleCreate`, `VehicleUpdate`, `VehicleResponse`

#### 3.3 `schemas/workshop.py`
- [ ] `WorkshopCreate`, `WorkshopUpdate`, `WorkshopResponse`, `WorkshopListItem`
- [ ] `WorkshopServiceCreate`, `WorkshopServiceResponse`
- [ ] `WorkshopScheduleCreate`, `WorkshopScheduleResponse`
- [ ] `NearbyWorkshopFilter` — latitude, longitude, radius_km, service_category, rating_min, has_warranty, has_mobile_service, available_date
- [ ] `WorkshopDetailResponse` — to'liq profil (xizmatlar, reyting, sertifikatlar, bo'sh slotlar)

#### 3.4 `schemas/booking.py`
- [ ] `BookingCreate` — workshop_id, vehicle_id, service_ids, scheduled_at, is_mobile, address
- [ ] `BookingUpdate`, `BookingStatusUpdate`
- [ ] `BookingResponse`, `BookingListItem`
- [ ] `TimeSlotQuery` — workshop_id, date, service_ids
- [ ] `AvailableSlotsResponse`

#### 3.5 `schemas/payment.py`
- [ ] `PaymentInitRequest` — booking_id, method, return_url
- [ ] `PaymentInitResponse` — payment_url, payment_id, expires_at
- [ ] `ClickCallbackData`, `PaymeCallbackData`, `UzumCallbackData`

#### 3.6 `schemas/parts.py`
- [ ] `PartSearchFilter` — category, brand, compatible_vehicle_id, q (search), price_min, price_max
- [ ] `PartResponse`, `PartDetailResponse`
- [ ] `PartOrderCreate`, `PartOrderItemCreate`, `PartOrderResponse`
- [ ] `CartItem`, `CartResponse`

#### 3.7 `schemas/review.py`
- [ ] `ReviewCreate` — booking_id, ratings (object), comment, photos
- [ ] `ReviewResponse`, `ReviewListResponse`
- [ ] `ReviewReplyCreate`

#### 3.8 `schemas/warranty.py`
- [ ] `WarrantyResponse`
- [ ] `WarrantyClaimCreate` — warranty_id, description, photos
- [ ] `WarrantyClaimResponse`, `WarrantyClaimUpdate`

#### 3.9 `schemas/cashback.py`
- [ ] `CashbackWalletResponse`
- [ ] `CashbackTransactionResponse`
- [ ] `CashbackTransferRequest` — to_user_phone, amount

#### 3.10 Umumiy schemas
- [ ] `PaginatedResponse[T]` — generic, items, total, page, size, pages
- [ ] `ErrorResponse` — detail, code, field_errors
- [ ] `SuccessResponse` — message, data

---

### 4. API Routers

#### 4.1 `routers/auth.py` — prefix: `/api/v1/auth`
- [ ] `POST /send-otp` — telefon raqamga OTP yuborish (Eskiz.uz)
- [ ] `POST /verify-otp` — OTP tasdiqlash, JWT qaytarish
- [ ] `POST /refresh` — access token yangilash
- [ ] `POST /logout` — refresh token bekor qilish
- [ ] `GET /me` — joriy foydalanuvchi ma'lumotlari

#### 4.2 `routers/users.py` — prefix: `/api/v1/users`
- [ ] `GET /me` — profil
- [ ] `PATCH /me` — profilni yangilash
- [ ] `POST /me/avatar` — rasm yuklash (S3)
- [ ] `GET /me/vehicles` — mashinalar ro'yxati
- [ ] `POST /me/vehicles` — mashina qo'shish
- [ ] `PUT /me/vehicles/{id}` — mashina yangilash
- [ ] `DELETE /me/vehicles/{id}` — mashina o'chirish
- [ ] `GET /me/bookings` — buyurtmalar tarixi (paginated)
- [ ] `GET /me/warranties` — faol kafolatlar
- [ ] `GET /me/cashback` — cashback wallet + tarix
- [ ] `POST /me/cashback/transfer` — do'stga cashback o'tkazish

#### 4.3 `routers/workshops.py` — prefix: `/api/v1/workshops`
- [ ] `GET /` — ustaxonalar ro'yxati (filter, paginated)
- [ ] `GET /nearby` — joylashuvga qarab (lat/lng/radius)
- [ ] `GET /{slug}` — ustaxona detail sahifasi
- [ ] `GET /{id}/slots` — bo'sh slotlar (sana bo'yicha)
- [ ] `GET /{id}/reviews` — sharhlar (paginated)
- [ ] `GET /{id}/services` — xizmatlar ro'yxati
- [ ] `POST /` — ustaxona yaratish (partner only)
- [ ] `PATCH /{id}` — ustaxonani yangilash (owner only)
- [ ] `POST /{id}/photos` — rasm qo'shish
- [ ] `DELETE /{id}/photos/{photo_id}`
- [ ] `PUT /{id}/schedule` — ish grafigi yangilash
- [ ] `POST /{id}/services` — xizmat qo'shish
- [ ] `PATCH /{id}/services/{service_id}`

#### 4.4 `routers/bookings.py` — prefix: `/api/v1/bookings`
- [ ] `POST /` — yangi buyurtma yaratish
- [ ] `GET /{id}` — buyurtma detail
- [ ] `PATCH /{id}/cancel` — bekor qilish
- [ ] `PATCH /{id}/confirm` — ustaxona tasdiqlashi
- [ ] `PATCH /{id}/start` — ish boshlanishi
- [ ] `PATCH /{id}/complete` — ish tugashi
- [ ] `GET /workshop/{workshop_id}` — ustaxona buyurtmalari (partner)
- [ ] `POST /{id}/review` — reyting qoldirish

#### 4.5 `routers/payments.py` — prefix: `/api/v1/payments`
- [ ] `POST /initiate` — to'lovni boshlash
- [ ] `POST /click/callback` — Click webhook
- [ ] `POST /click/check` — Click check transaction
- [ ] `POST /payme/` — Payme JSON-RPC endpoint
- [ ] `POST /uzum/callback` — UZUM Nasiya webhook
- [ ] `GET /status/{payment_id}` — to'lov holati
- [ ] `POST /refund/{payment_id}` — qaytarib berish (admin)

#### 4.6 `routers/parts.py` — prefix: `/api/v1/parts`
- [ ] `GET /categories` — kategoriyalar daraxti
- [ ] `GET /` — qismlar ro'yxati (filter, search, paginated)
- [ ] `GET /{id}` — qism detail
- [ ] `GET /compatible/{vehicle_id}` — mashina uchun mos qismlar
- [ ] `POST /orders` — qism buyurtma berish (B2B va B2C)
- [ ] `GET /orders` — buyurtmalar tarixi
- [ ] `GET /orders/{id}` — buyurtma detail
- [ ] `PATCH /orders/{id}/cancel`
- [ ] `GET /cart` — savatcha
- [ ] `POST /cart/items` — savatchaga qo'shish
- [ ] `DELETE /cart/items/{id}`
- [ ] `GET /workshop/catalog` — ustaxona B2B katalogi
- [ ] `POST /workshop/bulk-order` — ommaviy buyurtma

#### 4.7 `routers/warranty.py` — prefix: `/api/v1/warranties`
- [ ] `GET /` — foydalanuvchi kafolatlari
- [ ] `GET /{id}` — kafolat detail
- [ ] `POST /{id}/claim` — kafolat talabi yuborish
- [ ] `GET /claims` — talablar ro'yxati
- [ ] `PATCH /claims/{id}` — talabni yangilash (admin)
- [ ] `GET /claims/{id}/delivery` — qism yetkazib berish holati

#### 4.8 `routers/reviews.py` — prefix: `/api/v1/reviews`
- [ ] `POST /` — sharh qoldirish
- [ ] `GET /workshop/{workshop_id}` — ustaxona sharhlari
- [ ] `POST /{id}/reply` — ustaxona javobi

#### 4.9 `routers/notifications.py` — prefix: `/api/v1/notifications`
- [ ] `GET /` — bildirishnomalar (paginated)
- [ ] `PATCH /{id}/read` — o'qildi
- [ ] `PATCH /read-all` — hammasini o'qildi
- [ ] `POST /device-token` — Firebase token saqlash
- [ ] `DELETE /device-token` — tokenni o'chirish

#### 4.10 `routers/admin.py` — prefix: `/api/v1/admin` (admin only)
- [ ] `GET /users` — barcha foydalanuvchilar
- [ ] `PATCH /users/{id}/block`
- [ ] `GET /workshops` — barcha ustaxonalar
- [ ] `PATCH /workshops/{id}/verify`
- [ ] `PATCH /workshops/{id}/block`
- [ ] `GET /bookings` — barcha buyurtmalar
- [ ] `GET /payments` — barcha to'lovlar
- [ ] `GET /warranty-claims` — kafolat talablari
- [ ] `PATCH /warranty-claims/{id}/approve`
- [ ] `PATCH /warranty-claims/{id}/reject`
- [ ] `GET /analytics/overview` — dashboard statistikasi
- [ ] `GET /analytics/revenue` — daromad grafiklar
- [ ] `GET /parts` — CRUD
- [ ] `POST /parts`
- [ ] `PUT /parts/{id}`

#### 4.11 `routers/partner.py` — prefix: `/api/v1/partner` (partner only)
- [ ] `GET /dashboard` — bugungi statistika
- [ ] `GET /analytics` — haftalik/oylik daromad
- [ ] `GET /bookings` — buyurtmalar boshqaruvi
- [ ] `GET /parts/orders` — qism buyurtmalar
- [ ] `GET /warranty-claims` — ustaxonaga tegishli kafolat talablari
- [ ] `GET /payouts` — to'lovlar tarixi
- [ ] `POST /subscription/upgrade`

#### 4.12 WebSocket `routers/ws.py`
- [ ] `WS /ws/chat/{booking_id}` — real-time chat (usta ↔ mijoz)
- [ ] `WS /ws/tracking/{order_id}` — qism yetkazib berish kuzatuvi
- [ ] `WS /ws/notifications/{user_id}` — real-time push

---

### 5. Services (Business Logic)

#### 5.1 `services/auth_service.py`
- [ ] OTP generatsiya, tekshirish, muddati
- [ ] JWT access/refresh token yaratish
- [ ] Telefon formatini normalizatsiya qilish (+998...)

#### 5.2 `services/sms_service.py`
- [ ] Eskiz.uz API integratsiyasi
- [ ] Token olish va yangilash
- [ ] OTP yuborish
- [ ] Rate limiting (bir raqamga 5 daqiqada 1 marta)

#### 5.3 `services/workshop_service.py`
- [ ] Ustaxona qidirish (PostGIS yoki Haversine formula)
- [ ] Rating hisoblash (weighted average)
- [ ] Slot availability tekshirish
- [ ] Ustaxona bo'sh vaqtlarini dinamik hisoblash
- [ ] Premium ustaxonalarni qidiruv natijalarida ustuvor ko'rsatish

#### 5.4 `services/booking_service.py`
- [ ] Slot band qilish + concurrency lock (Redis)
- [ ] Status workflow validation (faqat to'g'ri o'tishlar)
- [ ] Kasrni qaytarish logikasi
- [ ] Xabarnoma trigger (status o'zgarsa)

#### 5.5 `services/payment_service.py`
- [ ] Click integratsiyasi (to'liq spec bo'yicha)
- [ ] Payme integratsiyasi (JSON-RPC)
- [ ] UZUM Nasiya integratsiyasi
- [ ] Escrow logikasi
- [ ] 24 soatdan keyin avtomatik payout
- [ ] Qaytarib berish logikasi

#### 5.6 `services/cashback_service.py`
- [ ] Cashback hisoblash (tier bo'yicha)
- [ ] Tier yangilash (to'plangan summaga qarab)
- [ ] Cashback sarflash (to'lovdan chegirma)
- [ ] Do'stga o'tkazish
- [ ] Muddati o'tgan cashbackni bekor qilish (Celery beat)

#### 5.7 `services/warranty_service.py`
- [ ] Kafolat yaratish (booking complete bo'lganda)
- [ ] Muddat tekshirish
- [ ] Talabni ko'rib chiqish workflow
- [ ] Qism buyurtma trigger (kafolat tasdiqlanganda)

#### 5.8 `services/parts_service.py`
- [ ] Qidirish (full-text search, PostgreSQL tsvector)
- [ ] VIN kod bo'yicha mos qismlar
- [ ] Narx hisoblash (tier bo'yicha)
- [ ] Stock reservation (buyurtma berilganda)
- [ ] Delivery estimation

#### 5.9 `services/notification_service.py`
- [ ] Firebase FCM push yuborish
- [ ] SMS yuborish (Eskiz)
- [ ] Template bo'yicha xabar yaratish (uz/ru)
- [ ] Bulk notification yuborish

#### 5.10 `services/storage_service.py`
- [ ] S3-compatible fayl yuklash
- [ ] Rasm o'lchamini kamaytirish (Pillow)
- [ ] Thumbnail yaratish
- [ ] Signed URL generatsiyasi

---

### 6. Celery Tasks

#### 6.1 `tasks/notifications.py`
- [ ] `send_booking_confirmation_task` — buyurtma tasdiqlanganda
- [ ] `send_otp_sms_task` — OTP yuborish
- [ ] `send_payment_success_task`
- [ ] `send_warranty_expiry_reminder_task` — 7 kun qolganida eslatma

#### 6.2 `tasks/payments.py`
- [ ] `release_escrow_task` — 24 soatdan keyin escrow chiqarish
- [ ] `check_pending_payments_task` — muddati o'tgan to'lovlarni bekor qilish

#### 6.3 `tasks/cashback.py`
- [ ] `expire_cashback_task` — muddati o'tganlarni bekor qilish (oylik)
- [ ] `update_user_tier_task` — tier tekshirish

#### 6.4 `tasks/analytics.py`
- [ ] `generate_daily_report_task`
- [ ] `update_workshop_stats_task`

---

### 7. Tests

#### 7.1 `tests/unit/`
- [ ] `test_auth_service.py` — OTP, JWT
- [ ] `test_booking_service.py` — slot, status transitions
- [ ] `test_payment_service.py` — Click, Payme callback validation
- [ ] `test_cashback_service.py` — tier, calculation
- [ ] `test_workshop_service.py` — geosearch, rating

#### 7.2 `tests/integration/`
- [ ] `test_auth_api.py` — to'liq auth flow
- [ ] `test_booking_flow.py` — booking → payment → complete → review → warranty
- [ ] `test_parts_order.py`
- [ ] `test_warranty_claim.py`

#### 7.3 Test infratuzilma
- [ ] `conftest.py` — test DB, fixtures, mock services
- [ ] Factory Boy yoki fixture generator
- [ ] Coverage 80%+

---

### 8. API Dockerfile

```dockerfile
# api/Dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --upgrade pip && pip install -e ".[dev]"

FROM base AS development
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
COPY . .
RUN pip install gunicorn
EXPOSE 8000
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

---

## Frontend — Qilinadigan Ishlar

### 1. Loyiha Sozlash

#### 1.1 Vite + React + TypeScript
- [ ] `vite.config.ts` — path aliases (`@/`), proxy (`/api` → backend)
- [ ] `tsconfig.json` — strict mode, path mapping
- [ ] ESLint + Prettier konfiguratsiyasi
- [ ] Husky + lint-staged (commit oldidan)

#### 1.2 Asosiy Kutubxonalar
```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@reduxjs/toolkit": "^2",
    "react-redux": "^9",
    "axios": "^1",
    "react-query": "^5",
    "@tanstack/react-query": "^5",
    "react-hook-form": "^7",
    "zod": "^3",
    "@hookform/resolvers": "^3",
    "date-fns": "^3",
    "react-i18next": "^14",
    "i18next": "^23",
    "leaflet": "^1",
    "react-leaflet": "^4",
    "recharts": "^2",
    "framer-motion": "^11",
    "sonner": "^1",
    "lucide-react": "^0.4",
    "@radix-ui/react-*": "latest"
  }
}
```

#### 1.3 Global Sozlamalar
- [ ] `app/store.ts` — Redux store
- [ ] `app/router.tsx` — React Router v6 (lazy loading)
- [ ] `app/i18n.ts` — O'zbek + Rus tillari
- [ ] `shared/api/axiosInstance.ts` — interceptors (token, refresh, error handling)
- [ ] `shared/hooks/useAuth.ts`
- [ ] `shared/hooks/useGeolocation.ts`
- [ ] `shared/hooks/useDebounce.ts`

---

### 2. Sahifalar va Featurelar

#### 2.1 Auth Flow
- [ ] **`/login`** — Telefon raqam kiritish sahifasi
  - Telefon input (O'zbek format, +998 prefix)
  - "SMS yuborish" tugmasi
- [ ] **`/verify-otp`** — OTP kiritish
  - 4/6 xonali input (auto-focus, auto-submit)
  - Countdown timer (60 soniya)
  - "Qayta yuborish" tugmasi
- [ ] **`/register`** — Yangi foydalanuvchi profili to'ldirish
  - Ism, rol tanlash (mijoz / ustaxona egasi)

#### 2.2 Mijoz Ilovasi

##### 2.2.1 Bosh Sahifa (`/`)
- [ ] Tez harakatlar kartochkalari (moy, diagnostika, tormoz...)
- [ ] Yaqin ustaxonalar (Leaflet/Yandex map + list view)
- [ ] Faol buyurtma banner (agar mavjud)
- [ ] Cashback balans widget
- [ ] Oxirgi ta'mirlash tarixi (2-3 ta)

##### 2.2.2 Qidiruv va Filtrlash (`/search`)
- [ ] Search input (xizmat nomi, ustaxona nomi)
- [ ] Filtr panel (drawer/sidebar):
  - Xizmat kategoriyasi
  - Narx diapazoni (range slider)
  - Reyting (yulduzli filter)
  - Masofa (1/3/5/10 km)
  - Bo'sh vaqt (bugün/ertaga/hafta)
  - Kafolat mavjudligi (toggle)
  - Uyga chiqish (toggle)
  - Bo'lib to'lash (toggle)
- [ ] Natijalar (karta + ro'yxat view toggle)
- [ ] Sorting: Reyting / Narx / Masofa / Eng yaqin bo'sh slot

##### 2.2.3 Ustaxona Sahifasi (`/workshop/:slug`)
- [ ] Rasm galereyasi (carousel)
- [ ] Asosiy ma'lumotlar + "Verified" badge
- [ ] Xizmatlar va narxlar ro'yxati
- [ ] Reyting overview (5 mezon bo'yicha)
- [ ] Sharhlar (infinit scroll)
- [ ] Bo'sh slotlar taqvimi
- [ ] "Band qilish" tugmasi (sticky bottom)
- [ ] Xarita (ustaxona joylashuvi)

##### 2.2.4 Slot Tanlash (`/booking/slots`)
- [ ] Kalendar (haftalar bo'yicha)
- [ ] Tanlangan kunda bo'sh vaqtlar grid
- [ ] "Tezkor band qilish" (eng yaqin slot)
- [ ] Taxminiy vaqt ko'rsatish

##### 2.2.5 Buyurtma Tasdiqlash (`/booking/confirm`)
- [ ] Ustaxona + xizmat + vaqt xulosa
- [ ] Mashina tanlash (yoki yangi qo'shish)
- [ ] Izoh qo'shish (ixtiyoriy)
- [ ] Uyga chiqish bo'lsa — manzil kiritish

##### 2.2.6 To'lov Sahifasi (`/booking/payment`)
- [ ] Narx tafsiloti (mehnat + qismlar)
- [ ] To'lov usuli tanlash:
  - Click (redirect)
  - Payme (redirect)
  - UZUM Nasiya (modal + redirect)
  - Alif (redirect)
- [ ] Cashback chegirma ko'rsatish
- [ ] Promo-kod input
- [ ] "To'lash" tugmasi

##### 2.2.7 Buyurtmalar (`/bookings`)
- [ ] Faol buyurtmalar tab
- [ ] Tugallangan buyurtmalar tab
- [ ] Har bir buyurtma kartochkasi:
  - Status progress bar (4 qadam)
  - Usta bilan chat tugmasi
  - Kafolat hujjati
  - Reyting qoldirish (agar tugallangan)

##### 2.2.8 Reyting Modali
- [ ] 5 ta mezon uchun yulduz rating
- [ ] Matn sharhi
- [ ] Rasm yuklash (ixtiyoriy)

##### 2.2.9 Kafolatlar (`/warranties`)
- [ ] Faol kafolatlar ro'yxati
- [ ] Kafolat detali (xizmat, muddat, qolgan vaqt)
- [ ] "Kafolat talabi" tugmasi
- [ ] Talablar tarixi

##### 2.2.10 Profil (`/profile`)
- [ ] Avatar + ism tahrirlash
- [ ] Mashinalar boshqaruvi
- [ ] Til tanlash (uz/ru)
- [ ] Bildirishnomalar sozlamalari
- [ ] Yordam va qo'llab-quvvatlash

##### 2.2.11 Cashback (`/cashback`)
- [ ] Joriy tier badge + progress bar
- [ ] Balans + harakatlar tarixi
- [ ] Do'stga o'tkazish modali
- [ ] Tier benefitlari

##### 2.2.12 Ehtiyot Qism Do'koni (`/parts`)
- [ ] Kategoriya navigatsiyasi
- [ ] Mahsulotlar grid (filter + sort)
- [ ] Mahsulot kartochkasi
- [ ] Mahsulot detali (`/parts/:id`)
- [ ] Savatcha (`/parts/cart`)
- [ ] Buyurtma (`/parts/checkout`)

#### 2.3 Partner (Ustaxona) Dashboard

##### 2.3.1 Dashboard Asosi (`/partner`)
- [ ] Bugungi statistika kartochkalar:
  - Jami buyurtmalar | Faol | Tugallangan | Bekor
  - Kunlik daromad
  - O'rtacha reyting
- [ ] Bugungi buyurtmalar jadvali
- [ ] Keyingi slot taqvim ko'rinishi

##### 2.3.2 Buyurtmalar Boshqaruvi (`/partner/bookings`)
- [ ] Filtrlar: sana, status, xizmat turi
- [ ] Buyurtma kartochkasi: mijoz, mashina, xizmat, vaqt, status
- [ ] Status yangilash (tasdiqlash / boshlash / tugatish)
- [ ] Mijoz bilan chat

##### 2.3.3 Profil Sozlamalari (`/partner/settings`)
- [ ] Ustaxona ma'lumotlari
- [ ] Ish grafigi (hafta kunlari, soatlar, slot davomiyligi)
- [ ] Xizmatlar va narxlar boshqaruvi
- [ ] Rasmlar galereyasi
- [ ] Sertifikatlar

##### 2.3.4 Qism Buyurtmalar (`/partner/parts`)
- [ ] B2B katalog (partner narxlari)
- [ ] Buyurtma tarixi
- [ ] Kafolat uchun qism so'rovi

##### 2.3.5 Analitika (`/partner/analytics`)
- [ ] Daromad grafigi (haftalik/oylik, Recharts)
- [ ] Xizmat turlari breakdown (pie chart)
- [ ] Reyting dinamikasi
- [ ] Eng ko'p takrorlangan mijozlar

##### 2.3.6 Obuna (`/partner/subscription`)
- [ ] Joriy tarif
- [ ] Tariflarni solishtirish jadvali
- [ ] Upgrade to'lov flow

#### 2.4 Admin Panel (`/admin`)

##### 2.4.1 Admin Dashboard
- [ ] KPI kartochkalar (foydalanuvchilar, ustaxonalar, buyurtmalar, daromad)
- [ ] Grafiklar (kunlik buyurtmalar, daromad, yangi registratsiyalar)
- [ ] So'nggi buyurtmalar va to'lovlar

##### 2.4.2 Foydalanuvchilar Boshqaruvi (`/admin/users`)
- [ ] Jadval: ism, telefon, rol, sana, holat
- [ ] Filter + search
- [ ] Block/unblock

##### 2.4.3 Ustaxonalar Boshqaruvi (`/admin/workshops`)
- [ ] Ro'yxat + filter
- [ ] Tasdiqlash / rad etish
- [ ] Blok qilish

##### 2.4.4 Kafolat Talablari (`/admin/warranty-claims`)
- [ ] Talablar ro'yxati (status bo'yicha)
- [ ] Talabni ko'rib chiqish
- [ ] Tasdiqlash → qism buyurtma trigger
- [ ] Rad etish + sabab

##### 2.4.5 To'lovlar (`/admin/payments`)
- [ ] To'lovlar jadvali
- [ ] Escrow holati
- [ ] Payout boshqaruvi

##### 2.4.6 Ehtiyot Qismlar (`/admin/parts`)
- [ ] CRUD — qism qo'shish, tahrirlash, o'chirish
- [ ] Ombor qoldig'i
- [ ] Narxlarni yangilash

#### 2.5 Umumiy Komponentlar (`shared/components/`)

- [ ] `Button` — variant (primary/secondary/ghost/danger), loading state
- [ ] `Input`, `PhoneInput`, `OtpInput` (6 ta katak)
- [ ] `Modal`, `Drawer`, `BottomSheet`
- [ ] `StarRating` (interactive + display)
- [ ] `Avatar`, `Badge`, `Chip`
- [ ] `ProgressBar`, `StepIndicator`
- [ ] `Map` wrapper (Leaflet + Yandex tiles)
- [ ] `ImageUpload` (drag-n-drop + preview)
- [ ] `PriceTag` (formatlangan narx — 240 000 so'm)
- [ ] `EmptyState`, `ErrorState`, `LoadingSpinner`
- [ ] `ConfirmDialog`
- [ ] `InfiniteScrollList`
- [ ] `StatusBadge` (rang-rang: pending/active/done/cancelled)
- [ ] `WorkshopCard`, `PartCard`, `BookingCard`
- [ ] `Navbar` (mobile-first), `Sidebar` (desktop)
- [ ] `LanguageSwitcher`

---

### 3. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json .

FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

FROM base AS builder
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Database Migration Tartibi

```bash
# 1. Alembic boshlash
alembic init alembic

# 2. Har yangi model uchun migration yaratish
alembic revision --autogenerate -m "add_users_table"
alembic revision --autogenerate -m "add_workshops_table"
alembic revision --autogenerate -m "add_bookings_table"
alembic revision --autogenerate -m "add_payments_table"
alembic revision --autogenerate -m "add_parts_tables"
alembic revision --autogenerate -m "add_warranty_tables"
alembic revision --autogenerate -m "add_cashback_tables"
alembic revision --autogenerate -m "add_notifications_table"

# 3. Seed data
# Initial service categories
# Initial part categories
# Admin user
```

---

## Ishga Tushirish Tartibi

```bash
# 1. Repository clone
git clone https://github.com/yourorg/ustatopish
cd ustatopish

# 2. Environment
cp .env.example .env
# .env ni to'ldirish

# 3. Docker build va ishga tushirish
docker compose up --build -d

# 4. Migration
docker compose exec api alembic upgrade head

# 5. Seed data
docker compose exec api python scripts/seed.py

# 6. Log tekshirish
docker compose logs -f api
docker compose logs -f frontend

# Manzillar:
# Frontend:  http://localhost:3741
# API docs:  http://localhost:8741/docs
# API redoc: http://localhost:8741/redoc
# Flower:    http://localhost:5542
# PgAdmin:   http://localhost:5543  (profile: tools)
```

---

## Kod Sifati va Konventsiyalar

### Python (API)
- [ ] Type hints — barcha funksiyalarda majburiy
- [ ] Docstring — har service metodi uchun
- [ ] `black` + `isort` + `ruff` formatter
- [ ] Repository pattern — DB so'rovlarni service dan ajratish
- [ ] Async/await — hamma yerda (no sync code in async context)
- [ ] Logging — structured JSON logging (`structlog`)
- [ ] Sentry integratsiyasi — xatoliklarni kuzatish

### TypeScript (Frontend)
- [ ] Strict TypeScript — `any` dan qochish
- [ ] Feature-based folder structure
- [ ] Custom hooks — biznes logikani komponentdan ajratish
- [ ] React Query — server state
- [ ] Redux Toolkit — client state (auth, cart, ui)
- [ ] Zod — form validation + API response validation
- [ ] Error boundaries — har sahifada

---

## Xavfsizlik Checklisti

- [ ] JWT access token — 60 daqiqa, refresh — 30 kun
- [ ] Rate limiting — OTP: 5 ta/soat; API: 100/daqiqa
- [ ] SQL injection — SQLAlchemy ORM (parametrized queries)
- [ ] XSS — React default escaping + CSP headers
- [ ] CORS — faqat whitelist originlar
- [ ] File upload — tur tekshirish, hajm cheklash (10MB)
- [ ] Webhook signature tekshirish — Click, Payme, UZUM
- [ ] Escrow — pul faqat `complete` statusda chiqariladi
- [ ] Admin endpoints — rol tekshirish middleware
- [ ] Sensitive data logging — telefon, karta raqam loggingdan chiqarib tashlanadi

---

*Hujjat versiyasi: 1.0 | UstaTopish loyiha jamoasi*
