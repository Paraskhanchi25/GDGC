from app.ai.schemas import CopilotContext
from app.financial.money import format_inr
from app.financial.transactions import TxRecord
from collections import defaultdict
from datetime import date, timedelta
import re


def build_copilot_context(
    user_label: str,
    records: list[TxRecord],
    monthly_allowance_minor: int,
    available_balance_minor: int,
    category_breakdown: list[dict],
    recurring_payments: list[dict],
    forecast: dict,
    savings_goals: list[dict],
    question: str = "",
) -> CopilotContext:
    today = date.today()
    current_start = today.replace(day=1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end.replace(day=1)
    totals = defaultdict(lambda: {"current": 0, "previous": 0})
    for tx in records:
        if tx.transaction_type != "expense" or tx.transaction_date > today:
            continue
        period = "current" if tx.transaction_date >= current_start else "previous" if tx.transaction_date >= previous_start else None
        if period:
            totals[tx.category_name][period] += tx.amount_minor
    changes = [{"category": name, "current_month_to_date_minor": values["current"], "previous_full_month_minor": values["previous"], "difference_minor": values["current"] - values["previous"]} for name, values in totals.items()]
    changes.sort(key=lambda item: abs(item["difference_minor"]), reverse=True)

    goals_summary = [
        {
            "name": g["name"],
            "progress_percentage": g["progress_percentage"],
            "saved": format_inr(g["current_amount_minor"]),
            "target": format_inr(g["target_amount_minor"]),
            "required_weekly": format_inr(g["required_weekly_minor"]),
        }
        for g in savings_goals[:8]
    ]

    recurring_summary = [
        {
            "merchant": r["merchant"],
            "amount": format_inr(r["expected_amount_minor"]),
            "frequency": r["frequency"],
            "next_payment_date": str(r["next_payment_date"]),
            "status": r["status"],
        }
        for r in recurring_payments[:8]
    ]

    return CopilotContext(
        user_label="Student",
        currency="INR",
        available_balance_formatted=format_inr(available_balance_minor),
        monthly_allowance_formatted=format_inr(monthly_allowance_minor),
        current_month_spending_formatted=format_inr(forecast.get("current_spending_minor", 0)),
        remaining_allowance_formatted=format_inr(forecast.get("remaining_allowance_minor", 0)),
        top_categories=category_breakdown[:6],
        upcoming_recurring=recurring_summary,
        forecast_summary=forecast.get("summary", ""),
        savings_goals=goals_summary,
        recent_transactions=[{"date": t.transaction_date.isoformat(), "merchant": t.merchant[:80], "category": t.category_name[:80], "type": t.transaction_type, "amount": format_inr(t.amount_minor)} for t in sorted(records, key=lambda tx: tx.transaction_date, reverse=True)[:3]] if re.search(r"\b(last|recent|transaction)\b", question, re.I) else [],
        category_changes=changes[:8],
    )
