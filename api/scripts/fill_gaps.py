"""Fill missing data: ADMIN user, missing workshop photos, certificates,
subscriptions, warranty claims, part-bonus transactions.

Idempotent — safe to re-run. Adds what's missing, skips what exists.
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal

from sqlalchemy import select, func

from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.workshop import (
    Workshop, WorkshopPhoto, WorkshopCertificate,
)
from app.models.warranty import Warranty, WarrantyClaim, WarrantyClaimStatus
from app.models.subscription import SubscriptionPlan, WorkshopSubscription
from app.models.part_bonus import PartBonusWallet, PartBonusTransaction, BonusTier


SAMPLE_WORKSHOP_IMAGES = [
    "/uploads/workshops/0dcb39f409c946dca4d2100b931c41f3.jpg",
    "/uploads/workshops/37a138bcae41412d998347e4839acbe6.jpg",
    "/uploads/workshops/4b4893c9e8b74f4684ce447b40653a35.jpg",
    "/uploads/workshops/54161102e89b40778ea4ff8817a38691.png",
    "/uploads/workshops/616a65b7d967463abb00ca66a28bfbe5.jpg",
    "/uploads/workshops/7d9702bf695547b496f53c2f7e3eb5b4.jpg",
    "/uploads/workshops/81ed98fc609c41569d5a2f1841bf9898.jpg",
    "/uploads/workshops/89cd35c6c55a484790eca56ba10abfaf.jpg",
    "/uploads/workshops/93c0fa1a779144cbae03dd366866bc97.jpg",
    "/uploads/workshops/b37cc38781f84ea49eef52256a3eaaac.jpg",
    "/uploads/workshops/b616fc9b92f34a259134c8ec71c25ba7.jpg",
    "/uploads/workshops/c84b4b025bb94c1fa963946f84166b50.jpg",
]


async def ensure_admin_user(db):
    existing = (await db.execute(
        select(User).where(User.role == UserRole.ADMIN)
    )).scalar_one_or_none()
    if existing:
        print(f"  ADMIN user already exists: {existing.phone}")
        return
    admin = User(
        id=uuid.uuid4(),
        phone="+998901234568",
        full_name="Platform Admin",
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    print("  + ADMIN user created: +998901234568 (OTP: 1234)")


async def fill_workshop_photos(db):
    workshops = (await db.execute(select(Workshop))).scalars().all()
    added = 0
    for i, ws in enumerate(workshops):
        has_photo = (await db.execute(
            select(func.count(WorkshopPhoto.id)).where(WorkshopPhoto.workshop_id == ws.id)
        )).scalar_one()
        if has_photo:
            continue
        img = SAMPLE_WORKSHOP_IMAGES[i % len(SAMPLE_WORKSHOP_IMAGES)]
        db.add(WorkshopPhoto(
            id=uuid.uuid4(),
            workshop_id=ws.id,
            url=img,
            order=0,
            is_main=True,
        ))
        added += 1
    print(f"  + {added} workshop photos added")


async def fill_workshop_certificates(db):
    workshops = (await db.execute(
        select(Workshop).where(Workshop.is_verified.is_(True))
    )).scalars().all()
    existing_count = (await db.execute(
        select(func.count(WorkshopCertificate.id))
    )).scalar_one()
    if existing_count:
        print(f"  Certificates already exist ({existing_count}) — skipping")
        return
    samples = [
        ("ISO 9001:2015 Sifat sertifikati", "ISO O'zbekiston"),
        ("Avto ta'mir xizmatlari litsenziyasi", "Davlat avto inspeksiyasi"),
        ("Bosch diagnostika markazi", "Bosch Service"),
    ]
    added = 0
    for ws in workshops:
        title, issuer = samples[added % len(samples)]
        db.add(WorkshopCertificate(
            id=uuid.uuid4(),
            workshop_id=ws.id,
            title=title,
            issued_by=issuer,
            issue_date=date(2023, 6, 15),
            image_url=None,
        ))
        added += 1
    print(f"  + {added} workshop certificates added")


async def fill_workshop_subscriptions(db):
    existing_count = (await db.execute(
        select(func.count(WorkshopSubscription.id))
    )).scalar_one()
    if existing_count:
        print(f"  Subscriptions already exist ({existing_count}) — skipping")
        return
    plans = {p.tier: p for p in (await db.execute(select(SubscriptionPlan))).scalars().all()}
    if not plans:
        print("  No subscription plans found — skipping")
        return
    workshops = (await db.execute(select(Workshop))).scalars().all()
    now = datetime.now(timezone.utc)
    tier_cycle = ["basic", "silver", "gold", "platinum"]
    added = 0
    for i, ws in enumerate(workshops):
        tier = tier_cycle[i % len(tier_cycle)]
        plan = plans.get(tier) or plans.get("basic")
        if not plan:
            continue
        db.add(WorkshopSubscription(
            id=uuid.uuid4(),
            workshop_id=ws.id,
            plan_id=plan.id,
            starts_at=now - timedelta(days=30),
            expires_at=now + timedelta(days=335),
            is_active=True,
            auto_renew=True,
        ))
        added += 1
    print(f"  + {added} workshop subscriptions added")


async def fill_warranty_claims(db):
    existing = (await db.execute(select(func.count(WarrantyClaim.id)))).scalar_one()
    if existing:
        print(f"  Warranty claims already exist ({existing}) — skipping")
        return
    warranties = (await db.execute(select(Warranty).limit(3))).scalars().all()
    if not warranties:
        print("  No warranties found — skipping")
        return
    samples = [
        ("Moy almashtirilgan joyda yana sizib chiqdi", WarrantyClaimStatus.APPROVED),
        ("Tormoz nakladkasi 1 oydan keyin g'ichirlay boshladi", WarrantyClaimStatus.REVIEWING),
        ("Diagnostikadan keyin xato ko'rsatmasi yana chiqdi", WarrantyClaimStatus.SUBMITTED),
    ]
    added = 0
    for w, (desc, status) in zip(warranties, samples):
        db.add(WarrantyClaim(
            id=uuid.uuid4(),
            warranty_id=w.id,
            customer_id=w.customer_id,
            description=desc,
            photos=[],
            status=status,
            admin_notes="Tekshirilmoqda" if status == WarrantyClaimStatus.REVIEWING else None,
            resolved_at=datetime.now(timezone.utc) if status == WarrantyClaimStatus.APPROVED else None,
        ))
        added += 1
    print(f"  + {added} warranty claims added")


async def fill_part_bonus_transactions(db):
    existing = (await db.execute(select(func.count(PartBonusTransaction.id)))).scalar_one()
    if existing:
        print(f"  Part bonus transactions exist ({existing}) — skipping")
        return
    wallet = (await db.execute(select(PartBonusWallet).limit(1))).scalar_one_or_none()
    if not wallet:
        print("  No part-bonus wallet — skipping")
        return
    samples = [
        (Decimal("150000"), "earned", "STANDART", "Birinchi buyurtma bonusi"),
        (Decimal("300000"), "earned", "SILVER", "Zapchast buyurtmasi uchun bonus"),
        (Decimal("100000"), "withdrawn", "SILVER", "Naqd yechib olindi"),
    ]
    for amount, ttype, tier, note in samples:
        db.add(PartBonusTransaction(
            id=uuid.uuid4(),
            wallet_id=wallet.id,
            part_order_id=None,
            amount=amount,
            type=ttype,
            tier_at_time=tier,
            note=note,
        ))
    print(f"  + {len(samples)} part-bonus transactions added")


async def main():
    async with AsyncSessionLocal() as db:
        print("=== Filling gaps ===")
        await ensure_admin_user(db)
        await fill_workshop_photos(db)
        await fill_workshop_certificates(db)
        await fill_workshop_subscriptions(db)
        await fill_warranty_claims(db)
        await fill_part_bonus_transactions(db)
        await db.commit()
        print("=== Done ===")


if __name__ == "__main__":
    asyncio.run(main())
