from pydantic import BaseModel, Field


class CopilotContext(BaseModel):
    user_label: str
    currency: str = "INR"
    available_balance_formatted: str
    monthly_allowance_formatted: str
    current_month_spending_formatted: str
    remaining_allowance_formatted: str
    top_categories: list[dict]
    upcoming_recurring: list[dict]
    forecast_summary: str
    savings_goals: list[dict]
    recent_transactions: list[dict]
    period_comparison: dict = Field(default_factory=dict)
    category_changes: list[dict] = Field(default_factory=list)


class CopilotResult(BaseModel):
    status: str  # "ok" | "unavailable" | "error"
    answer: str | None = None
    model: str | None = None
    grounded_metrics: dict | None = None
    error_detail: str | None = None
    error_category: str | None = None
    retryable: bool = False
    usage: dict[str, int | float | None] | None = None
