from datetime import date, timedelta

from fastapi import HTTPException
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_current_user
from app.api.v1 import (
    create_goal,
    create_transaction,
    delete_transaction,
    get_conversation,
    list_goals,
    list_notifications,
    list_transactions,
    mark_notification_read,
    update_transaction,
)
from app.core.security import verify_firebase_token
from app.db.base import Base
from app.financial.affordability import evaluate_purchase_affordability
from app.financial.csv_import import parse_csv_transactions
from app.financial.money import format_inr, rupees_to_paise
from app.financial.recurring import detect_recurring_payments
from app.financial.transactions import TxRecord
from app.main import app, health_check
from app.models.models import AIConversation, Notification
from app.schemas.api import GoalCreate, TransactionCreate, TransactionUpdate
from app.storage.service import StorageService


def _make_memory_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)()


def test_money_conversion_and_formatting():
    assert rupees_to_paise("150.50") == 15050
    assert rupees_to_paise("₹12,000") == 1200000
    assert format_inr(1200000) == "₹12,000"
    assert format_inr(15050) == "₹150.50"
    assert format_inr(-450000) == "-₹4,500"


def test_recurring_detection():
    today = date(2026, 11, 27)
    records = [
        TxRecord("1", "Spotify India", "Plan", 11900, "INR", "expense", "Subscriptions", "UPI", "GPay", today - timedelta(days=60)),
        TxRecord("2", "Spotify India", "Plan", 11900, "INR", "expense", "Subscriptions", "UPI", "GPay", today - timedelta(days=30)),
        TxRecord("3", "Spotify India", "Plan", 11900, "INR", "expense", "Subscriptions", "UPI", "GPay", today),
    ]
    detected = detect_recurring_payments(records, ref_date=today)
    assert len(detected) == 1
    assert detected[0]["merchant"] == "Spotify India"
    assert detected[0]["frequency"] == "monthly"
    assert detected[0]["confidence"] >= 0.85


def test_affordability_outcomes():
    res_bad = evaluate_purchase_affordability(
        purchase_name="Laptop",
        purchase_amount_minor=4500000,
        available_funds_minor=845000,
        expected_incoming_income_minor=1200000,
        upcoming_commitments_minor=130700,
        savings_commitments_minor=500000,
        active_goals=[],
    )
    assert res_bad["outcome"] == "not_recommended"

    res_good = evaluate_purchase_affordability(
        purchase_name="Headphones",
        purchase_amount_minor=150000,
        available_funds_minor=1500000,
        expected_incoming_income_minor=1200000,
        upcoming_commitments_minor=100000,
        savings_commitments_minor=200000,
        active_goals=[],
    )
    assert res_good["outcome"] == "affordable"


def test_csv_import_and_duplicate_detection():
    existing = [
        TxRecord("1", "Swiggy", "Lunch", 28500, "INR", "expense", "Food", "UPI", "GPay", date(2026, 11, 20))
    ]
    csv_data = b"date,merchant,amount,type\n2026-11-20,Swiggy,285,expense\n2026-11-21,Blinkit,420,expense\n"
    parsed = parse_csv_transactions(csv_data, existing)
    assert parsed["valid_count"] == 2
    assert parsed["duplicate_count"] == 1
    assert parsed["rows"][0]["is_duplicate"] is True
    assert parsed["rows"][1]["category_name"] == "Groceries"


def test_health_minimal_and_demo_routes_removed():
    health = health_check()
    assert health == {"status": "ok"}

    paths = [getattr(r, "path", "") for r in app.routes]
    assert not any(p.startswith("/api/v1/demo") for p in paths)


def test_firebase_token_verification_rejects_missing_or_invalid():
    with pytest.raises(HTTPException) as exc_missing:
        verify_firebase_token(authorization=None)
    assert exc_missing.value.status_code == 401

    with pytest.raises(HTTPException) as exc_bad_format:
        verify_firebase_token(authorization="Basic abc123")
    assert exc_bad_format.value.status_code == 401

    with pytest.raises(HTTPException) as exc_empty:
        verify_firebase_token(authorization="Bearer   ")
    assert exc_empty.value.status_code == 401


def test_all_v1_routes_require_authentication():
    from app.api.v1 import router as v1_router

    assert len(v1_router.routes) > 0
    for route in v1_router.routes:
        path = getattr(route, "path", "")
        dependant = getattr(route, "dependant", None)
        dep_calls = [d.call for d in (dependant.dependencies if dependant else [])]
        assert get_current_user in dep_calls, f"Route {path} is missing get_current_user dependency"


def test_cross_user_data_isolation(tmp_path):
    db = _make_memory_db()
    user_a = get_current_user(
        {"uid": "uid-a", "email": "a@example.com", "email_verified": True, "name": "User A"},
        db,
    )
    user_b = get_current_user(
        {"uid": "uid-b", "email": "b@example.com", "email_verified": True, "name": "User B"},
        db,
    )
    assert user_a.id != user_b.id

    # User A creates a transaction & goal
    tx_a = create_transaction(
        TransactionCreate(
            merchant="Swiggy",
            description="Lunch",
            amount_minor=25000,
            currency="INR",
            transaction_type="expense",
            payment_method="UPI",
            source_name="GPay",
            transaction_date=date.today(),
        ),
        user=user_a,
        db=db,
    )
    create_goal(
        GoalCreate(name="Laptop", target_amount_minor=4500000, current_amount_minor=0, target_date=date.today() + timedelta(days=90)),
        user=user_a,
        db=db,
    )

    conv_a = AIConversation(id="conv-a", user_id=user_a.id, title="Private chat")
    notif_a = Notification(id="notif-a", user_id=user_a.id, title="Alert", message="Private", notification_type="alert")
    db.add(conv_a)
    db.add(notif_a)
    db.commit()

    # User B cannot see User A's transactions, goals, or notifications
    assert list_transactions(user=user_b, db=db, limit=100)["total"] == 0
    assert len(list_goals(user=user_b, db=db)) == 0
    assert len(list_notifications(user=user_b, db=db)["items"]) == 0

    # User B cannot mutate or read User A's resources by ID
    with pytest.raises(HTTPException) as exc_upd:
        update_transaction(tx_a["id"], TransactionUpdate(merchant="Hacked"), user=user_b, db=db)
    assert exc_upd.value.status_code == 404

    with pytest.raises(HTTPException) as exc_del:
        delete_transaction(tx_a["id"], user=user_b, db=db)
    assert exc_del.value.status_code == 404

    with pytest.raises(HTTPException) as exc_conv:
        get_conversation("conv-a", user=user_b, db=db)
    assert exc_conv.value.status_code == 404

    with pytest.raises(HTTPException) as exc_notif:
        mark_notification_read("notif-a", user=user_b, db=db)
    assert exc_notif.value.status_code == 404

    # Storage isolation: User B cannot read User A's stored file
    storage = StorageService(root=tmp_path)
    storage.save_bytes(user_a.id, "uploads/transactions", "secret.csv", b"date,merchant,amount\n")
    assert storage.list_user_files(user_b.id, "uploads/transactions") == []
    with pytest.raises(HTTPException) as exc_file:
        storage.read_file(user_b.id, "uploads/transactions", "secret.csv")
    assert exc_file.value.status_code == 404


def test_multi_bank_otp_isolation_and_date_bounds(monkeypatch):
    from app.api import accounts as accounts_api
    from app.api.v1 import get_analytics_overview
    from app.financial.activity_engine import HISTORY_END, HISTORY_START
    from app.models.models import AccountVerificationChallenge
    from app.schemas.api import AccountOtpSendRequest, AccountOtpVerifyRequest

    sent_codes: list[str] = []

    def fake_send_otp_email(to_email, otp_code, bank_name, account_type, recipient_name="there"):
        sent_codes.append(otp_code)
        return {"sent": True}

    monkeypatch.setattr(accounts_api, "send_otp_email", fake_send_otp_email)
    # Bypass cooldown check for rapid sequential test creations
    monkeypatch.setattr(accounts_api, "OTP_COOLDOWN_SECONDS", 0)

    db = _make_memory_db()
    user_a = get_current_user(
        {"uid": "uid-multi-a", "email": "multi.a@example.com", "email_verified": True, "name": "Student A"},
        db,
    )
    user_b = get_current_user(
        {"uid": "uid-multi-b", "email": "multi.b@example.com", "email_verified": True, "name": "Student B"},
        db,
    )

    # Agreement required before OTP send
    with pytest.raises(HTTPException) as exc_agree:
        accounts_api.send_account_otp(
            AccountOtpSendRequest(bank_code="hdfc", account_type="Savings Account", disclosure_accepted=False),
            user=user_a,
            db=db,
        )
    assert exc_agree.value.status_code == 400

    # Link HDFC, ICICI, and SBI for User A
    created_accounts = []
    for bank in ("hdfc", "icici", "sbi"):
        send_res = accounts_api.send_account_otp(
            AccountOtpSendRequest(bank_code=bank, account_type="Savings Account", disclosure_accepted=True),
            user=user_a,
            db=db,
        )
        cid = send_res["challenge_id"]
        code = sent_codes[-1]

        # Wrong OTP rejected
        with pytest.raises(HTTPException) as exc_bad:
            accounts_api.verify_account_otp(
                AccountOtpVerifyRequest(challenge_id=cid, otp_code="000000" if code != "000000" else "999999"),
                user=user_a,
                db=db,
            )
        assert exc_bad.value.status_code == 400

        # Valid OTP creates account
        ver_res = accounts_api.verify_account_otp(
            AccountOtpVerifyRequest(challenge_id=cid, otp_code=code),
            user=user_a,
            db=db,
        )
        assert ver_res["status"] == "ready"
        acc = ver_res["account"]
        created_accounts.append(acc)

        # Idempotent retry does not create duplicate
        retry_res = accounts_api.verify_account_otp(
            AccountOtpVerifyRequest(challenge_id=cid, otp_code=code),
            user=user_a,
            db=db,
        )
        assert retry_res["account"]["id"] == acc["id"]

    # Unique last-four suffixes
    suffixes = {a["last_four"] for a in created_accounts}
    assert len(suffixes) == 3

    hdfc_acc, icici_acc, sbi_acc = created_accounts

    # Verify strict account isolation + date bounds (Jan 1 -> Nov 27, 2026)
    hdfc_txs = list_transactions(user=user_a, db=db, account_id=hdfc_acc["id"], limit=500)["items"]
    icici_txs = list_transactions(user=user_a, db=db, account_id=icici_acc["id"], limit=500)["items"]
    assert len(hdfc_txs) > 20
    assert len(icici_txs) > 20
    assert all(t["account_id"] == hdfc_acc["id"] for t in hdfc_txs)
    assert all(t["account_id"] == icici_acc["id"] for t in icici_txs)

    for tx in hdfc_txs + icici_txs:
        tx_dt = date.fromisoformat(tx["transaction_date"])
        assert HISTORY_START <= tx_dt <= HISTORY_END

    assert any(t["transaction_date"] == "2026-11-27" for t in hdfc_txs)
    assert any(t["transaction_date"] == "2026-11-27" for t in icici_txs)

    # Aggregate vs individual overview balance
    all_ov = get_analytics_overview(user=user_a, db=db, account_id="all")
    hdfc_ov = get_analytics_overview(user=user_a, db=db, account_id=hdfc_acc["id"])
    assert hdfc_ov["available_balance_minor"] == hdfc_acc["current_balance_minor"]
    assert all_ov["available_balance_minor"] == (
        hdfc_acc["current_balance_minor"] + icici_acc["current_balance_minor"] + sbi_acc["current_balance_minor"]
    )

    # Cross-user isolation on account endpoints
    with pytest.raises(HTTPException) as exc_other_acc:
        list_transactions(user=user_b, db=db, account_id=hdfc_acc["id"], limit=100)
    assert exc_other_acc.value.status_code == 404

    with pytest.raises(HTTPException) as exc_other_del:
        accounts_api.remove_account(hdfc_acc["id"], user=user_b, db=db)
    assert exc_other_del.value.status_code == 404


@pytest.mark.asyncio
async def test_gmail_oauth_crypto_subscription_detection_and_isolation(monkeypatch):
    from app.api import gmail as gmail_api
    from app.gmail.crypto import create_oauth_state, decrypt_token, encrypt_token, verify_oauth_state
    from app.gmail.detector import analyze_subscription_email
    from app.gmail.sync_service import apply_detected_event
    from app.models.models import GmailConnection

    # 1. Token encryption & CSRF OAuth state validation
    secret_refresh = "1//0gFakeRefreshTokenForTesting"
    enc = encrypt_token(secret_refresh)
    assert enc != secret_refresh
    assert decrypt_token(enc) == secret_refresh

    state = create_oauth_state("user-123")
    assert verify_oauth_state(state) == "user-123"
    with pytest.raises(ValueError):
        verify_oauth_state(state + "tampered")

    # 2. Subscription email detection rules
    netflix_evt = analyze_subscription_email(
        gmail_message_id="msg-netflix-1",
        sender="Netflix <info@mailer.netflix.com>",
        subject="Your Netflix monthly subscription renewal receipt",
        email_date=date(2026, 11, 15),
        body_text="Your monthly plan renewed for ₹649. Next billing date: 2026-12-15.",
    )
    assert netflix_evt.is_subscription is True
    assert netflix_evt.merchant_name == "Netflix"
    assert netflix_evt.amount_minor == 64900
    assert netflix_evt.billing_frequency == "monthly"
    assert netflix_evt.event_type == "payment_successful"

    # One-time purchase must NOT be classified as a subscription
    one_time_evt = analyze_subscription_email(
        gmail_message_id="msg-order-1",
        sender="Amazon <auto-confirm@amazon.in>",
        subject="Your Amazon order shipped",
        email_date=date(2026, 11, 16),
        body_text="Your one-time purchase of ₹1,299 has been delivered on 2026-11-16. Tracking number: 12345.",
    )
    assert one_time_evt.is_subscription is False

    # Missing amount handled safely without fabricating values
    missing_amt_evt = analyze_subscription_email(
        gmail_message_id="msg-spotify-trial",
        sender="Spotify <no-reply@spotify.com>",
        subject="Your Spotify free trial is ending soon",
        email_date=date(2026, 11, 20),
        body_text="Your free trial ends on 2026-11-28. Manage your subscription anytime.",
    )
    assert missing_amt_evt.is_subscription is True
    assert missing_amt_evt.amount_minor is None
    assert missing_amt_evt.event_type == "trial_ending"
    assert missing_amt_evt.trial_end_date == date(2026, 11, 28)

    # Payment failure & cancellation updates
    db = _make_memory_db()
    user_a = get_current_user({"uid": "gmail-a", "email": "ga@example.com", "email_verified": True, "name": "GA"}, db)
    user_b = get_current_user({"uid": "gmail-b", "email": "gb@example.com", "email_verified": True, "name": "GB"}, db)

    sub = apply_detected_event(db, user_a.id, netflix_evt)
    assert sub is not None
    # Duplicate message ID ignored
    assert apply_detected_event(db, user_a.id, netflix_evt) is None

    # Price change + payment failure + cancellation
    price_change_evt = analyze_subscription_email(
        "msg-netflix-2",
        "Netflix <info@mailer.netflix.com>",
        "Your Netflix plan changed",
        date(2026, 11, 18),
        "Your monthly subscription plan changed to ₹799.",
    )
    apply_detected_event(db, user_a.id, price_change_evt)
    assert sub.amount_minor == 79900

    cancel_evt = analyze_subscription_email(
        "msg-netflix-3",
        "Netflix <info@mailer.netflix.com>",
        "Netflix subscription cancelled",
        date(2026, 11, 22),
        "Your subscription cancellation is confirmed.",
    )
    apply_detected_event(db, user_a.id, cancel_evt)
    assert sub.subscription_status == "cancelled"

    apply_detected_event(db, user_a.id, missing_amt_evt)
    db.commit()

    # Dashboard totals & cross-user isolation
    dash_a = gmail_api.get_subscriptions_dashboard(user=user_a, db=db)
    dash_b = gmail_api.get_subscriptions_dashboard(user=user_b, db=db)
    assert dash_a["summary"]["total_detected"] == 2
    assert dash_b["summary"]["total_detected"] == 0

    with pytest.raises(HTTPException) as exc_sub_iso:
        gmail_api.delete_subscription(sub.id, user=user_b, db=db)
    assert exc_sub_iso.value.status_code == 404

    # Callback cancellation & disconnect
    resp_cancel = await gmail_api.gmail_oauth_callback(db=db, error="access_denied")
    assert resp_cancel.status_code == 302
    assert "gmail=cancelled" in resp_cancel.headers["location"]

    db.add(
        GmailConnection(
            id="gc-1",
            user_id=user_a.id,
            gmail_email="different.gmail@gmail.com",
            encrypted_refresh_token=enc,
        )
    )
    db.commit()
    status_a = gmail_api.get_gmail_status(user=user_a, db=db)
    assert status_a["connected"] is True
    assert status_a["differs_from_login_email"] is True


