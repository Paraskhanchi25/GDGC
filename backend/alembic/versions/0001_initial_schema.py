"""Initial PULSE database schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True),
        sa.Column("country", sa.String(64), default="India"),
        sa.Column("currency", sa.String(8), default="INR"),
        sa.Column("monthly_allowance_minor", sa.BigInteger, default=0),
        sa.Column("allowance_frequency", sa.String(32), default="monthly"),
        sa.Column("expected_next_allowance_date", sa.Date, nullable=True),
        sa.Column("current_savings_minor", sa.BigInteger, default=0),
        sa.Column("onboarding_completed", sa.Boolean, default=False),
    )
    op.create_index("ix_user_profiles_user_id", "user_profiles", ["user_id"])

    op.create_table(
        "accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("account_name", sa.String(120), nullable=False),
        sa.Column("account_type", sa.String(48), nullable=False),
        sa.Column("provider", sa.String(80), nullable=True),
        sa.Column("currency", sa.String(8), default="INR"),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("category_type", sa.String(24), default="expense"),
        sa.Column("icon", sa.String(48), nullable=True),
        sa.Column("colour", sa.String(24), nullable=True),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("merchant", sa.String(160), nullable=False),
        sa.Column("description", sa.String(255), default=""),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("currency", sa.String(8), default="INR"),
        sa.Column("transaction_type", sa.String(24), nullable=False),
        sa.Column("payment_method", sa.String(48), default="UPI"),
        sa.Column("source_name", sa.String(80), default="Primary Bank"),
        sa.Column("category_name", sa.String(80), default="Other"),
        sa.Column("transaction_date", sa.Date, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("import_reference", sa.String(128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_transaction_date", "transactions", ["transaction_date"])
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "transaction_date"])
    op.create_index("ix_transactions_user_category", "transactions", ["user_id", "category_id"])
    op.create_index("ix_transactions_import_reference", "transactions", ["import_reference"])

    op.create_table(
        "budgets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("period", sa.String(24), default="monthly"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])

    op.create_table(
        "recurring_payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("merchant", sa.String(160), nullable=False),
        sa.Column("expected_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("frequency", sa.String(32), default="monthly"),
        sa.Column("next_payment_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(24), default="detected"),
        sa.Column("confidence", sa.Float, default=0.0),
    )
    op.create_index("ix_recurring_payments_user_id", "recurring_payments", ["user_id"])

    op.create_table(
        "savings_goals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("target_amount_minor", sa.BigInteger, nullable=False),
        sa.Column("current_amount_minor", sa.BigInteger, default=0),
        sa.Column("target_date", sa.Date, nullable=False),
        sa.Column("status", sa.String(24), default="active"),
    )
    op.create_index("ix_savings_goals_user_id", "savings_goals", ["user_id"])

    op.create_table(
        "savings_contributions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("goal_id", sa.String(36), sa.ForeignKey("savings_goals.id", ondelete="CASCADE")),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("amount_minor", sa.BigInteger, nullable=False),
        sa.Column("contribution_date", sa.Date, nullable=False),
    )
    op.create_index("ix_savings_contributions_goal_id", "savings_contributions", ["goal_id"])
    op.create_index("ix_savings_contributions_user_id", "savings_contributions", ["user_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("notification_type", sa.String(48), nullable=False),
        sa.Column("dedupe_key", sa.String(160), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_dedupe_key", "notifications", ["dedupe_key"])

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True),
        sa.Column("email_enabled", sa.Boolean, default=True),
        sa.Column("in_app_enabled", sa.Boolean, default=True),
        sa.Column("weekly_summary_enabled", sa.Boolean, default=True),
        sa.Column("payment_reminders_enabled", sa.Boolean, default=True),
        sa.Column("spending_alerts_enabled", sa.Boolean, default=True),
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"])

    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("title", sa.String(200), default="Financial Copilot"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])

    op.create_table(
        "ai_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("ai_conversations.id", ondelete="CASCADE")),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("role", sa.String(24), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"])
    op.create_index("ix_ai_messages_user_id", "ai_messages", ["user_id"])

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), default="completed"),
        sa.Column("imported_count", sa.Integer, default=0),
        sa.Column("rejected_count", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_import_jobs_user_id", "import_jobs", ["user_id"])


def downgrade() -> None:
    for table in [
        "import_jobs",
        "ai_messages",
        "ai_conversations",
        "notification_preferences",
        "notifications",
        "savings_contributions",
        "savings_goals",
        "recurring_payments",
        "budgets",
        "transactions",
        "categories",
        "accounts",
        "user_profiles",
        "users",
    ]:
        op.drop_table(table)
