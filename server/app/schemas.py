"""Request/response models (stable API contract).

The client <-> engine contract is intentionally stable: the model behind the
scenes can change without breaking clients.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CorrectionRequest(BaseModel):
    """A recitation to be checked."""

    # Identify the target ayah (either a global id, or surah+ayah numbers):
    ayah_id: int | None = Field(default=None, description="Global ayah number (1..6236)")
    surah: int | None = Field(default=None, ge=1, le=114)
    ayah: int | None = Field(default=None, ge=1)

    # Audio: base64 is the simplest for the scaffold; presigned object-storage
    # URLs (R2) replace this in the platform phase.
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
    errors: list[WordError] = []


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
