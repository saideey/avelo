from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.user import User
from app.models.parts import (
    PartCategory, Part, PartOrder, PartOrderItem, PartOrderStatus,
    PartInventory, PartPrice,
)

router = APIRouter(prefix="/parts", tags=["Parts"])


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get part categories tree (top-level with children loaded via selectin)."""
    result = await db.execute(
        select(PartCategory).where(
            PartCategory.parent_id.is_(None),
            PartCategory.is_deleted == False,
        ).order_by(PartCategory.name)
    )
    categories = result.scalars().all()
    return categories


@router.get("/")
async def list_parts(
    category_id: UUID | None = Query(None),
    brand_id: UUID | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List parts, paginated and filterable."""
    query = select(Part).where(Part.is_deleted == False, Part.is_active == True)

    if category_id:
        query = query.where(Part.category_id == category_id)
    if brand_id:
        query = query.where(Part.brand_id == brand_id)
    if search:
        query = query.where(Part.name.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Part.name).offset(skip).limit(limit)
    )
    parts = result.scalars().all()

    return {"items": parts, "total": total, "skip": skip, "limit": limit}


@router.get("/{part_id}")
async def get_part(part_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get part detail."""
    result = await db.execute(
        select(Part).where(Part.id == part_id, Part.is_deleted == False)
    )
    part = result.scalar_one_or_none()
    if not part:
        raise NotFoundError("Ehtiyot qism")
    return part


@router.post("/orders", status_code=201)
async def create_part_order(
    delivery_address: str,
    items: list[dict],
    workshop_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a part order.

    items: list of {"part_id": UUID, "quantity": int}
    """
    if not items:
        raise BadRequestError("Kamida bitta mahsulot kerak")

    total_amount = 0.0
    order_items = []

    for item in items:
        part_id = item.get("part_id")
        quantity = item.get("quantity", 1)

        part_result = await db.execute(
            select(Part).where(Part.id == part_id, Part.is_deleted == False, Part.is_active == True)
        )
        part = part_result.scalar_one_or_none()
        if not part:
            raise NotFoundError(f"Ehtiyot qism ({part_id})")

        # Get current price
        price_result = await db.execute(
            select(PartPrice)
            .where(PartPrice.part_id == part_id)
            .order_by(PartPrice.valid_from.desc())
            .limit(1)
        )
        price = price_result.scalar_one_or_none()
        unit_price = float(price.price_retail) if price else 0.0
        total_amount += unit_price * quantity

        order_items.append({
            "part_id": part_id,
            "quantity": quantity,
            "unit_price": unit_price,
        })

    order = PartOrder(
        customer_id=current_user.id,
        workshop_id=workshop_id,
        status=PartOrderStatus.PENDING,
        delivery_address=delivery_address,
        total_amount=total_amount,
    )
    db.add(order)
    await db.flush()

    for oi in order_items:
        order_item = PartOrderItem(
            order_id=order.id,
            part_id=oi["part_id"],
            quantity=oi["quantity"],
            unit_price=oi["unit_price"],
        )
        db.add(order_item)

    await db.flush()
    await db.refresh(order)
    return order


@router.get("/orders")
async def get_user_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's part orders."""
    count_result = await db.execute(
        select(func.count()).select_from(PartOrder).where(
            PartOrder.customer_id == current_user.id,
            PartOrder.is_deleted == False,
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(PartOrder)
        .where(PartOrder.customer_id == current_user.id, PartOrder.is_deleted == False)
        .order_by(PartOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    orders = result.scalars().all()

    return {"items": orders, "total": total, "skip": skip, "limit": limit}
