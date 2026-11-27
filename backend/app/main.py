import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.accounts import router as accounts_router
from app.api.gmail import router as gmail_router
from app.api.v1 import router as v1_router
from app.api.smart_entry import router as smart_entry_router
from app.api.academy import router as academy_router
from app.api.showcase import router as showcase_router
from app.core.config import get_settings
from app.core.logging import request_id_ctx, setup_logging
from app.core.security import init_firebase

setup_logging()
logger = logging.getLogger(__name__)


class RequestIDMiddleware:
    """Pure ASGI middleware to attach X-Request-ID without BaseHTTPMiddleware overhead."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        req_id = headers.get(b"x-request-id", b"").decode("latin1") or uuid.uuid4().hex[:12]
        token = request_id_ctx.set(req_id)

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers", []))
                raw_headers.append((b"x-request-id", req_id.encode("latin1")))
                if scope.get("path", "").startswith("/api/"):
                    raw_headers.append((b"cache-control", b"private, no-store"))
                message["headers"] = raw_headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            request_id_ctx.reset(token)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    logger.info("Starting PULSE backend (env=%s)", settings.APP_ENV)
    init_firebase()
    yield
    logger.info("Shutting down PULSE backend")


app = FastAPI(
    title="PULSE Financial Intelligence API",
    version="1.0.0",
    description="Student Financial Intelligence Platform backend (INR / paise-accurate).",
    lifespan=lifespan,
)

settings = get_settings()
allowed_origins = [
    origin
    for origin in {
        settings.FRONTEND_URL.rstrip("/"),
        "https://gdgc.swappy.lol",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    }
    if origin
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(RequestIDMiddleware)


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    return {"status": "ok"}


app.include_router(accounts_router)
app.include_router(gmail_router)
app.include_router(v1_router)
app.include_router(smart_entry_router)
app.include_router(academy_router)
app.include_router(showcase_router)
