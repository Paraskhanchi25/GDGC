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
