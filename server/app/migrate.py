"""Lightweight, idempotent schema migrations + admin seeding (pre-Alembic).

`Base.metadata.create_all` creates missing tables but does NOT add columns to
tables that already exist. Until Alembic is adopted, the trainer platform's new
columns are applied here with idempotent `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS`, so both fresh databases and pre-existing ones end up with the same
schema.
"""
from __future__ import annotations

import logging

from sqlalchemy import text

from .config import settings
from .db import SessionLocal, engine
from .models import User

logger = logging.getLogger(__name__)

# (table, column DDL) - applied in order; idempotent on PostgreSQL.
_MIGRATIONS: list[tuple[str, str]] = [
    ("users", "ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'qari'"),
    ("users", "ADD COLUMN IF NOT EXISTS qiraah VARCHAR(20) DEFAULT 'hafs'"),
    ("users", "ADD COLUMN IF NOT EXISTS gender VARCHAR(20)"),
    ("users", "ADD COLUMN IF NOT EXISTS age_range VARCHAR(20)"),
    ("users", "ADD COLUMN IF NOT EXISTS tajweed_level VARCHAR(20)"),
    ("users", "ADD COLUMN IF NOT EXISTS consent_ok BOOLEAN DEFAULT FALSE"),
    ("users", "ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0"),
    ("users", "ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0"),
    ("users", "ADD COLUMN IF NOT EXISTS last_activity_date DATE"),
    ("recitations", "ADD COLUMN IF NOT EXISTS surah INTEGER"),
    ("recitations", "ADD COLUMN IF NOT EXISTS ayah INTEGER"),
    ("recitations", "ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'ayah'"),
    ("recitations", "ADD COLUMN IF NOT EXISTS juz INTEGER"),
    ("recitations", "ADD COLUMN IF NOT EXISTS audio_path VARCHAR(500)"),
    ("recitations", "ADD COLUMN IF NOT EXISTS duration_s FLOAT"),
    ("recitations", "ADD COLUMN IF NOT EXISTS match_score FLOAT"),
    ("recitations", "ADD COLUMN IF NOT EXISTS review_note TEXT"),
    ("recitations", "ADD COLUMN IF NOT EXISTS reviewed_by INTEGER"),
    ("recitations", "ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ"),
]


def run_migrations() -> None:
    """Apply idempotent column additions (safe on fresh and existing DBs)."""
    with engine.begin() as conn:
        for table, ddl in _MIGRATIONS:
            conn.execute(text(f"ALTER TABLE {table} {ddl}"))
    logger.info("Startup migrations applied")


def seed_admin_users() -> None:
    """Promote users whose email is listed in ADMIN_EMAILS to the admin role."""
    emails = [e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()]
    if not emails:
        return
    with SessionLocal() as db:
        for email in emails:
            user = db.query(User).filter(User.email == email).first()
            if user and user.role != "admin":
                user.role = "admin"
                logger.info("Promoted %s to admin", email)
        db.commit()