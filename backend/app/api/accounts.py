import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.financial.activity_engine import (
    SUPPORTED_BANKS,
    assign_unique_last_four,
    choose_behavior_profile,
    generate_account_financial_history,
    resolve_bank_name,
)
from app.models.models import (
    Account,
    AccountVerificationChallenge,
    Transaction,
    User,
    UserProfile,
)
from app.notifications.service import send_otp_email
from app.schemas.api import (
    AccountOtpResendRequest,
    AccountOtpSendRequest,
    AccountOtpVerifyRequest,
)

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])

OTP_TTL_MINUTES = 10
OTP_COOLDOWN_SECONDS = 30
OTP_MAX_SENDS_PER_WINDOW = 5
OTP_WINDOW_MINUTES = 15


def _hash_otp(user_id: str, challenge_id: str, otp_code: str) -> str:
    return hashlib.sha256(f"{user_id}:{challenge_id}:{otp_code}".encode("utf-8")).hexdigest()


def _serialize_account(acc: Account, tx_count: int = 0) -> dict:
    return {
        "id": acc.id,
        "bank_name": acc.bank_name,
        "bank_code": acc.bank_code,
        "account_name": acc.account_name,
        "account_type": acc.account_type,
        "masked_number": acc.masked_number,
        "last_four": acc.last_four,
        "current_balance_minor": acc.current_balance_minor,
        "opening_balance_minor": acc.opening_balance_minor,
        "currency": acc.currency,
        "is_active": acc.is_active,
        "transaction_count": tx_count,
        "created_at": acc.created_at.isoformat() if acc.created_at else None,
    }


@router.get("/banks")
def list_supported_banks(
    _user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    return [{"code": code, "name": name} for code, name in SUPPORTED_BANKS.items()]


@router.get("")
def list_user_accounts(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    accounts = db.scalars(
        select(Account)
        .where(Account.user_id == user.id, Account.is_active.is_(True))
        .order_by(Account.created_at.asc())
    ).all()

    counts = dict(
        db.execute(
            select(Transaction.account_id, func.count(Transaction.id))
            .where(Transaction.user_id == user.id, Transaction.account_id.is_not(None))
            .group_by(Transaction.account_id)
        ).all()
    )

    items = [_serialize_account(a, int(counts.get(a.id, 0))) for a in accounts]
    total_balance_minor = sum(a.current_balance_minor for a in accounts)
    return {
        "total_balance_minor": total_balance_minor,
        "accounts": items,
    }


@router.post("/otp/send")
def send_account_otp(
    payload: AccountOtpSendRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if not payload.disclosure_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please review and accept the disclosure before continuing.",
        )

    try:
        bank_name = resolve_bank_name(payload.bank_code)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a supported bank to continue.",
        )

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=OTP_WINDOW_MINUTES)

    recent_challenges = db.scalars(
        select(AccountVerificationChallenge)
        .where(
            AccountVerificationChallenge.user_id == user.id,
            AccountVerificationChallenge.created_at >= window_start,
        )
        .order_by(AccountVerificationChallenge.created_at.desc())
    ).all()

    if len(recent_challenges) >= OTP_MAX_SENDS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts. Please wait a few minutes before trying again.",
        )

    if recent_challenges:
        latest = recent_challenges[0]
        created = latest.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created and (now - created).total_seconds() < OTP_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait a moment before requesting another code.",
            )

    # Invalidate previous pending challenges for this user
    pending = db.scalars(
        select(AccountVerificationChallenge).where(
            AccountVerificationChallenge.user_id == user.id,
            AccountVerificationChallenge.status == "pending",
        )
    ).all()
    for ch in pending:
        ch.status = "expired"

    challenge_id = str(uuid.uuid4())
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    otp_hash = _hash_otp(user.id, challenge_id, otp_code)

    challenge = AccountVerificationChallenge(
        id=challenge_id,
        user_id=user.id,
        bank_code=payload.bank_code.strip().lower(),
        bank_name=bank_name,
        account_type=payload.account_type,
        otp_hash=otp_hash,
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        attempts=0,
        max_attempts=5,
        status="pending",
    )
    db.add(challenge)
    db.commit()

    delivery = send_otp_email(
        to_email=user.email,
        otp_code=otp_code,
        bank_name=bank_name,
        account_type=payload.account_type,
        recipient_name=user.display_name or "there",
    )
    if not delivery.get("sent"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't send the verification code right now. Please try again in a moment.",
        )

    return {
        "challenge_id": challenge_id,
        "email": user.email,
        "expires_in_seconds": OTP_TTL_MINUTES * 60,
        "cooldown_seconds": OTP_COOLDOWN_SECONDS,
    }


@router.post("/otp/resend")
def resend_account_otp(
    payload: AccountOtpResendRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    old = db.scalar(
        select(AccountVerificationChallenge).where(
            AccountVerificationChallenge.id == payload.challenge_id,
            AccountVerificationChallenge.user_id == user.id,
        )
    )
    if old is None:
        raise HTTPException(status_code=404, detail="Verification session not found. Please start again.")

    return send_account_otp(
        AccountOtpSendRequest(
            bank_code=old.bank_code,
            account_type=old.account_type,
            disclosure_accepted=True,
        ),
        user=user,
        db=db,
    )


@router.post("/otp/verify")
def verify_account_otp(
    payload: AccountOtpVerifyRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    challenge = db.scalar(
        select(AccountVerificationChallenge).where(
            AccountVerificationChallenge.id == payload.challenge_id,
            AccountVerificationChallenge.user_id == user.id,
        )
    )
    if challenge is None:
        raise HTTPException(status_code=404, detail="Verification session not found. Please start again.")

    # Idempotency: if already completed, return the already-created account
    if challenge.status == "active" and challenge.account_id:
        existing_acc = db.scalar(
            select(Account).where(Account.id == challenge.account_id, Account.user_id == user.id)
        )
        if existing_acc is not None:
            return {"status": "ready", "account": _serialize_account(existing_acc)}

    if challenge.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code is no longer active. Please request a new code.",
        )

    now = datetime.now(timezone.utc)
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        challenge.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has expired. Please request a new code.",
        )

    if challenge.attempts >= challenge.max_attempts:
        challenge.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code.",
        )

    expected_hash = _hash_otp(user.id, challenge.id, payload.otp_code)
    if not hmac.compare_digest(expected_hash, challenge.otp_hash):
        challenge.attempts += 1
        if challenge.attempts >= challenge.max_attempts:
            challenge.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That verification code doesn't match. Please check and try again.",
        )

    # Mark verified/preparing and create account + deterministic history atomically
    challenge.status = "preparing"
    db.flush()

    existing_accounts = db.scalars(
        select(Account).where(Account.user_id == user.id)
    ).all()
    existing_suffixes = {a.last_four for a in existing_accounts if a.last_four}

    last_four = assign_unique_last_four(user.id, challenge.bank_code, existing_suffixes)
    behavior_profile = choose_behavior_profile(user.id, challenge.bank_code, len(existing_accounts))

    generated = generate_account_financial_history(
        user_id=user.id,
        bank_code=challenge.bank_code,
        bank_name=challenge.bank_name,
        account_type=challenge.account_type,
        last_four=last_four,
        behavior_profile=behavior_profile,
    )

    account_id = str(uuid.uuid4())
    account = Account(
        id=account_id,
        user_id=user.id,
        account_name=generated["account_name"],
        account_type=challenge.account_type,
        provider=challenge.bank_name,
        bank_name=challenge.bank_name,
        bank_code=challenge.bank_code,
        masked_number=generated["masked_number"],
        last_four=last_four,
        opening_balance_minor=generated["opening_balance_minor"],
        current_balance_minor=generated["current_balance_minor"],
        behavior_profile=behavior_profile,
        preparation_status="active",
        disclosure_accepted_at=now,
        currency="INR",
        is_active=True,
    )
    db.add(account)
    db.flush()

    for t in generated["transactions"]:
        db.add(
            Transaction(
                id=str(uuid.uuid4()),
                user_id=user.id,
                account_id=account_id,
                merchant=t["merchant"],
                description=t["description"],
                amount_minor=t["amount_minor"],
                currency=t["currency"],
                transaction_type=t["transaction_type"],
                category_name=t["category_name"],
                payment_method=t["payment_method"],
                source_name=t["source_name"],
                transaction_date=t["transaction_date"],
            )
        )

    prof = db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
    if prof is not None:
        prof.onboarding_completed = True
        if prof.monthly_allowance_minor == 0:
            prof.monthly_allowance_minor = 1500000  # ₹15,000 sensible student default

    challenge.status = "active"
    challenge.account_id = account_id
    db.commit()
    db.refresh(account)

    return {
        "status": "ready",
        "account": _serialize_account(account, len(generated["transactions"])),
    }


@router.delete("/{account_id}")
def remove_account(
    account_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user.id, Account.is_active.is_(True))
    )
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    # Remove scoped transactions for this account
    txs = db.scalars(
        select(Transaction).where(Transaction.account_id == account_id, Transaction.user_id == user.id)
    ).all()
    for tx in txs:
        db.delete(tx)

    db.delete(account)
    db.commit()
    return {"removed": True, "id": account_id}
