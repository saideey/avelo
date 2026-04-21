from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.models.user import User


async def get_current_user(
    authorization: str = Header(..., description="Bearer token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise UnauthorizedError("Noto'g'ri token formati")

    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Token yaroqsiz yoki muddati o'tgan")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError()

    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("Foydalanuvchi topilmadi")

    if not user.is_active:
        raise ForbiddenError("Akkaunt bloklangan")

    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise ForbiddenError("Akkaunt faol emas")
    return user


ADMIN_ROLES = {"admin", "super_admin", "regional_admin", "moderator"}

# Role hierarchy: super_admin > regional_admin > moderator > admin
ROLE_HIERARCHY = {
    "super_admin": 100,
    "regional_admin": 50,
    "moderator": 30,
    "admin": 20,
    "partner": 10,
    "mechanic": 5,
    "customer": 1,
}


def require_role(*roles: str):
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError(f"Bu amal uchun {', '.join(roles)} roli kerak")
        return user
    return role_checker


def require_admin(min_level: str = "moderator"):
    """Require admin access with minimum role level."""
    min_rank = ROLE_HIERARCHY.get(min_level, 0)

    async def admin_checker(user: User = Depends(get_current_user)) -> User:
        user_rank = ROLE_HIERARCHY.get(user.role.value if hasattr(user.role, 'value') else user.role, 0)
        if user_rank < min_rank:
            raise ForbiddenError(f"Kamida {min_level} darajasi talab qilinadi")
        return user
    return admin_checker


def require_super_admin():
    return require_admin("super_admin")


def require_regional_admin():
    return require_admin("regional_admin")
