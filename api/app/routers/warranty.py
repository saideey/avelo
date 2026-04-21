from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.user import User
from app.models.warranty import Warranty, WarrantyClaim, WarrantyStatus, WarrantyClaimStatus

router = APIRouter(prefix="/warranties", tags=["Warranties"])


@router.get("/")
async def get_warranties(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's warranties."""
    result = await db.execute(
        select(Warranty).where(
            Warranty.customer_id == current_user.id,
            Warranty.is_deleted == False,
        ).order_by(Warranty.created_at.desc())
    )
    warranties = result.scalars().all()
    return warranties


@router.get("/{warranty_id}")
async def get_warranty(
    warranty_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get warranty detail."""
    result = await db.execute(
        select(Warranty).where(
            Warranty.id == warranty_id,
            Warranty.is_deleted == False,
        )
    )
    warranty = result.scalar_one_or_none()
    if not warranty:
        raise NotFoundError("Kafolat")

    if warranty.customer_id != current_user.id and current_user.role != "admin":
        from app.models.workshop import Workshop
        ws_result = await db.execute(
            select(Workshop).where(Workshop.id == warranty.workshop_id)
        )
        ws = ws_result.scalar_one_or_none()
        if not ws or ws.partner_id != current_user.id:
            raise BadRequestError("Ruxsat yo'q")

    return warranty


@router.post("/{warranty_id}/claim", status_code=201)
async def submit_warranty_claim(
    warranty_id: UUID,
    description: str,
    photos: list[str] | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a warranty claim."""
    result = await db.execute(
        select(Warranty).where(
            Warranty.id == warranty_id,
            Warranty.customer_id == current_user.id,
            Warranty.is_deleted == False,
        )
    )
    warranty = result.scalar_one_or_none()
    if not warranty:
        raise NotFoundError("Kafolat")

    if warranty.status != WarrantyStatus.ACTIVE:
        raise BadRequestError("Kafolat faol emas")

    claim = WarrantyClaim(
        warranty_id=warranty_id,
        customer_id=current_user.id,
        description=description,
        photos=photos,
        status=WarrantyClaimStatus.SUBMITTED,
    )
    db.add(claim)

    warranty.status = WarrantyStatus.CLAIMED
    await db.flush()
    await db.refresh(claim)
    return claim


@router.get("/claims")
async def get_user_claims(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's warranty claims."""
    count_result = await db.execute(
        select(func.count()).select_from(WarrantyClaim).where(
            WarrantyClaim.customer_id == current_user.id,
            WarrantyClaim.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(WarrantyClaim)
        .where(WarrantyClaim.customer_id == current_user.id, WarrantyClaim.is_deleted == False)
        .order_by(WarrantyClaim.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    claims = result.scalars().all()

    return {"items": claims, "total": total, "skip": skip, "limit": limit}
