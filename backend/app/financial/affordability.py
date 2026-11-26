from datetime import date

from app.financial.money import format_inr


def evaluate_purchase_affordability(
    purchase_name: str,
    purchase_amount_minor: int,
    available_funds_minor: int,
    expected_incoming_income_minor: int,
    upcoming_commitments_minor: int,
    savings_commitments_minor: int,
    active_goals: list[dict],
    payment_months: int = 1,
    purchase_date: date | None = None,
) -> dict:
    """
    Authoritative backend affordability arithmetic.
    Determines outcome strictly from integer paise balances and commitments:
      - affordable
      - affordable_with_caution
      - not_recommended
    """
    if purchase_amount_minor <= 0:
        raise ValueError("Purchase amount must be positive.")

    months = max(1, min(payment_months, 24))
    immediate_outflow_minor = purchase_amount_minor // months

    # Safety buffer: keep at least ₹2,000 or 15% of available funds as emergency cushion
    safety_buffer_minor = max(200_000, int(available_funds_minor * 0.15))

    net_usable_funds_minor = (
        available_funds_minor
        + expected_incoming_income_minor
        - upcoming_commitments_minor
        - savings_commitments_minor
    )
    projected_balance_after_purchase_minor = net_usable_funds_minor - immediate_outflow_minor
    immediate_balance_after_minor = available_funds_minor - upcoming_commitments_minor - immediate_outflow_minor

    # Assess impact on savings goals
    goal_impacts = []
    for g in active_goals:
        remaining_target = max(0, int(g["target_amount_minor"]) - int(g["current_amount_minor"]))
        if remaining_target > 0:
            delay_note = "On track"
            if immediate_balance_after_minor < safety_buffer_minor:
                delay_note = "May require pausing contributions this month"
            goal_impacts.append(
                {
                    "goal_name": g["name"],
                    "remaining_minor": remaining_target,
                    "impact": delay_note,
                }
            )

    if immediate_balance_after_minor < 0 or projected_balance_after_purchase_minor < 0:
        outcome = "not_recommended"
        shortfall = abs(min(immediate_balance_after_minor, projected_balance_after_purchase_minor))
        explanation = (
            f"Purchasing {purchase_name} ({format_inr(purchase_amount_minor)}) exceeds your safe available funds "
            f"after accounting for {format_inr(upcoming_commitments_minor)} in upcoming commitments and "
            f"{format_inr(savings_commitments_minor)} in savings commitments, leaving a shortfall of {format_inr(shortfall)}."
        )
    elif projected_balance_after_purchase_minor < safety_buffer_minor or immediate_balance_after_minor < safety_buffer_minor:
        outcome = "affordable_with_caution"
        explanation = (
            f"You can cover {purchase_name} ({format_inr(immediate_outflow_minor)} upfront), "
            f"but your remaining buffer ({format_inr(projected_balance_after_purchase_minor)}) falls below the recommended "
            f"safety cushion of {format_inr(safety_buffer_minor)}."
        )
    else:
        outcome = "affordable"
        explanation = (
            f"{purchase_name} fits within your current budget. After setting aside upcoming bills and savings commitments, "
            f"you will still retain {format_inr(projected_balance_after_purchase_minor)}."
        )

    return {
        "purchase_name": purchase_name,
        "purchase_amount_minor": purchase_amount_minor,
        "payment_months": months,
        "immediate_outflow_minor": immediate_outflow_minor,
        "purchase_date": purchase_date.isoformat() if purchase_date else None,
        "available_funds_minor": available_funds_minor,
        "expected_incoming_income_minor": expected_incoming_income_minor,
        "upcoming_commitments_minor": upcoming_commitments_minor,
        "savings_commitments_minor": savings_commitments_minor,
        "projected_balance_after_purchase_minor": projected_balance_after_purchase_minor,
        "safety_buffer_minor": safety_buffer_minor,
        "outcome": outcome,
        "explanation": explanation,
        "goal_impacts": goal_impacts,
    }
