import logging
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings
from app.gmail.crypto import create_oauth_state, decrypt_token

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
OAUTH_SCOPES = f"{GMAIL_READONLY_SCOPE} openid email"


def is_gmail_oauth_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.GOOGLE_CLIENT_ID.strip()
        and settings.GOOGLE_CLIENT_SECRET.strip()
        and settings.GOOGLE_REDIRECT_URI.strip()
    )


def build_gmail_auth_url(user_id: str) -> str:
    settings = get_settings()
    if not is_gmail_oauth_configured():
        raise RuntimeError("Gmail connection is not configured.")
    state = create_oauth_state(user_id)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID.strip(),
        "redirect_uri": settings.GOOGLE_REDIRECT_URI.strip(),
        "response_type": "code",
        "scope": OAUTH_SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID.strip(),
                "client_secret": settings.GOOGLE_CLIENT_SECRET.strip(),
                "redirect_uri": settings.GOOGLE_REDIRECT_URI.strip(),
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_google_email(access_token: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data.get("email") or "").strip()


async def refresh_access_token(encrypted_refresh_token: str) -> str:
    settings = get_settings()
    refresh_token = decrypt_token(encrypted_refresh_token)
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID.strip(),
                "client_secret": settings.GOOGLE_CLIENT_SECRET.strip(),
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise RuntimeError("No access token returned on refresh.")
        return str(token)


async def revoke_refresh_token(encrypted_refresh_token: str) -> None:
    try:
        token = decrypt_token(encrypted_refresh_token)
    except ValueError:
        return
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(GOOGLE_REVOKE_URL, params={"token": token})
    except Exception as exc:
        logger.warning("Google token revocation request failed (%s)", type(exc).__name__)
