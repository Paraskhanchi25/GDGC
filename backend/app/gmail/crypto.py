import base64
import hashlib
import hmac
import json
import secrets
import time

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _get_fernet() -> Fernet:
    settings = get_settings()
    raw_key = settings.GOOGLE_OAUTH_ENCRYPTION_KEY.strip()
    if raw_key:
        try:
            return Fernet(raw_key.encode("utf-8"))
        except Exception:
            derived = base64.urlsafe_b64encode(hashlib.sha256(raw_key.encode("utf-8")).digest())
            return Fernet(derived)
    derived = base64.urlsafe_b64encode(hashlib.sha256(settings.APP_SECRET_KEY.encode("utf-8")).digest())
    return Fernet(derived)


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt stored credentials.") from exc


def create_oauth_state(user_id: str, ttl_seconds: int = 600) -> str:
    settings = get_settings()
    payload = {
        "uid": user_id,
        "nonce": secrets.token_urlsafe(12),
        "exp": int(time.time()) + ttl_seconds,
    }
    raw = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("utf-8")
    sig = hmac.new(settings.APP_SECRET_KEY.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_oauth_state(state: str) -> str:
    settings = get_settings()
    if not state or "." not in state:
        raise ValueError("Invalid OAuth state.")
    raw, sig = state.rsplit(".", 1)
    expected_sig = hmac.new(settings.APP_SECRET_KEY.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("OAuth state signature mismatch.")
    try:
        payload = json.loads(base64.urlsafe_b64decode(raw.encode("utf-8")).decode("utf-8"))
    except Exception as exc:
        raise ValueError("Malformed OAuth state.") from exc
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("OAuth state has expired.")
    uid = payload.get("uid")
    if not uid:
        raise ValueError("Missing user in OAuth state.")
    return str(uid)
