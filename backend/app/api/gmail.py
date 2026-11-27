import logging
import uuid
from collections import defaultdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.gmail.crypto import encrypt_token, verify_oauth_state
from app.gmail.oauth_service import (
    GMAIL_READONLY_SCOPE,
    build_gmail_auth_url,
    exchange_code_for_tokens,
    fetch_google_email,
    is_gmail_oauth_configured,
    revoke_refresh_token,
)
from app.gmail.sync_service import sync_user_gmail_subscriptions
from app.models.models import (
    GmailConnection,
    Subscription,
    SubscriptionEmailEvent,
    SubscriptionSyncLog,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Gmail & Subscriptions"])


class SubscriptionUpdateRequest(BaseModel):
    merchant_name: str | None = Field(default=None, min_length=1, max_length=160)
    merchant_category: str | None = Field(default=None, min_length=1, max_length=80)
    amount_minor: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=8)
    billing_frequency: str | None = Field(default=None, pattern="^(weekly|monthly|quarterly|yearly|unknown)$")
    next_billing_date: date | None = None
    subscription_status: str | None = Field(default=None, pattern="^(active|trial|payment_failed|cancelled|inactive)$")
    verification_status: str | None = Field(default=None, pattern="^(confirmed|needs_confirmation)$")


def _monthly_equivalent_minor(amount_minor: int | None, frequency: str) -> int:
    if not amount_minor or amount_minor <= 0:
        return 0
    if frequency == "weekly":
        return int(round(amount_minor * 4.33))
    if frequency == "quarterly":
        return amount_minor // 3
    if frequency == "yearly":
        return amount_minor // 12
    return amount_minor


def _serialize_subscription(s: Subscription) -> dict:
    return {
        "id": s.id,
        "merchant_name": s.merchant_name,
        "merchant_category": s.merchant_category,
        "amount_minor": s.amount_minor,
        "currency": s.currency,
        "billing_frequency": s.billing_frequency,
        "last_payment_date": s.last_payment_date.isoformat() if s.last_payment_date else None,
        "next_billing_date": s.next_billing_date.isoformat() if s.next_billing_date else None,
        "subscription_status": s.subscription_status,
        "trial_end_date": s.trial_end_date.isoformat() if s.trial_end_date else None,
        "detection_confidence": s.detection_confidence,
        "verification_status": s.verification_status,
        "monthly_equivalent_minor": _monthly_equivalent_minor(s.amount_minor, s.billing_frequency),
    }


@router.get("/gmail/status")
def get_gmail_status(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conn = db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
    latest_log = db.scalar(
        select(SubscriptionSyncLog)
        .where(SubscriptionSyncLog.user_id == user.id)
        .order_by(SubscriptionSyncLog.sync_started_at.desc())
    )
    return {
        "oauth_available": is_gmail_oauth_configured(),
        "connected": conn is not None and conn.connection_status == "connected",
        "gmail_email": conn.gmail_email if conn else None,
        "connection_status": conn.connection_status if conn else "disconnected",
        "last_sync_at": conn.last_sync_at.isoformat() if (conn and conn.last_sync_at) else None,
        "differs_from_login_email": bool(conn and conn.gmail_email.lower() != user.email.lower()),
        "latest_sync": {
            "status": latest_log.sync_status,
            "messages_scanned": latest_log.messages_scanned,
            "subscriptions_detected": latest_log.subscriptions_detected,
        }
        if latest_log
        else None,
    }


@router.get("/gmail/connect")
def connect_gmail(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if not is_gmail_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gmail connection is not available right now.",
        )
    auth_url = build_gmail_auth_url(user.id)
    return {"auth_url": auth_url}


@router.get("/gmail/callback")
async def gmail_oauth_callback(
    db: Annotated[Session, Depends(get_db)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    settings = get_settings()
    frontend_base = settings.FRONTEND_URL.rstrip("/")

    if error:
        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=cancelled", status_code=302)

    if not code or not state:
        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=error", status_code=302)

    try:
        user_id = verify_oauth_state(state)
    except ValueError:
        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=error", status_code=302)

    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=error", status_code=302)

    try:
        tokens = await exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        granted_scopes = str(tokens.get("scope") or GMAIL_READONLY_SCOPE)
        if not access_token:
            raise ValueError("Missing access token")

        gmail_email = await fetch_google_email(access_token)
        if not gmail_email:
            gmail_email = user.email

        conn = db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
        if conn is None:
            if not refresh_token:
                raise ValueError("Missing refresh token on initial consent")
            conn = GmailConnection(
                id=str(uuid.uuid4()),
                user_id=user.id,
                gmail_email=gmail_email,
                encrypted_refresh_token=encrypt_token(refresh_token),
                granted_scopes=granted_scopes,
                connection_status="connected",
            )
            db.add(conn)
        else:
            conn.gmail_email = gmail_email
            if refresh_token:
                conn.encrypted_refresh_token = encrypt_token(refresh_token)
            conn.granted_scopes = granted_scopes
            conn.connection_status = "connected"
            conn.history_id = None  # Reset history cursor for fresh connected mailbox

        db.commit()
        db.refresh(conn)

        try:
            await sync_user_gmail_subscriptions(db, conn)
        except Exception as sync_exc:
            logger.warning("Initial Gmail sync failed after connect (%s)", type(sync_exc).__name__)

        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=connected", status_code=302)
    except Exception as exc:
        logger.warning("Gmail OAuth callback error (%s)", type(exc).__name__)
        return RedirectResponse(url=f"{frontend_base}/subscriptions?gmail=error", status_code=302)


@router.post("/gmail/sync")
async def sync_gmail_now(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    conn = db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
    if conn is None or conn.connection_status != "connected":
        raise HTTPException(status_code=400, detail="Please connect your Gmail account first.")
    try:
        return await sync_user_gmail_subscriptions(db, conn)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't sync your Gmail subscription emails right now. Please try again.",
        )


@router.delete("/gmail/disconnect")
async def disconnect_gmail(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    delete_data: bool = Query(default=False),
) -> dict:
    conn = db.scalar(select(GmailConnection).where(GmailConnection.user_id == user.id))
    if conn is not None:
        await revoke_refresh_token(conn.encrypted_refresh_token)
        db.delete(conn)

    if delete_data:
        events = db.scalars(select(SubscriptionEmailEvent).where(SubscriptionEmailEvent.user_id == user.id)).all()
        for ev in events:
            db.delete(ev)
        subs = db.scalars(select(Subscription).where(Subscription.user_id == user.id)).all()
        for sub in subs:
            db.delete(sub)
        logs = db.scalars(select(SubscriptionSyncLog).where(SubscriptionSyncLog.user_id == user.id)).all()
        for log in logs:
            db.delete(log)

    db.commit()
    return {"disconnected": True, "deleted_data": delete_data}


@router.get("/subscriptions")
def get_subscriptions_dashboard(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    subs = db.scalars(
        select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.merchant_name.asc())
    ).all()

    today = date.today()
    next_30 = today + timedelta(days=30)

    active_subs = [s for s in subs if s.subscription_status in ("active", "trial", "payment_failed")]
    estimated_monthly_minor = sum(
        _monthly_equivalent_minor(s.amount_minor, s.billing_frequency)
        for s in active_subs
        if s.currency == "INR" and s.subscription_status == "active"
    )
    estimated_annual_minor = estimated_monthly_minor * 12
    has_uncertain_estimates = any(
        s.amount_minor is None or s.billing_frequency == "unknown" or s.verification_status == "needs_confirmation"
        for s in active_subs
    )

    upcoming_renewals = [
        _serialize_subscription(s)
        for s in active_subs
        if s.next_billing_date and today <= s.next_billing_date <= next_30
    ]
    upcoming_renewals.sort(key=lambda x: x["next_billing_date"] or "")

    trials_ending_soon = [
        _serialize_subscription(s)
        for s in active_subs
        if s.subscription_status == "trial" and s.trial_end_date and today <= s.trial_end_date <= next_30
    ]
    failed_payments = [_serialize_subscription(s) for s in subs if s.subscription_status == "payment_failed"]

    cat_totals: dict[str, int] = defaultdict(int)
    merchant_totals: dict[str, int] = defaultdict(int)
    for s in active_subs:
        if s.currency == "INR" and s.subscription_status == "active":
            monthly = _monthly_equivalent_minor(s.amount_minor, s.billing_frequency)
            cat_totals[s.merchant_category] += monthly
            merchant_totals[s.merchant_name] += monthly

    category_breakdown = [
        {"category": k, "monthly_minor": v}
        for k, v in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    merchant_breakdown = [
        {"merchant": k, "monthly_minor": v}
        for k, v in sorted(merchant_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "summary": {
            "total_detected": len(subs),
            "active_count": len([s for s in subs if s.subscription_status == "active"]),
            "estimated_monthly_minor": estimated_monthly_minor,
            "estimated_annual_minor": estimated_annual_minor,
            "upcoming_renewals_count": len(upcoming_renewals),
            "upcoming_renewals_total_minor": sum(r["amount_minor"] or 0 for r in upcoming_renewals if r["currency"] == "INR"),
            "trials_ending_count": len(trials_ending_soon),
            "failed_payments_count": len(failed_payments),
            "has_uncertain_estimates": has_uncertain_estimates,
        },
        "subscriptions": [_serialize_subscription(s) for s in subs],
        "upcoming_renewals": upcoming_renewals,
        "trials_ending_soon": trials_ending_soon,
        "failed_payments": failed_payments,
        "category_breakdown": category_breakdown,
        "merchant_breakdown": merchant_breakdown,
    }


@router.patch("/subscriptions/{sub_id}")
def update_subscription(
    sub_id: str,
    payload: SubscriptionUpdateRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    sub = db.scalar(select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == user.id))
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(sub, field, val)
    db.commit()
    db.refresh(sub)
    return _serialize_subscription(sub)


@router.delete("/subscriptions/{sub_id}")
def delete_subscription(
    sub_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    sub = db.scalar(select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == user.id))
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    db.delete(sub)
    db.commit()
    return {"deleted": True, "id": sub_id}


@router.get("/subscriptions/{sub_id}/events")
def get_subscription_events(
    sub_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    sub = db.scalar(select(Subscription).where(Subscription.id == sub_id, Subscription.user_id == user.id))
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    events = db.scalars(
        select(SubscriptionEmailEvent)
        .where(SubscriptionEmailEvent.subscription_id == sub.id, SubscriptionEmailEvent.user_id == user.id)
        .order_by(SubscriptionEmailEvent.processed_at.desc())
    ).all()
    return [
        {
            "id": ev.id,
            "event_type": ev.event_type,
            "extracted_amount_minor": ev.extracted_amount_minor,
            "extracted_currency": ev.extracted_currency,
            "extracted_date": ev.extracted_date.isoformat() if ev.extracted_date else None,
            "extraction_confidence": ev.extraction_confidence,
            "processed_at": ev.processed_at.isoformat(),
        }
        for ev in events
    ]
