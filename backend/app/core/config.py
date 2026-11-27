from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
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

    # Gemini Enterprise Gateway
    GEMINI_GATEWAY_URL: str = ""
    GEMINI_GATEWAY_KEY: str = ""
    GEMINI_GATEWAY_MODEL: str = ""
    GEMINI_GATEWAY_PROTOCOL: str = ""
    GEMINI_GATEWAY_PATH: str = ""

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
