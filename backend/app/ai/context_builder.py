from app.ai.schemas import CopilotContext
from app.financial.money import format_inr
from app.financial.transactions import TxRecord


def build_copilot_context(
    user_label: str,
    records: list[TxRecord],
    monthly_allowance_minor: int,
    available_balance_minor: int,
    category_breakdown: list[dict],
    recurring_payments: list[dict],
    forecast: dict,
    savings_goals: list[dict],
) -> CopilotContext:
    recent = [
        {
            "date": t.transaction_date.isoformat(),
            "merchant": t.merchant,
            "category": t.category_name,
            "type": t.transaction_type,
            "amount": format_inr(t.amount_minor),
            "payment_method": t.payment_method,
        }
        for t in sorted(records, key=lambda x: x.transaction_date, reverse=True)[:15]
    ]

    goals_summary = [
        {
            "name": g["name"],
            "progress_percentage": g["progress_percentage"],
            "saved": format_inr(g["current_amount_minor"]),
            "target": format_inr(g["target_amount_minor"]),
            "required_weekly": format_inr(g["required_weekly_minor"]),
        }
        for g in savings_goals
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
        user_label=user_label,
        currency="INR",
        available_balance_formatted=format_inr(available_balance_minor),
        monthly_allowance_formatted=format_inr(monthly_allowance_minor),
        current_month_spending_formatted=format_inr(forecast.get("current_spending_minor", 0)),
        remaining_allowance_formatted=format_inr(forecast.get("remaining_allowance_minor", 0)),
        top_categories=category_breakdown[:6],
        upcoming_recurring=recurring_summary,
        forecast_summary=forecast.get("summary", ""),
        savings_goals=goals_summary,
        recent_transactions=recent,
    )
