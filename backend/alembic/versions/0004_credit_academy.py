"""Additive Academy records; existing financial data is untouched."""
from alembic import op
import sqlalchemy as sa

revision = "0004_credit_academy"
down_revision = "0003_gmail_subscriptions"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("academy_progress",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chapter_id", sa.String(40), nullable=False),
        sa.Column("lesson_count", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("user_id", "chapter_id", name="uq_academy_user_chapter"))
    op.create_table("academy_attempts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chapter_id", sa.String(40), nullable=False),
        sa.Column("answers_json", sa.Text(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("content_version", sa.String(24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table("academy_certificates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("content_version", sa.String(24), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    for table in ("academy_progress", "academy_attempts", "academy_certificates"):
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

def downgrade():
    # Explicit downgrade affects only Academy records. Never run automatically.
    for table in ("academy_certificates", "academy_attempts", "academy_progress"):
        op.drop_table(table)
