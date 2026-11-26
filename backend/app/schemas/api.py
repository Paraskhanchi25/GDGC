from datetime import date, datetime
from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    country: str | None = None
    currency: str | None = None
    monthly_allowance_minor: int | None = Field(default=None, ge=0)
    allowance_frequency: str | None = None
    expected_next_allowance_date: date | None = None
    current_savings_minor: int | None = Field(default=None, ge=0)
    onboarding_completed: bool | None = None


class TransactionCreate(BaseModel):
    merchant: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=255)
    amount_minor: int = Field(gt=0)
    currency: str = Field(default="INR", max_length=8)
    transaction_type: str = Field(pattern="^(expense|income)$")
    category_name: str | None = None
    payment_method: str = Field(default="UPI", max_length=48)
    source_name: str = Field(default="Primary Bank", max_length=80)
    transaction_date: date
    notes: str | None = None


class TransactionUpdate(BaseModel):
    merchant: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=255)
    amount_minor: int | None = Field(default=None, gt=0)
    transaction_type: str | None = Field(default=None, pattern="^(expense|income)$")
    category_name: str | None = None
    payment_method: str | None = Field(default=None, max_length=48)
    source_name: str | None = Field(default=None, max_length=80)
    transaction_date: date | None = None
    notes: str | None = None


class ImportConfirmRow(BaseModel):
    merchant: str
    description: str = ""
    amount_minor: int = Field(gt=0)
    currency: str = "INR"
    transaction_type: str = Field(pattern="^(expense|income)$")
    category_name: str = "Other"
    payment_method: str = "UPI"
    source_name: str = "Imported CSV"
    transaction_date: date


class ImportConfirmRequest(BaseModel):
    filename: str = "import.csv"
    rows: list[ImportConfirmRow]
    skip_duplicates: bool = True


class RecurringStatusUpdate(BaseModel):
    status: str = Field(pattern="^(detected|confirmed|dismissed)$")


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    target_amount_minor: int = Field(gt=0)
    current_amount_minor: int = Field(default=0, ge=0)
    target_date: date


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount_minor: int | None = Field(default=None, gt=0)
    target_date: date | None = None
    status: str | None = Field(default=None, pattern="^(active|completed|paused)$")


class GoalContributionCreate(BaseModel):
    amount_minor: int = Field(gt=0)
    contribution_date: date | None = None


class SimulatorRequest(BaseModel):
    purchase_name: str = Field(min_length=1, max_length=160)
    purchase_amount_minor: int = Field(gt=0)
    purchase_date: date | None = None
    payment_months: int = Field(default=1, ge=1, le=24)


class CopilotChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    conversation_id: str | None = None


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: bool | None = None
    in_app_enabled: bool | None = None
    weekly_summary_enabled: bool | None = None
    payment_reminders_enabled: bool | None = None
    spending_alerts_enabled: bool | None = None
