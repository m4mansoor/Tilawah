"""Tilawah correction API (FastAPI)."""
from __future__ import annotations

import base64
import logging
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .asr import transcribe
from .auth import get_current_user
from .config import settings
from .db import Base, engine, get_db
from .models import User  # noqa: F401  (registers table metadata)
from .quran_data import all_ayahs, get_ayah, get_ayah_by_id
from .schemas import (
    CorrectionRequest,
    CorrectionResponse,
    LoginRequest,
    Token,
    UserCreate,
    UserOut,
)
from .security import create_access_token, hash_password, verify_password
from .tajweed import diff_words
from .verse_match import find_best_ayah

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

# The React frontend doubles as the web platform, so the API is CORS-enabled.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    """Liveness/readiness probe. Does NOT load the model (keeps startup fast)."""
    return {"status": "ok", "app": settings.app_name, "model": settings.model_id}


@app.post("/v1/auth/register", response_model=Token, status_code=201)
def register(req: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        name=req.name,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.email))


@app.post("/v1/auth/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(user.email))


@app.get("/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


def _audio_to_file(req: CorrectionRequest) -> str:
    """Write the request audio to a local temp file and return its path."""
    os.makedirs(settings.tmp_dir, exist_ok=True)
    path = os.path.join(settings.tmp_dir, f"{uuid.uuid4().hex}.wav")

    if req.audio_base64:
        with open(path, "wb") as f:
            f.write(base64.b64decode(req.audio_base64))
        return path

    if req.audio_url:
        # Wired in the platform phase: audio stored on the VPS's local disk
        # (served by the API), referenced by URL.
        raise HTTPException(status_code=501, detail="audio_url download not yet wired")

    raise HTTPException(status_code=400, detail="Provide audio_base64 or audio_url")


@app.post("/v1/correct", response_model=CorrectionResponse)
def correct(req: CorrectionRequest) -> CorrectionResponse:
    """Transcribe a recitation and diff it against the reference ayah."""
    audio_path = _audio_to_file(req)
    try:
        transcript = transcribe(audio_path)
    finally:
        try:
            os.remove(audio_path)
        except OSError:
            pass

    # Resolve the reference ayah (by explicit id/surah, else fuzzy-match).
    reference = None
    if req.surah and req.ayah:
        reference = get_ayah(req.surah, req.ayah)
    elif req.ayah_id is not None:
        reference = get_ayah_by_id(req.ayah_id)

    if reference is None:
        reference = find_best_ayah(transcript, all_ayahs())

    reference_text = reference["text"] if reference else None
    ayah_id = reference["id"] if reference else req.ayah_id
    errors = diff_words(reference_text, transcript) if reference_text else []

    return CorrectionResponse(
        status="ok",
        transcript=transcript,
        ayah_id=ayah_id,
        matched_ayah_text=reference_text,
        errors=errors,
    )
