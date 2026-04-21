from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "AVELO"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"
    DEBUG: bool = True
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"

    # PostgreSQL
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "ustatopish"
    POSTGRES_USER: str = "ustatopish_user"
    POSTGRES_PASSWORD: str = "ustatopish_dev_pass_2024"
    DATABASE_URL: str = "postgresql+asyncpg://ustatopish_user:ustatopish_dev_pass_2024@db:5432/ustatopish"

    # JWT
    JWT_SECRET_KEY: str = "jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OTP
    OTP_TEST_MODE: bool = True
    OTP_TEST_CODE: str = "1234"

    @property
    def allowed_origins(self) -> list[str]:
        return [
            "http://localhost:3741",
            "http://127.0.0.1:3741",
            "http://localhost:3000",
            "http://localhost:8742",
        ]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
