"""Request/response models (stable API contract).

The client <-> engine contract is intentionally stable: the model behind the
scenes can change without breaking clients.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CorrectionRequest(BaseModel):
    """A recitation to be checked."""

    # Identify the target ayah (either a global id, or surah+ayah numbers):
    ayah_id: int | None = Field(default=None, description="Global ayah number (1..6236)")
    surah: int | None = Field(default=None, ge=1, le=114)
    ayah: int | None = Field(default=None, ge=1)

    # Audio: base64 is the simplest for the scaffold. In the platform phase,
    # audio is uploaded to the VPS's local disk and referenced by URL.
    audio_base64: str | None = None
    audio_url: str | None = None

    language: str = "ar"


class WordError(BaseModel):
    index: int
    word: str
    expected: str | None = None
    recognized: str | None = None
    # substitution | insertion | deletion
    error_type: str = "substitution"
    tajweed_rule: str | None = None
    confidence: float | None = None


class CorrectionResponse(BaseModel):
    status: str = "ok"
    transcript: str
    diacritized: str | None = None
    ayah_id: int | None = None
    matched_ayah_text: str | None = None
    note: str | None = None
    errors: list[WordError] = []
    tajweed: list[TajweedRule] = []
    # Feedback score (0..1) + human summary for the learner practice flow.
    match_score: float | None = None
    summary: str | None = None


class TajweedRule(BaseModel):
    rule: str
    letter: str
    description: str


# --- Auth ---


class UserCreate(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Trainer platform (Qari data collection) ---


class QariProfileUpdate(BaseModel):
    name: str | None = None
    qiraah: str = "hafs"
    gender: str | None = None
    age_range: str | None = None
    tajweed_level: str | None = None
    consent_ok: bool = False


class QariProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str | None = None
    role: str
    qiraah: str
    gender: str | None = None
    age_range: str | None = None
    tajweed_level: str | None = None
    consent_ok: bool
    points: int = 0
    streak: int = 0


class SurahOut(BaseModel):
    number: int
    name: str
    english_name: str
    ayah_count: int


class JuzOut(BaseModel):
    number: int
    start_surah: int
    start_ayah: int
    ayah_count: int


class VerseOut(BaseModel):
    surah: int
    ayah: int
    text: str
    sample_count: int = 0


class RecitationSubmit(BaseModel):
    scope: str = "ayah"  # ayah | surah | juz
    surah: int | None = Field(default=None, ge=1, le=114)
    ayah: int | None = Field(default=None, ge=1)
    juz: int | None = Field(default=None, ge=1, le=30)
    audio_base64: str


class RecitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    surah: int | None = None
    ayah: int | None = None
    scope: str = "ayah"
    juz: int | None = None
    transcript: str = ""
    match_score: float | None = None
    duration_s: float | None = None
    status: str = "pending"
    review_note: str | None = None
    summary: str | None = None
    errors: list[WordError] = []
    created_at: datetime | None = None


class ReviewRequest(BaseModel):
    status: Literal["approved", "rejected"]
    note: str | None = None


class LeaderboardEntry(BaseModel):
    name: str
    points: int
    streak: int


class AssignmentCreate(BaseModel):
    qari_email: str
    scope: str = "ayah"
    surah: int | None = Field(default=None, ge=1, le=114)
    ayah: int | None = Field(default=None, ge=1)
    juz: int | None = Field(default=None, ge=1, le=30)


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    qari_id: int
    scope: str
    surah: int | None = None
    ayah: int | None = None
    juz: int | None = None
    status: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class SurahCoverageOut(BaseModel):
    surah: int
    name: str
    approved: int
    covered: int
    total: int


class CoverageOut(BaseModel):
    total_ayahs: int
    approved_samples: int
    covered_ayahs: int
    complete_ayahs: int
    target_per_ayah: int = 5
    by_surah: list[SurahCoverageOut]
