"""Multi-bank accounts and email OTP verification

Revision ID: 0002_multi_bank_accounts_and_otp
Revises: 0001_initial_schema
Create Date: 2026-11-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_multi_bank_accounts_and_otp"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("bank_name", sa.String(100), server_default="Primary Bank", nullable=False))
    op.add_column("accounts", sa.Column("bank_code", sa.String(32), server_default="pulse", nullable=False))
    op.add_column("accounts", sa.Column("masked_number", sa.String(24), server_default="•••• 0000", nullable=False))
    op.add_column("accounts", sa.Column("last_four", sa.String(4), server_default="0000", nullable=False))
    op.add_column("accounts", sa.Column("opening_balance_minor", sa.BigInteger, server_default="0", nullable=False))
    op.add_column("accounts", sa.Column("current_balance_minor", sa.BigInteger, server_default="0", nullable=False))
    op.add_column("accounts", sa.Column("behavior_profile", sa.String(48), server_default="balanced", nullable=False))
    op.add_column("accounts", sa.Column("preparation_status", sa.String(24), server_default="active", nullable=False))
    op.add_column("accounts", sa.Column("disclosure_accepted_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_accounts_user_last_four", "accounts", ["user_id", "last_four"])
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])

    op.create_table(
        "account_verification_challenges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bank_code", sa.String(32), nullable=False),
        sa.Column("bank_name", sa.String(100), nullable=False),
        sa.Column("account_type", sa.String(48), nullable=False),
        sa.Column("otp_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer, server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer, server_default="5", nullable=False),
        sa.Column("status", sa.String(24), server_default="pending", nullable=False),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_account_verification_challenges_user_id", "account_verification_challenges", ["user_id"])


def downgrade() -> None:
    op.drop_table("account_verification_challenges")
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.drop_index("ix_accounts_user_last_four", table_name="accounts")
    for col in (
        "disclosure_accepted_at",
        "preparation_status",
        "behavior_profile",
        "current_balance_minor",
        "opening_balance_minor",
        "last_four",
        "masked_number",
        "bank_code",
        "bank_name",
    ):
        op.drop_column("accounts", col)
