import calendar
from datetime import date

from app.financial.money import format_inr
from app.financial.transactions import TxRecord


def compute_allowance_forecast(
    records: list[TxRecord],
    monthly_allowance_minor: int,
    available_balance_minor: int,
    upcoming_recurring: list[dict],
    expected_next_allowance_date: date | None = None,
    ref_date: date | None = None,
) -> dict:
    """
    Transparent, reproducible allowance forecast for the current month.
    Clearly communicates when historical data is insufficient.
    """
    today = ref_date or date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    month_start = today.replace(day=1)
    month_end = today.replace(day=days_in_month)
    elapsed_days = max(1, today.day)
    remaining_days = max(0, days_in_month - today.day)

    month_expenses = [
        t
        for t in records
        if t.transaction_type == "expense" and month_start <= t.transaction_date <= today
    ]
    current_spending_minor = sum(t.amount_minor for t in month_expenses)

    # Average daily spending based on current month elapsed days (or last 30 days if early in month)
    if elapsed_days >= 5 and len(month_expenses) >= 3:
        avg_daily_spending_minor = current_spending_minor // elapsed_days
        data_sufficiency = "sufficient"
        sufficiency_note = f"Based on {len(month_expenses)} expenses across {elapsed_days} days this month."
    else:
        recent_expenses = [
            t
            for t in records
            if t.transaction_type == "expense" and (today - t.transaction_date).days <= 30
        ]
        if len(recent_expenses) >= 3:
            avg_daily_spending_minor = sum(t.amount_minor for t in recent_expenses) // 30
            data_sufficiency = "limited"
            sufficiency_note = "Early in the month; average daily spend uses a 30-day rolling baseline."
        else:
            avg_daily_spending_minor = current_spending_minor // elapsed_days if current_spending_minor > 0 else 0
            data_sufficiency = "insufficient"
            sufficiency_note = "Insufficient historical transactions for a reliable daily average. Add more expenses to improve accuracy."

    expected_remaining_variable_minor = avg_daily_spending_minor * remaining_days

    # Upcoming recurring expenses due between tomorrow and month_end (excluding dismissed)
    upcoming_recurring_minor = 0
    upcoming_items = []
    for item in upcoming_recurring:
        if item.get("status") == "dismissed":
            continue
        next_dt = item.get("next_payment_date")
        if isinstance(next_dt, str):
            next_dt = date.fromisoformat(next_dt)
        if next_dt and today <= next_dt <= month_end:
            amt = int(item.get("expected_amount_minor", 0))
            upcoming_recurring_minor += amt
            upcoming_items.append(
                {
                    "merchant": item["merchant"],
                    "amount_minor": amt,
                    "due_date": next_dt.isoformat(),
                }
            )

    expected_incoming_allowance_minor = 0
    if expected_next_allowance_date and today < expected_next_allowance_date <= month_end:
        expected_incoming_allowance_minor = monthly_allowance_minor

    total_projected_outflow_minor = expected_remaining_variable_minor + upcoming_recurring_minor
    projected_month_end_balance_minor = (
        available_balance_minor + expected_incoming_allowance_minor - total_projected_outflow_minor
    )
    potential_shortfall_minor = max(0, -projected_month_end_balance_minor)

    remaining_allowance_minor = max(0, monthly_allowance_minor - current_spending_minor)

    return {
        "as_of_date": today.isoformat(),
        "month_end_date": month_end.isoformat(),
        "days_elapsed": elapsed_days,
        "days_remaining": remaining_days,
        "monthly_allowance_minor": monthly_allowance_minor,
        "current_spending_minor": current_spending_minor,
        "remaining_allowance_minor": remaining_allowance_minor,
        "available_balance_minor": available_balance_minor,
        "average_daily_spending_minor": avg_daily_spending_minor,
        "expected_remaining_spending_minor": expected_remaining_variable_minor,
        "upcoming_recurring_minor": upcoming_recurring_minor,
        "upcoming_recurring_items": upcoming_items,
        "expected_incoming_allowance_minor": expected_incoming_allowance_minor,
        "projected_month_end_balance_minor": projected_month_end_balance_minor,
        "potential_shortfall_minor": potential_shortfall_minor,
        "data_sufficiency": data_sufficiency,
        "methodology_note": sufficiency_note,
        "summary": (
            f"Projected month-end balance is {format_inr(projected_month_end_balance_minor)}."
            if potential_shortfall_minor == 0
            else f"Projected shortfall of {format_inr(potential_shortfall_minor)} before month end."
        ),
    }
