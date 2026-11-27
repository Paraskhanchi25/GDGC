from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(Path(__file__).resolve().parents[3] / ".env", Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_DEBUG: bool = False
    APP_SECRET_KEY: str = "dev-secret-key-change-in-production"
    FRONTEND_URL: str = "http://localhost:3000"
    API_BASE_URL: str = "http://127.0.0.1:8000"

    # Database
    DATABASE_URL: str = ""
    DIRECT_DATABASE_URL: str = ""

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # Direct Google Gemini Developer API. No gateway or alternate key fallback.
    GEMINI_PROVIDER: str = "google"
    GEMINI_API_KEY: str = Field(default="", repr=False)
    GEMINI_MODEL: str = ""
    GEMINI_MAX_INPUT_CHARS: int = Field(default=12000, ge=2000, le=64000)
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(default=512, ge=32, le=2048)
    GEMINI_TIMEOUT_SECONDS: float = Field(default=25, ge=1, le=60)
    GEMINI_REQUESTS_PER_MINUTE: int = Field(default=6, ge=1, le=60)
    GEMINI_DUPLICATE_WINDOW_SECONDS: int = Field(default=15, ge=0, le=120)

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@pulse.local"
    SMTP_USE_TLS: bool = True

    # Gmail OAuth 2.0 (Read-Only Subscription Detection)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    GOOGLE_OAUTH_ENCRYPTION_KEY: str = ""

    # Storage
    STORAGE_ROOT: str = "/app/storage"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_TO_FILE: bool = True

    # Networking
    PORT: int = 3000
    BACKEND_PORT: int = 8000

    @property
    def storage_path(self) -> Path:
        return Path(self.STORAGE_ROOT)

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
