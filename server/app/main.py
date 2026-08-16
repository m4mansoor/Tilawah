"""Tilawah correction API (FastAPI)."""
from __future__ import annotations

import base64
import logging
import os
import uuid

from fastapi import FastAPI, HTTPException

from .asr import transcribe
from .config import settings
from .quran_data import all_ayahs, get_ayah, get_ayah_by_id
from .schemas import CorrectionRequest, CorrectionResponse
from .tajweed import diff_words
from .verse_match import find_best_ayah

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, version=settings.version)


@app.get("/health")
def health() -> dict:
    """Liveness/readiness probe. Does NOT load the model (keeps startup fast)."""
    return {"status": "ok", "app": settings.app_name, "model": settings.model_id}


def _audio_to_file(req: CorrectionRequest) -> str:
    """Write the request audio to a local temp file and return its path."""
    os.makedirs(settings.tmp_dir, exist_ok=True)
    path = os.path.join(settings.tmp_dir, f"{uuid.uuid4().hex}.wav")

    if req.audio_base64:
        with open(path, "wb") as f:
            f.write(base64.b64decode(req.audio_base64))
        return path

    if req.audio_url:
        # Wired in the platform phase: presigned object-storage download (R2).
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
