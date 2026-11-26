import logging
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 declarative base."""


def _normalize_db_url(url: str) -> str:
    """Ensure postgresql+psycopg:// driver scheme for psycopg 3."""
    if not url:
        return url
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine | None:
    """Lazily create the shared SQLAlchemy engine."""
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine

    settings = get_settings()
    db_url = _normalize_db_url(settings.DATABASE_URL)
    if not db_url:
        logger.warning("DATABASE_URL is not configured; database features will be unavailable.")
        return None

    connect_args: dict = {}
    if db_url.startswith("postgresql+psycopg://"):
        connect_args["connect_timeout"] = 10

    try:
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300,
            connect_args=connect_args,
        )
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, expire_on_commit=False)
        return _engine
    except Exception as exc:
        logger.error("Failed to initialize database engine: %s", type(exc).__name__)
        return None


def get_session_factory() -> sessionmaker[Session] | None:
    if _SessionLocal is None:
        get_engine()
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    factory = get_session_factory()
    if factory is None:
        raise RuntimeError("Database is not configured.")
    db = factory()
    try:
        yield db
    finally:
        db.close()


def check_database_health() -> dict[str, str]:
    """Run a lightweight connectivity check without leaking credentials."""
    engine = get_engine()
    if engine is None:
        return {"status": "unconfigured", "detail": "DATABASE_URL not set"}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as exc:
        logger.error("Database health check failed: %s", type(exc).__name__)
        return {"status": "unhealthy", "detail": type(exc).__name__}
