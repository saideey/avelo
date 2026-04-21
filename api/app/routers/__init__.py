from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.workshops import router as workshops_router
from app.routers.bookings import router as bookings_router
from app.routers.payments import router as payments_router
from app.routers.parts import router as parts_router
from app.routers.warranty import router as warranty_router
from app.routers.reviews import router as reviews_router
from app.routers.notifications import router as notifications_router
from app.routers.admin import router as admin_router
from app.routers.partner import router as partner_router

__all__ = [
    "auth_router",
    "users_router",
    "workshops_router",
    "bookings_router",
    "payments_router",
    "parts_router",
    "warranty_router",
    "reviews_router",
    "notifications_router",
    "admin_router",
    "partner_router",
]
