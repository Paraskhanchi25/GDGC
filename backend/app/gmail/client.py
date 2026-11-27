import asyncio
import logging
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

SUBSCRIPTION_SEARCH_QUERY = (
    "(subscription OR renewal OR recurring OR \"free trial\" OR \"payment failed\" "
    "OR \"auto-renew\" OR membership OR invoice OR receipt) "
    "-category:promotions -category:social"
)


def is_gmail_oauth_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.GOOGLE_CLIENT_ID.strip()
        and settings.GOOGLE_CLIENT_SECRET.strip()
        and settings.GOOGLE_REDIRECT_URI.strip()
    )


def build_google_oauth_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GMAIL_READONLY_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "false",
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
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise ValueError("Missing access_token from refresh response.")
        return str(token)


async def revoke_google_token(token: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(GOOGLE_REVOKE_URL, params={"token": token})
    except Exception as exc:
        logger.warning("Token revocation request failed: %s", type(exc).__name__)


async def _gmail_get(client: httpx.AsyncClient, access_token: str, path: str, params: dict | None = None) -> dict:
    url = f"{GMAIL_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {access_token}"}
    for attempt in range(3):
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code in (429, 500, 502, 503, 504) and attempt < 2:
            await asyncio.sleep(0.5 * (2**attempt))
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()
    return {}


async def fetch_gmail_profile(access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        return await _gmail_get(client, access_token, "/profile")


async def list_subscription_message_ids(
    access_token: str,
    history_id: str | None = None,
    max_pages: int = 3,
) -> tuple[list[str], str | None]:
    """
    Fetch candidate message IDs incrementally via Gmail historyId when available,
    falling back to controlled search query pagination if historyId is missing or expired (404).
    """
    async with httpx.AsyncClient(timeout=20.0) as client:
        if history_id:
            try:
                hist_data = await _gmail_get(
                    client,
                    access_token,
                    "/history",
                    params={"startHistoryId": history_id, "historyTypes": "messageAdded"},
                )
                msg_ids: list[str] = []
                for h in hist_data.get("history") or []:
                    for added in h.get("messagesAdded") or []:
                        mid = (added.get("message") or {}).get("id")
                        if mid:
                            msg_ids.append(mid)
                return list(dict.fromkeys(msg_ids)), hist_data.get("historyId") or history_id
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code != 404:
                    raise
                logger.info("Gmail historyId expired; performing controlled resync.")

        msg_ids = []
        page_token: str | None = None
        for _ in range(max_pages):
            params: dict = {"q": SUBSCRIPTION_SEARCH_QUERY, "maxResults": 25}
            if page_token:
                params["pageToken"] = page_token
            data = await _gmail_get(client, access_token, "/messages", params=params)
            for item in data.get("messages") or []:
                if item.get("id"):
                    msg_ids.append(item["id"])
            page_token = data.get("nextPageToken")
            if not page_token:
                break

        profile = await _gmail_get(client, access_token, "/profile")
        return list(dict.fromkeys(msg_ids)), profile.get("historyId")


async def fetch_gmail_message(access_token: str, message_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        return await _gmail_get(client, access_token, f"/messages/{message_id}", params={"format": "full"})
