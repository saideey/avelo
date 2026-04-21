from app.schemas.common import PaginatedResponse, ErrorResponse, SuccessResponse
from app.schemas.auth import (
    PhoneLoginRequest, OTPVerifyRequest, TokenResponse,
    RefreshTokenRequest, UserRegisterRequest,
)
from app.schemas.user import (
    UserResponse, UserUpdate, VehicleCreate, VehicleUpdate, VehicleResponse,
)
from app.schemas.workshop import (
    WorkshopCreate, WorkshopUpdate, WorkshopListItem, WorkshopDetailResponse,
    WorkshopServiceCreate, WorkshopServiceResponse,
    WorkshopScheduleCreate, NearbyWorkshopFilter,
)
from app.schemas.booking import (
    BookingCreate, BookingResponse, BookingStatusUpdate,
    TimeSlotQuery, AvailableSlot, BookingServiceInfo,
)
from app.schemas.payment import PaymentInitRequest, PaymentResponse
from app.schemas.review import ReviewCreate, ReviewResponse
from app.schemas.parts import (
    PartResponse, PartSearchFilter, PartOrderCreate, PartOrderItemCreate,
)
from app.schemas.warranty import (
    WarrantyResponse, WarrantyClaimCreate, WarrantyClaimResponse,
)
from app.schemas.cashback import CashbackWalletResponse, CashbackTransactionResponse

__all__ = [
    # Common
    "PaginatedResponse", "ErrorResponse", "SuccessResponse",
    # Auth
    "PhoneLoginRequest", "OTPVerifyRequest", "TokenResponse",
    "RefreshTokenRequest", "UserRegisterRequest",
    # User
    "UserResponse", "UserUpdate", "VehicleCreate", "VehicleUpdate", "VehicleResponse",
    # Workshop
    "WorkshopCreate", "WorkshopUpdate", "WorkshopListItem", "WorkshopDetailResponse",
    "WorkshopServiceCreate", "WorkshopServiceResponse",
    "WorkshopScheduleCreate", "NearbyWorkshopFilter",
    # Booking
    "BookingCreate", "BookingResponse", "BookingStatusUpdate",
    "TimeSlotQuery", "AvailableSlot", "BookingServiceInfo",
    # Payment
    "PaymentInitRequest", "PaymentResponse",
    # Review
    "ReviewCreate", "ReviewResponse",
    # Parts
    "PartResponse", "PartSearchFilter", "PartOrderCreate", "PartOrderItemCreate",
    # Warranty
    "WarrantyResponse", "WarrantyClaimCreate", "WarrantyClaimResponse",
    # Cashback
    "CashbackWalletResponse", "CashbackTransactionResponse",
]
