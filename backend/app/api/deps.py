import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_firebase_token
from app.db.session import get_db
from app.financial.analytics import (
    compute_category_breakdown,
    compute_daily_spending,
    compute_monthly_trends,
    compute_period_comparison,
    compute_totals,
    detect_unusual_spending,
)
from app.financial.forecasting import compute_allowance_forecast
from app.financial.insights import generate_financial_insights
from app.financial.recurring import detect_recurring_payments
from app.financial.savings import enrich_savings_goal
from app.financial.transactions import TxRecord
from app.models.models import NotificationPreference, User, UserProfile


def get_current_user(
    claims: Annotated[dict, Depends(verify_firebase_token)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve or provision the local User from verified Firebase UID."""
    firebase_uid = claims.get("uid")
    if not firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing UID in token.")

    user = db.scalar(select(User).where(User.firebase_uid == firebase_uid))
    if user is None:
        email = claims.get("email") or f"{firebase_uid}@pulse.local"
        display_name = claims.get("name") or email.split("@")[0]
        user = User(
            id=str(uuid.uuid4()),
            firebase_uid=firebase_uid,
            email=email,
            display_name=display_name,
        )
        db.add(user)
        db.flush()

        profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            country="India",
            currency="INR",
            monthly_allowance_minor=0,
            allowance_frequency="monthly",
            current_savings_minor=0,
            onboarding_completed=False,
        )
        prefs = NotificationPreference(
            id=str(uuid.uuid4()),
            user_id=user.id,
        )
        db.add(profile)
        db.add(prefs)
        db.commit()
        db.refresh(user)

    return user


def build_overview_payload(
    records: list[TxRecord],
    monthly_allowance_minor: int,
    available_balance_minor: int,
    expected_next_allowance_date: date | None,
    raw_goals: list[dict],
    recurring_overrides: dict[str, str] | None = None,
) -> dict:
    """Shared financial overview computation used by both demo and authenticated endpoints."""
    today = date.today()
    month_start = today.replace(day=1)
    month_records = [t for t in records if t.transaction_date >= month_start]

    totals = compute_totals(month_records)
    categories = compute_category_breakdown(month_records, "expense")
    daily = compute_daily_spending(records, days=30, ref_date=today)
    monthly = compute_monthly_trends(records, months=6)
    comparison = compute_period_comparison(records, ref_date=today)
    unusual = detect_unusual_spending(records, ref_date=today)

    recurring = detect_recurring_payments(records, ref_date=today)
    overrides = recurring_overrides or {}
    for idx, item in enumerate(recurring):
        key = item["merchant"].lower()
        item["id"] = f"rec-{idx}-{key.replace(' ', '-')}"
        if key in overrides:
            item["status"] = overrides[key]
        item["next_payment_date"] = item["next_payment_date"].isoformat()

    forecast = compute_allowance_forecast(
        records=records,
        monthly_allowance_minor=monthly_allowance_minor,
        available_balance_minor=available_balance_minor,
        upcoming_recurring=recurring,
        expected_next_allowance_date=expected_next_allowance_date,
        ref_date=today,
    )

    goals = [
        enrich_savings_goal(
            goal_id=g["id"],
            name=g["name"],
            target_amount_minor=g["target_amount_minor"],
            current_amount_minor=g["current_amount_minor"],
            target_date=g["target_date"] if isinstance(g["target_date"], date) else date.fromisoformat(str(g["target_date"])),
            status=g["status"],
            ref_date=today,
        )
        for g in raw_goals
    ]

    insights = generate_financial_insights(categories, comparison, forecast, recurring)

    recent_txs = [
        {
            "id": t.id,
            "merchant": t.merchant,
            "description": t.description,
            "amount_minor": t.amount_minor,
            "currency": t.currency,
            "transaction_type": t.transaction_type,
            "category_name": t.category_name,
            "payment_method": t.payment_method,
            "source_name": t.source_name,
            "transaction_date": t.transaction_date.isoformat(),
            "notes": t.notes,
        }
        for t in sorted(records, key=lambda x: x.transaction_date, reverse=True)[:8]
    ]

    return {
        "totals": totals,
        "available_balance_minor": available_balance_minor,
        "monthly_allowance_minor": monthly_allowance_minor,
        "remaining_allowance_minor": forecast["remaining_allowance_minor"],
        "categories": categories,
        "daily_spending": daily,
        "monthly_trends": monthly,
        "period_comparison": comparison,
        "unusual_spending": unusual,
        "recurring_payments": recurring,
        "forecast": forecast,
        "goals": goals,
        "insights": insights,
        "recent_transactions": recent_txs,
    }
