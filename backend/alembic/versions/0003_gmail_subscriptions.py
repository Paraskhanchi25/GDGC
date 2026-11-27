"""Gmail OAuth connections and subscription detection tables

Revision ID: 0003_gmail_subscriptions
Revises: 0002_multi_bank_accounts_and_otp
Create Date: 2026-11-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_gmail_subscriptions"
down_revision: Union[str, None] = "0002_multi_bank_accounts_and_otp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gmail_connections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("gmail_email", sa.String(255), nullable=False),
        sa.Column("encrypted_refresh_token", sa.Text, nullable=False),
        sa.Column("granted_scopes", sa.Text, nullable=False),
        sa.Column("connection_status", sa.String(32), server_default="connected", nullable=False),
        sa.Column("history_id", sa.String(64), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_gmail_connections_user_id", "gmail_connections", ["user_id"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("merchant_name", sa.String(160), nullable=False),
        sa.Column("merchant_category", sa.String(80), server_default="Subscriptions", nullable=False),
        sa.Column("amount_minor", sa.BigInteger, nullable=True),
        sa.Column("currency", sa.String(8), server_default="INR", nullable=False),
        sa.Column("billing_frequency", sa.String(24), server_default="unknown", nullable=False),
        sa.Column("last_payment_date", sa.Date, nullable=True),
        sa.Column("next_billing_date", sa.Date, nullable=True),
        sa.Column("subscription_status", sa.String(24), server_default="active", nullable=False),
        sa.Column("trial_end_date", sa.Date, nullable=True),
        sa.Column("detection_confidence", sa.Float, server_default="0.0", nullable=False),
        sa.Column("verification_status", sa.String(32), server_default="needs_confirmation", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_user_merchant", "subscriptions", ["user_id", "merchant_name"])

    op.create_table(
        "subscription_email_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subscription_id", sa.String(36), sa.ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("gmail_message_id", sa.String(128), nullable=False),
        sa.Column("event_type", sa.String(48), nullable=False),
        sa.Column("merchant_name", sa.String(160), nullable=False),
        sa.Column("extracted_amount_minor", sa.BigInteger, nullable=True),
        sa.Column("extracted_currency", sa.String(8), server_default="INR", nullable=False),
        sa.Column("extracted_date", sa.Date, nullable=True),
        sa.Column("extraction_confidence", sa.Float, server_default="0.0", nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "gmail_message_id", name="uq_sub_email_event_user_msg"),
    )
    op.create_index("ix_subscription_email_events_user_id", "subscription_email_events", ["user_id"])
    op.create_index("ix_subscription_email_events_subscription_id", "subscription_email_events", ["subscription_id"])
    op.create_index("ix_subscription_email_events_gmail_message_id", "subscription_email_events", ["gmail_message_id"])

    op.create_table(
        "subscription_sync_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sync_started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("sync_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("messages_scanned", sa.Integer, server_default="0", nullable=False),
        sa.Column("subscriptions_detected", sa.Integer, server_default="0", nullable=False),
        sa.Column("errors", sa.Text, nullable=True),
        sa.Column("sync_status", sa.String(24), server_default="running", nullable=False),
    )
    op.create_index("ix_subscription_sync_logs_user_id", "subscription_sync_logs", ["user_id"])


def downgrade() -> None:
    for table in (
        "subscription_sync_logs",
        "subscription_email_events",
        "subscriptions",
        "gmail_connections",
    ):
        op.drop_table(table)
