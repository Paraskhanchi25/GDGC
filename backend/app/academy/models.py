import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AcademyProgress(Base):
    __tablename__ = "academy_progress"
    __table_args__ = (UniqueConstraint("user_id", "chapter_id", name="uq_academy_user_chapter"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[str] = mapped_column(String(40))
    lesson_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class AcademyAttempt(Base):
    __tablename__ = "academy_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chapter_id: Mapped[str] = mapped_column(String(40))
    answers_json: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer)
    content_version: Mapped[str] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AcademyCertificate(Base):
    __tablename__ = "academy_certificates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    score: Mapped[int] = mapped_column(Integer)
    content_version: Mapped[str] = mapped_column(String(24))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
