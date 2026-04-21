from pydantic import BaseModel, ConfigDict, field_validator
import re


class PhoneLoginRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak")
        return v


class OTPVerifyRequest(BaseModel):
    phone: str
    code: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

    model_config = ConfigDict(from_attributes=True)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserRegisterRequest(BaseModel):
    phone: str
    full_name: str
    role: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("customer", "partner"):
            raise ValueError("Rol 'customer' yoki 'partner' bo'lishi kerak")
        return v
