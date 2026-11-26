from datetime import date


def enrich_savings_goal(
    goal_id: str,
    name: str,
    target_amount_minor: int,
    current_amount_minor: int,
    target_date: date,
    status: str,
    ref_date: date | None = None,
) -> dict:
    """Compute progress percentage and required weekly/monthly contributions."""
    today = ref_date or date.today()
    remaining_minor = max(0, target_amount_minor - current_amount_minor)
    progress_pct = round(min(100.0, (current_amount_minor / target_amount_minor) * 100), 1) if target_amount_minor > 0 else 0.0

    days_left = max(1, (target_date - today).days)
    weeks_left = max(1.0, days_left / 7.0)
    months_left = max(1.0, days_left / 30.0)

    required_weekly_minor = int(round(remaining_minor / weeks_left)) if remaining_minor > 0 else 0
    required_monthly_minor = int(round(remaining_minor / months_left)) if remaining_minor > 0 else 0

    return {
        "id": goal_id,
        "name": name,
        "target_amount_minor": target_amount_minor,
        "current_amount_minor": current_amount_minor,
        "remaining_amount_minor": remaining_minor,
        "target_date": target_date.isoformat(),
        "status": "completed" if remaining_minor == 0 else status,
        "progress_percentage": progress_pct,
        "required_weekly_minor": required_weekly_minor,
        "required_monthly_minor": required_monthly_minor,
        "days_remaining": max(0, (target_date - today).days),
    }
