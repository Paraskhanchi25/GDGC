import asyncio
import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.gmail.detector import analyze_subscription_email, extract_email_parts
from app.gmail.oauth_service import refresh_access_token
from app.models.models import (
    GmailConnection,
    Subscription,
    SubscriptionEmailEvent,
    SubscriptionSyncLog,
)

logger = logging.getLogger(__name__)

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
GMAIL_SEARCH_QUERY = (
    'subject:(subscription OR renewal OR invoice OR receipt OR billing OR trial OR membership OR cancelled OR "payment failed") '
    "newer_than:365d"
)


async def _gmail_get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    access_token: str,
    params: dict | None = None,
    max_retries: int = 3,
) -> httpx.Response:
    delay = 1.0
    for attempt in range(max_retries):
        resp = await client.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
        if resp.status_code in (429, 500, 502, 503) and attempt < max_retries - 1:
            await asyncio.sleep(delay)
            delay *= 2
            continue
        return resp
    return resp


async def fetch_candidate_message_ids(
    access_token: str,
    history_id: str | None = None,
    max_messages: int = 60,
) -> tuple[list[str], str | None]:
    """
    Use incremental historyId sync when available, falling back to targeted
    Gmail search pagination when historyId is missing or expired (404).
    """
    msg_ids: list[str] = []
    latest_history_id = history_id

    async with httpx.AsyncClient(timeout=20.0) as client:
        if history_id:
            resp = await _gmail_get_with_retry(
                client,
                f"{GMAIL_API_BASE}/history",
                access_token,
                params={"startHistoryId": history_id, "historyTypes": "messageAdded"},
            )
            if resp.status_code == 200:
                data = resp.json()
                latest_history_id = str(data.get("historyId") or history_id)
                for h in data.get("history") or []:
                    for added in h.get("messagesAdded") or []:
                        mid = (added.get("message") or {}).get("id")
                        if mid and mid not in msg_ids:
                            msg_ids.append(mid)
                return msg_ids[:max_messages], latest_history_id
            # If 404 (expired historyId), fall back to controlled search resync

        page_token: str | None = None
        while len(msg_ids) < max_messages:
            params: dict = {"q": GMAIL_SEARCH_QUERY, "maxResults": min(25, max_messages - len(msg_ids))}
            if page_token:
                params["pageToken"] = page_token
            resp = await _gmail_get_with_retry(client, f"{GMAIL_API_BASE}/messages", access_token, params=params)
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("messages") or []:
                mid = item.get("id")
                if mid and mid not in msg_ids:
                    msg_ids.append(mid)
            page_token = data.get("nextPageToken")
            if not page_token:
                break

        profile_resp = await _gmail_get_with_retry(client, f"{GMAIL_API_BASE}/profile", access_token)
        if profile_resp.status_code == 200:
            latest_history_id = str(profile_resp.json().get("historyId") or latest_history_id or "")

    return msg_ids, latest_history_id


def apply_detected_event(
    db: Session,
    user_id: str,
    event,
) -> Subscription | None:
    """
    Deduplicate by (user_id, gmail_message_id), upsert the Subscription record,
    and record the SubscriptionEmailEvent without storing raw email bodies.
    """
    already_processed = db.scalar(
        select(SubscriptionEmailEvent).where(
            SubscriptionEmailEvent.user_id == user_id,
            SubscriptionEmailEvent.gmail_message_id == event.gmail_message_id,
        )
    )
    if already_processed is not None:
        return None

    if not event.is_subscription:
        return None

    sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.merchant_name == event.merchant_name,
        )
    )

    if sub is None:
        initial_status = "active"
        if event.event_type == "subscription_cancelled":
            initial_status = "cancelled"
        elif event.event_type == "payment_failed":
            initial_status = "payment_failed"
        elif event.event_type in ("free_trial_started", "trial_ending"):
            initial_status = "trial"

        sub = Subscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            merchant_name=event.merchant_name,
            merchant_category=event.merchant_category,
            amount_minor=event.amount_minor,
            currency=event.currency,
            billing_frequency=event.billing_frequency,
            last_payment_date=event.event_date if event.event_type == "payment_successful" else None,
            next_billing_date=event.next_billing_date,
            subscription_status=initial_status,
            trial_end_date=event.trial_end_date,
            detection_confidence=event.confidence,
            verification_status=(
                "confirmed"
                if (event.amount_minor is not None and event.billing_frequency != "unknown" and event.confidence >= 0.8)
                else "needs_confirmation"
            ),
        )
        db.add(sub)
        db.flush()
    else:
        if event.amount_minor is not None:
            sub.amount_minor = event.amount_minor
            sub.currency = event.currency
        if event.billing_frequency != "unknown":
            sub.billing_frequency = event.billing_frequency
        if event.event_type == "payment_successful" and event.event_date:
            if sub.last_payment_date is None or event.event_date >= sub.last_payment_date:
                sub.last_payment_date = event.event_date
                if sub.subscription_status in ("trial", "payment_failed"):
                    sub.subscription_status = "active"
        if event.next_billing_date:
            sub.next_billing_date = event.next_billing_date
        if event.trial_end_date:
            sub.trial_end_date = event.trial_end_date
        if event.event_type == "subscription_cancelled" and event.confidence >= 0.7:
            sub.subscription_status = "cancelled"
        elif event.event_type == "payment_failed":
            sub.subscription_status = "payment_failed"
        elif event.event_type in ("free_trial_started", "trial_ending") and sub.subscription_status != "active":
            sub.subscription_status = "trial"
        sub.detection_confidence = max(sub.detection_confidence, event.confidence)

    db.add(
        SubscriptionEmailEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            subscription_id=sub.id,
            gmail_message_id=event.gmail_message_id,
            event_type=event.event_type,
            merchant_name=event.merchant_name,
            extracted_amount_minor=event.amount_minor,
            extracted_currency=event.currency,
            extracted_date=event.event_date,
            extraction_confidence=event.confidence,
        )
    )
    db.flush()
    return sub


async def sync_user_gmail_subscriptions(db: Session, conn: GmailConnection) -> dict:
    """Run incremental or initial Gmail sync for a connected user."""
    sync_log = SubscriptionSyncLog(
        id=str(uuid.uuid4()),
        user_id=conn.user_id,
        sync_started_at=datetime.now(timezone.utc),
        sync_status="running",
    )
    db.add(sync_log)
    db.commit()

    scanned = 0
    detected = 0

    try:
        access_token = await refresh_access_token(conn.encrypted_refresh_token)
        msg_ids, new_history_id = await fetch_candidate_message_ids(access_token, history_id=conn.history_id)

        async with httpx.AsyncClient(timeout=20.0) as client:
            for mid in msg_ids:
                existing_evt = db.scalar(
                    select(SubscriptionEmailEvent).where(
                        SubscriptionEmailEvent.user_id == conn.user_id,
                        SubscriptionEmailEvent.gmail_message_id == mid,
                    )
                )
                if existing_evt is not None:
                    continue

                resp = await _gmail_get_with_retry(
                    client,
                    f"{GMAIL_API_BASE}/messages/{mid}",
                    access_token,
                    params={"format": "full"},
                )
                if resp.status_code != 200:
                    continue
                scanned += 1
                sender, subject, email_date, body_text = extract_email_parts(resp.json())
                event = analyze_subscription_email(mid, sender, subject, email_date, body_text)
                if apply_detected_event(db, conn.user_id, event) is not None:
                    detected += 1

        now = datetime.now(timezone.utc)
        conn.last_sync_at = now
        conn.connection_status = "connected"
        if new_history_id:
            conn.history_id = new_history_id

        sync_log.sync_completed_at = now
        sync_log.messages_scanned = scanned
        sync_log.subscriptions_detected = detected
        sync_log.sync_status = "completed"
        db.commit()

        return {
            "status": "completed",
            "messages_scanned": scanned,
            "subscriptions_detected": detected,
        }
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            conn.connection_status = "revoked"
        sync_log.sync_completed_at = datetime.now(timezone.utc)
        sync_log.sync_status = "failed"
        sync_log.errors = f"Gmail sync error ({exc.response.status_code})"
        db.commit()
        raise RuntimeError("Unable to sync Gmail right now.") from exc
    except Exception as exc:
        logger.warning("Gmail sync failed (%s)", type(exc).__name__)
        sync_log.sync_completed_at = datetime.now(timezone.utc)
        sync_log.sync_status = "failed"
        sync_log.errors = type(exc).__name__
        db.commit()
        raise RuntimeError("Unable to sync Gmail right now.") from exc
