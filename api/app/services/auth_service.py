import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User, OTPCode, OTPPurpose, UserRole
from app.schemas.auth import TokenResponse

settings = get_settings()


def generate_otp(phone: str) -> str:
    """Generate a one-time password. Returns '1234' in test mode."""
    if settings.OTP_TEST_MODE:
        return settings.OTP_TEST_CODE
    return f"{secrets.randbelow(10000):04d}"


async def create_otp(db: AsyncSession, phone: str, code: str) -> OTPCode:
    """Save OTP code to database with 5-minute expiration."""
    otp = OTPCode(
        user_phone=phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        purpose=OTPPurpose.LOGIN,
    )
    db.add(otp)
    await db.flush()
    return otp


async def verify_otp(db: AsyncSession, phone: str, code: str) -> bool:
    """Verify an OTP code against the database."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OTPCode)
        .where(
            OTPCode.user_phone == phone,
            OTPCode.code == code,
            OTPCode.is_used == False,
            OTPCode.expires_at > now,
        )
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        return False

    otp.is_used = True
    await db.flush()
    return True


async def authenticate_user(
    db: AsyncSession, phone: str, code: str
) -> tuple[User, TokenResponse]:
    """Verify OTP, create or get user, and return tokens."""
    is_valid = await verify_otp(db, phone, code)
    if not is_valid:
        raise BadRequestError("OTP kod noto'g'ri yoki muddati o'tgan")

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    if not user:
        user = User(phone=phone, role=UserRole.CUSTOMER)
        db.add(user)
        await db.flush()

    token_data = {"sub": str(user.id), "phone": user.phone, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    token_response = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return user, token_response


async def register_user(
    db: AsyncSession, phone: str, full_name: str, role: str
) -> User:
    """Register a new user with the given phone, name, and role."""
    result = await db.execute(select(User).where(User.phone == phone))
    existing = result.scalar_one_or_none()
    if existing:
        raise BadRequestError("Bu telefon raqami allaqachon ro'yxatdan o'tgan")

    user = User(
        phone=phone,
        full_name=full_name,
        role=UserRole(role),
    )
    db.add(user)
    await db.flush()
    return user
