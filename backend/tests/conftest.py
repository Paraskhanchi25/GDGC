"""Tests never use real deployment credentials loaded from the repository .env."""
import pytest
from app.core.config import get_settings

@pytest.fixture(autouse=True)
def isolated_external_settings(monkeypatch):
    for name in ("GEMINI_API_KEY", "GEMINI_MODEL", "DATABASE_URL", "DIRECT_DATABASE_URL", "FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"):
        monkeypatch.setenv(name, "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
