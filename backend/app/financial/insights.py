from app.financial.money import format_inr


def generate_financial_insights(
    category_breakdown: list[dict],
    period_comparison: dict,
    forecast: dict,
    recurring_payments: list[dict],
) -> list[dict]:
    """Generate deterministic, grounded financial insights from backend metrics."""
    insights: list[dict] = []

    if category_breakdown:
        top = category_breakdown[0]
        insights.append(
            {
                "id": "top-category",
                "type": "category",
                "title": f"{top['category']} is your highest spend",
                "detail": f"{top['category']} accounts for {top['percentage']}% of expenses ({top['amount_formatted']}).",
            }
        )

    change_pct = period_comparison.get("change_percentage")
    if change_pct is not None:
        direction = "higher" if change_pct > 0 else "lower"
        insights.append(
            {
                "id": "month-comparison",
                "type": "trend",
                "title": f"Monthly spending is {abs(change_pct)}% {direction}",
                "detail": (
                    f"{period_comparison['current_month_label']} spending is "
                    f"{format_inr(period_comparison['current_month_expense_minor'])} compared to "
                    f"{format_inr(period_comparison['previous_month_expense_minor'])} in {period_comparison['previous_month_label']}."
                ),
            }
        )

    if forecast.get("potential_shortfall_minor", 0) > 0:
        insights.append(
            {
                "id": "forecast-shortfall",
                "type": "warning",
                "title": "Potential month-end shortfall",
                "detail": f"At {format_inr(forecast['average_daily_spending_minor'])}/day plus upcoming bills, you may run short by {format_inr(forecast['potential_shortfall_minor'])}.",
            }
        )
    else:
        insights.append(
            {
                "id": "forecast-healthy",
                "type": "positive",
                "title": "Allowance on track for the month",
                "detail": f"Projected month-end balance is {format_inr(forecast['projected_month_end_balance_minor'])}.",
            }
        )

    active_rec = [r for r in recurring_payments if r.get("status") != "dismissed"]
    if active_rec:
        total_rec = sum(int(r.get("monthly_equivalent_minor", r.get("expected_amount_minor", 0))) for r in active_rec)
        insights.append(
            {
                "id": "recurring-load",
                "type": "recurring",
                "title": f"{len(active_rec)} recurring commitments tracked",
                "detail": f"Estimated monthly recurring commitment is {format_inr(total_rec)}.",
            }
        )

    return insights
