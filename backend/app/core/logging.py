import logging
import logging.handlers
import re
import sys
from contextvars import ContextVar
from pathlib import Path

from app.core.config import get_settings

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

SENSITIVE_PATTERNS = [
    re.compile(r"(Authorization:\s*Bearer\s+)[^\s]+", re.IGNORECASE),
    re.compile(r"(api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+", re.IGNORECASE),
]


class RequestContextFilter(logging.Filter):
    """Injects request_id and scrubs sensitive patterns from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        if isinstance(record.msg, str):
            for pat in SENSITIVE_PATTERNS:
                record.msg = pat.sub(r"\1[REDACTED]", record.msg)
        return True


def setup_logging() -> None:
    """Configure structured logging to stdout/stderr and optional rotating file."""
    settings = get_settings()
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()

    context_filter = RequestContextFilter()

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)
    stream_handler.addFilter(context_filter)
    root_logger.addHandler(stream_handler)

    if settings.LOG_TO_FILE:
        try:
            log_dir = Path(settings.STORAGE_ROOT) / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)
            file_handler = logging.handlers.RotatingFileHandler(
                log_dir / "pulse.log",
                maxBytes=5 * 1024 * 1024,
                backupCount=3,
                encoding="utf-8",
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            file_handler.addFilter(context_filter)
            root_logger.addHandler(file_handler)
        except Exception as exc:
            # Application must continue operating if optional file logging fails.
            root_logger.warning("File logging disabled due to error: %s", type(exc).__name__)
