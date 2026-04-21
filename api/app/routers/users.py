from uuid import UUID

from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.user import User
from app.models.vehicle import UserVehicle, VehicleBrand, VehicleModel
from app.models.booking import Booking
from app.models.warranty import Warranty, WarrantyStatus
from app.models.cashback import CashbackWallet
from app.models.favorite import FavoriteWorkshop
from app.models.workshop import Workshop
from app.models.admin import Complaint, ComplaintType, ComplaintStatus
from app.schemas.user import UserResponse, UserUpdate, VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload user avatar image."""
    import uuid as _uuid
    import os
    import aiofiles

    upload_dir = "/app/uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(avatar.filename or "img.jpg")[1] or ".jpg"
    filename = f"{_uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await avatar.read()
        await f.write(content)

    url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = url
    await db.flush()
    return {"message": "Avatar yuklandi", "avatar_url": url}


@router.get("/vehicle-brands")
async def get_vehicle_brands(db: AsyncSession = Depends(get_db)):
    """Public list of vehicle brands with models."""
    from sqlalchemy.orm import selectinload as sload
    result = await db.execute(
        select(VehicleBrand).options(sload(VehicleBrand.models)).where(VehicleBrand.is_deleted == False).order_by(VehicleBrand.name)
    )
    brands = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "country": b.country,
            "models": [{"id": str(m.id), "name": m.name, "year_from": m.year_from, "year_to": m.year_to, "image_url": m.image_url} for m in (b.models or []) if not m.is_deleted]
        }
        for b in brands
    ]


@router.get("/me/vehicles", response_model=list[VehicleResponse])
async def get_vehicles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's vehicles."""
    result = await db.execute(
        select(UserVehicle)
        .options(selectinload(UserVehicle.brand), selectinload(UserVehicle.model))
        .where(UserVehicle.user_id == current_user.id, UserVehicle.is_deleted == False)
    )
    vehicles = result.scalars().all()
    return [
        VehicleResponse(
            id=v.id,
            brand_name=v.brand.name,
            model_name=v.model.name,
            year=v.year,
            license_plate=v.license_plate,
            color=v.color,
            mileage=v.mileage,
        )
        for v in vehicles
    ]


@router.post("/me/vehicles", response_model=VehicleResponse, status_code=201)
async def add_vehicle(
    body: VehicleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a vehicle to user's garage."""
    vehicle = UserVehicle(
        user_id=current_user.id,
        brand_id=body.brand_id,
        model_id=body.model_id,
        year=body.year,
        license_plate=body.license_plate,
        color=body.color,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle, attribute_names=["brand", "model"])

    return VehicleResponse(
        id=vehicle.id,
        brand_name=vehicle.brand.name,
        model_name=vehicle.model.name,
        year=vehicle.year,
        license_plate=vehicle.license_plate,
        color=vehicle.color,
        mileage=vehicle.mileage,
    )


@router.put("/me/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a vehicle."""
    result = await db.execute(
        select(UserVehicle)
        .options(selectinload(UserVehicle.brand), selectinload(UserVehicle.model))
        .where(
            UserVehicle.id == vehicle_id,
            UserVehicle.user_id == current_user.id,
            UserVehicle.is_deleted == False,
        )
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise NotFoundError("Avtomobil")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)
    await db.flush()
    await db.refresh(vehicle, attribute_names=["brand", "model"])

    return VehicleResponse(
        id=vehicle.id,
        brand_name=vehicle.brand.name,
        model_name=vehicle.model.name,
        year=vehicle.year,
        license_plate=vehicle.license_plate,
        color=vehicle.color,
        mileage=vehicle.mileage,
    )


@router.delete("/me/vehicles/{vehicle_id}", response_model=SuccessResponse)
async def delete_vehicle(
    vehicle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a vehicle."""
    result = await db.execute(
        select(UserVehicle).where(
            UserVehicle.id == vehicle_id,
            UserVehicle.user_id == current_user.id,
            UserVehicle.is_deleted == False,
        )
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise NotFoundError("Avtomobil")

    vehicle.is_deleted = True
    await db.flush()
    return SuccessResponse(message="Avtomobil o'chirildi")


@router.get("/me/bookings")
async def get_bookings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's booking history (paginated, filterable by status)."""
    query = select(Booking).where(
        Booking.customer_id == current_user.id,
        Booking.is_deleted == False,
    )
    if status:
        status_list = [s.strip() for s in status.split(",")]
        query = query.where(Booking.status.in_(status_list))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(
        query.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
    )
    bookings = result.scalars().all()

    return {
        "items": bookings,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/me/warranties")
async def get_warranties(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's active warranties."""
    result = await db.execute(
        select(Warranty).where(
            Warranty.customer_id == current_user.id,
            Warranty.status == WarrantyStatus.ACTIVE,
            Warranty.is_deleted == False,
        )
    )
    warranties = result.scalars().all()
    return warranties


@router.get("/me/cashback")
async def get_cashback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's cashback wallet info with transactions."""
    from sqlalchemy.orm import selectinload as sload
    from app.models.cashback import CashbackTransaction
    result = await db.execute(
        select(CashbackWallet)
        .options(sload(CashbackWallet.transactions))
        .where(CashbackWallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        return {
            "balance": 0,
            "tier": "bronze",
            "total_earned": 0,
            "total_spent": 0,
            "transactions": [],
        }
    return {
        "balance": float(wallet.balance or 0),
        "tier": wallet.tier.value if hasattr(wallet.tier, 'value') else wallet.tier,
        "total_earned": float(wallet.total_earned or 0),
        "total_spent": float(wallet.total_spent or 0),
        "transactions": [
            {
                "id": str(t.id),
                "amount": float(t.amount or 0),
                "type": t.type.value if hasattr(t.type, 'value') else t.type,
                "source": t.source,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in (wallet.transactions or [])
        ],
    }


# --- Favorite workshops ---

@router.get("/me/favorites")
async def list_favorites(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's favorite workshops."""
    count_result = await db.execute(
        select(func.count()).select_from(FavoriteWorkshop).where(
            FavoriteWorkshop.user_id == current_user.id,
            FavoriteWorkshop.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(FavoriteWorkshop)
        .where(
            FavoriteWorkshop.user_id == current_user.id,
            FavoriteWorkshop.is_deleted == False,
        )
        .order_by(FavoriteWorkshop.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    favorites = result.scalars().all()

    # Enrich with workshop details
    from app.models.workshop import Workshop, WorkshopPhoto
    ws_ids = [f.workshop_id for f in favorites]
    ws_map: dict = {}
    photo_map: dict = {}
    if ws_ids:
        ws_r = await db.execute(select(Workshop).where(Workshop.id.in_(ws_ids)))
        for w in ws_r.scalars().all():
            ws_map[w.id] = w
        ph_r = await db.execute(select(WorkshopPhoto.workshop_id, WorkshopPhoto.url).where(
            WorkshopPhoto.workshop_id.in_(ws_ids), WorkshopPhoto.is_deleted == False).order_by(WorkshopPhoto.order))
        for p in ph_r:
            if p.workshop_id not in photo_map:
                photo_map[p.workshop_id] = p.url

    items = []
    for f in favorites:
        ws = ws_map.get(f.workshop_id)
        if ws:
            items.append({
                "id": str(ws.id),
                "workshop_id": str(ws.id),
                "name": ws.name,
                "slug": ws.slug,
                "address": ws.address,
                "city": ws.city,
                "rating_avg": float(ws.rating_avg or 0),
                "total_reviews": ws.total_reviews or 0,
                "is_verified": ws.is_verified,
                "photo_url": photo_map.get(ws.id),
            })

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/me/favorites/{workshop_id}", status_code=201)
async def add_favorite(
    workshop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a workshop to favorites."""
    # Verify workshop exists
    ws_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id, Workshop.is_deleted == False)
    )
    if not ws_result.scalar_one_or_none():
        raise NotFoundError("Ustaxona")

    # Check if already favorited
    existing = await db.execute(
        select(FavoriteWorkshop).where(
            FavoriteWorkshop.user_id == current_user.id,
            FavoriteWorkshop.workshop_id == workshop_id,
            FavoriteWorkshop.is_deleted == False,
        )
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Ustaxona allaqachon sevimlilar ro'yxatida")

    favorite = FavoriteWorkshop(
        user_id=current_user.id,
        workshop_id=workshop_id,
    )
    db.add(favorite)
    await db.flush()
    await db.refresh(favorite)
    return favorite


@router.delete("/me/favorites/{workshop_id}", response_model=SuccessResponse)
async def remove_favorite(
    workshop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a workshop from favorites."""
    result = await db.execute(
        select(FavoriteWorkshop).where(
            FavoriteWorkshop.user_id == current_user.id,
            FavoriteWorkshop.workshop_id == workshop_id,
            FavoriteWorkshop.is_deleted == False,
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise NotFoundError("Sevimli ustaxona")

    favorite.is_deleted = True
    await db.flush()
    return SuccessResponse(message="Sevimlilardan olib tashlandi")


# --- Complaints ---

class ComplaintCreate(BaseModel):
    subject: str = Field(..., max_length=255)
    description: str
    type: ComplaintType = ComplaintType.OTHER
    workshop_id: UUID | None = None
    booking_id: UUID | None = None
    priority: int = Field(1, ge=1, le=4)


@router.get("/me/complaints")
async def list_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's complaints."""
    count_result = await db.execute(
        select(func.count()).select_from(Complaint).where(
            Complaint.complainant_id == current_user.id,
            Complaint.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Complaint)
        .where(
            Complaint.complainant_id == current_user.id,
            Complaint.is_deleted == False,
        )
        .order_by(Complaint.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    complaints = result.scalars().all()

    return {"items": complaints, "total": total, "skip": skip, "limit": limit}


@router.post("/me/complaints", status_code=201)
async def submit_complaint(
    body: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new complaint."""
    # Validate workshop_id if provided
    if body.workshop_id:
        ws_result = await db.execute(
            select(Workshop).where(Workshop.id == body.workshop_id, Workshop.is_deleted == False)
        )
        if not ws_result.scalar_one_or_none():
            raise NotFoundError("Ustaxona")

    # Validate booking_id if provided
    if body.booking_id:
        bk_result = await db.execute(
            select(Booking).where(
                Booking.id == body.booking_id,
                Booking.customer_id == current_user.id,
                Booking.is_deleted == False,
            )
        )
        if not bk_result.scalar_one_or_none():
            raise NotFoundError("Buyurtma")

    complaint = Complaint(
        complainant_id=current_user.id,
        workshop_id=body.workshop_id,
        booking_id=body.booking_id,
        type=body.type,
        status=ComplaintStatus.OPEN,
        subject=body.subject,
        description=body.description,
        priority=body.priority,
    )
    db.add(complaint)
    await db.flush()
    await db.refresh(complaint)
    return complaint
