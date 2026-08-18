"""SQLAlchemy ORM models (PostgreSQL)."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # Trainer-platform fields (Qari data collection).
    role: Mapped[str] = mapped_column(String(20), default="qari")  # qari | admin
    qiraah: Mapped[str] = mapped_column(String(20), default="hafs")
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    age_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tajweed_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consent_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    points: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_token: Mapped[str | None] = mapped_column(String(120), nullable=True)
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
    # Trainer-platform fields.
    surah: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ayah: Mapped[int | None] = mapped_column(Integer, nullable=True)  # number in surah
    scope: Mapped[str] = mapped_column(String(20), default="ayah")  # ayah | surah | juz
    juz: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1..30 when scope == juz
    audio_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    qari_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    scope: Mapped[str] = mapped_column(String(20), default="ayah")  # ayah | surah | juz
    surah: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ayah: Mapped[int | None] = mapped_column(Integer, nullable=True)
    juz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | done
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
