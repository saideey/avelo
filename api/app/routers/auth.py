from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
)
from app.core.config import get_settings
from app.core.exceptions import BadRequestError, UnauthorizedError, NotFoundError
from app.models.user import User, OTPCode, RefreshToken, OTPPurpose, UserRole
from app.schemas.auth import (
    PhoneLoginRequest,
    OTPVerifyRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserRegisterRequest,
)
from app.schemas.common import SuccessResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.post("/send-otp", response_model=SuccessResponse)
async def send_otp(body: PhoneLoginRequest, db: AsyncSession = Depends(get_db)):
    """Generate and save OTP for phone login."""
    code = generate_otp()

    otp = OTPCode(
        user_phone=body.phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        purpose=OTPPurpose.LOGIN,
    )
    db.add(otp)
    await db.flush()

    return SuccessResponse(
        message="OTP kod yuborildi",
        data={"phone": body.phone, "expires_in": 300},
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and return tokens. Creates user if not exists."""
    # Check OTP: test mode accepts "1234", otherwise check DB
    if settings.OTP_TEST_MODE and body.code == settings.OTP_TEST_CODE:
        pass  # Test mode — accept
    else:
        result = await db.execute(
            select(OTPCode)
            .where(
                OTPCode.user_phone == body.phone,
                OTPCode.code == body.code,
                OTPCode.is_used == False,
                OTPCode.expires_at > datetime.now(timezone.utc),
            )
            .order_by(OTPCode.created_at.desc())
            .limit(1)
        )
        otp = result.scalar_one_or_none()
        if not otp:
            raise BadRequestError("OTP kod noto'g'ri yoki muddati o'tgan")
        otp.is_used = True

    # Find or create user
    result = await db.execute(
        select(User).where(User.phone == body.phone, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            phone=body.phone,
            role=UserRole.CUSTOMER,
            is_verified=True,
        )
        db.add(user)
        await db.flush()

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Save refresh token
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Validate refresh token and issue new token pair."""
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Refresh token yaroqsiz")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token yaroqsiz")

    # Check token exists in DB
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == body.refresh_token,
            RefreshToken.user_id == user_id,
            RefreshToken.is_deleted == False,
        )
    )
    stored_token = result.scalar_one_or_none()
    if not stored_token:
        raise UnauthorizedError("Refresh token topilmadi")

    if stored_token.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token muddati o'tgan")

    # Invalidate old token
    stored_token.is_deleted = True

    # Get user
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("Foydalanuvchi")

    # Generate new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    rt = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    body: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate refresh token on logout."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == body.refresh_token,
            RefreshToken.user_id == current_user.id,
            RefreshToken.is_deleted == False,
        )
    )
    stored_token = result.scalar_one_or_none()
    if stored_token:
        stored_token.is_deleted = True

    return SuccessResponse(message="Tizimdan muvaffaqiyatli chiqdingiz")


@router.post("/register", response_model=UserResponse)
async def register(
    body: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update user profile after first OTP verification."""
    result = await db.execute(
        select(User).where(User.phone == body.phone, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Foydalanuvchi")

    user.full_name = body.full_name
    try:
        user.role = UserRole(body.role)
    except ValueError:
        user.role = UserRole.CUSTOMER

    await db.flush()
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user."""
    return current_user
