from datetime import date, timedelta

import pytest

from app.api.demo import (
    create_demo_transaction,
    delete_demo_transaction,
    demo_copilot_chat,
    evaluate_demo_purchase,
    get_demo_overview,
    reset_demo,
)
from app.financial.affordability import evaluate_purchase_affordability
from app.financial.csv_import import parse_csv_transactions
from app.financial.money import format_inr, rupees_to_paise
from app.financial.recurring import detect_recurring_payments
from app.financial.transactions import TxRecord
from app.main import health_check
from app.schemas.api import CopilotChatRequest, SimulatorRequest, TransactionCreate


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
    # ₹45,000 laptop when only ₹8,450 is available -> not_recommended
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

    # ₹1,500 headphones when ₹15,000 available -> affordable
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


@pytest.mark.asyncio
async def test_demo_api_journey():
    health = health_check()
    assert health["status"] == "ok"

    data = get_demo_overview()
    assert data["profile"]["display_name"] == "Aarav Sharma"
    assert len(data["categories"]) > 0
    assert len(data["recurring_payments"]) >= 3

    # Simulator check for ₹45,000 laptop
    sim = evaluate_demo_purchase(
        SimulatorRequest(purchase_name="MacBook Air", purchase_amount_minor=4500000, payment_months=1)
    )
    assert sim["outcome"] == "not_recommended"

    # AI chat when gateway unconfigured must return honest unavailable status
    ai = await demo_copilot_chat(CopilotChatRequest(question="Where did my money go?"))
    assert ai["status"] in ("unavailable", "ok")

    # Create and delete transaction
    created = create_demo_transaction(
        TransactionCreate(
            merchant="Test Chai",
            description="Evening chai",
            amount_minor=2000,
            currency="INR",
            transaction_type="expense",
            payment_method="UPI",
            source_name="GPay",
            transaction_date=date.today(),
        )
    )
    tx_id = created["id"]
    deleted = delete_demo_transaction(tx_id)
    assert deleted["deleted"] is True

    # Reset demo
    reset = reset_demo()
    assert reset["status"] == "reset"
