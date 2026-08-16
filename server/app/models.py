"""SQLAlchemy ORM models (PostgreSQL)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    recitations: Mapped[list["Recitation"]] = relationship(back_populates="user")


class Recitation(Base):
    __tablename__ = "recitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ayah_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[str] = mapped_column(Text, default="")
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="done")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="recitations")
    corrections: Mapped[list["Correction"]] = relationship(back_populates="recitation")


class Correction(Base):
    __tablename__ = "corrections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recitation_id: Mapped[int] = mapped_column(ForeignKey("recitations.id"), index=True)
    word_idx: Mapped[int] = mapped_column(Integer)
    word: Mapped[str] = mapped_column(String(255), default="")
    expected: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recognized: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_type: Mapped[str] = mapped_column(String(30), default="substitution")
    tajweed_rule: Mapped[str | None] = mapped_column(String(100), nullable=True)

    recitation: Mapped["Recitation"] = relationship(back_populates="corrections")


class StudySession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    surah: Mapped[int | None] = mapped_column(Integer, nullable=True)
    progress: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
