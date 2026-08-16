"""Trainer platform: Qari data-collection endpoints.

Qaris log in, pick (or get assigned) a verse, recite it, and submit the audio.
Each submission is auto-transcribed and scored against the reference text so
admins can review quickly. Approved recordings become training data for the
Tilawah ASR model.
"""
from __future__ import annotations

import base64
import os
import subprocess
import uuid
import wave
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from .asr import transcribe
from .auth import get_current_user
from .config import settings
from .db import get_db
from .models import Recitation, User
from .quran_data import all_ayahs, ayahs_of_surah, get_ayah, surahs
from .schemas import (
    CoverageOut,
    QariProfileOut,
    QariProfileUpdate,
    RecitationOut,
    RecitationSubmit,
    ReviewRequest,
    SurahCoverageOut,
    SurahOut,
    VerseOut,
)
from .verse_match import similarity, strip_basmala

router = APIRouter(prefix="/v1", tags=["trainer"])

# Coverage target: distinct Qaris per verse. 3 = minimum, 5 = ideal.
TARGET_PER_AYAH = 5


def _clean_text(surah: int, text: str) -> str:
    """Strip the data file's Basmala prefix from ayah 1 (Al-Fatiha excepted)."""
    return strip_basmala(text) if surah != 1 else text


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def _persist_audio(audio_base64: str) -> tuple[str, float]:
    """Decode base64 audio, store as 16 kHz mono WAV, return (path, seconds)."""
    os.makedirs(settings.audio_dir, exist_ok=True)
    token = uuid.uuid4().hex
    raw_path = os.path.join(settings.audio_dir, f"{token}.raw")
    wav_path = os.path.join(settings.audio_dir, f"{token}.wav")

    with open(raw_path, "wb") as f:
        f.write(base64.b64decode(audio_base64))

    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", raw_path, "-ar", "16000", "-ac", "1", wav_path],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Audio decoding failed: {exc.stderr.decode(errors='ignore')[:200]}",
        ) from exc
    finally:
        try:
            os.remove(raw_path)
        except OSError:
            pass

    with wave.open(wav_path, "rb") as wf:
        duration = wf.getnframes() / wf.getframerate()
    return wav_path, duration


# --- Qari profile ---


@router.get("/qari/profile", response_model=QariProfileOut)
def get_profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/qari/profile", response_model=QariProfileOut)
def update_profile(
    req: QariProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if req.name is not None:
        user.name = req.name
    user.qiraah = req.qiraah
    user.gender = req.gender
    user.age_range = req.age_range
    user.tajweed_level = req.tajweed_level
    user.consent_ok = req.consent_ok
    db.commit()
    db.refresh(user)
    return user


# --- Surah browsing ---


@router.get("/surahs", response_model=list[SurahOut])
def list_surahs() -> list[dict]:
    return surahs()


@router.get("/surahs/{number}", response_model=list[VerseOut])
def list_surah_ayahs(number: int, db: Session = Depends(get_db)) -> list[VerseOut]:
    if number < 1 or number > 114:
        raise HTTPException(status_code=404, detail="Surah not found")
    counts = dict(
        db.query(Recitation.ayah, func.count(Recitation.id))
        .filter(Recitation.surah == number, Recitation.status == "approved")
        .group_by(Recitation.ayah)
        .all()
    )
    return [
        VerseOut(
            surah=number,
            ayah=a["ayah"],
            text=_clean_text(number, a["text"]),
            sample_count=counts.get(a["ayah"], 0),
        )
        for a in ayahs_of_surah(number)
    ]


# --- Assignment ---


@router.get("/qari/next-verse", response_model=VerseOut)
def next_verse(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> VerseOut:
    """Return the verse this qari hasn't done yet with the fewest samples."""
    counts = dict(
        db.query(Recitation.surah, Recitation.ayah, func.count(Recitation.id))
        .filter(Recitation.status == "approved")
        .group_by(Recitation.surah, Recitation.ayah)
        .all()
    )
    done = {
        (s, a)
        for s, a in db.query(Recitation.surah, Recitation.ayah)
        .filter(Recitation.user_id == user.id)
        .all()
    }

    best = None
    best_rank = (10**9, 10**9, 10**9)  # (sample_count, surah, ayah)
    for a in all_ayahs():
        key = (a["surah"], a["ayah"])
        if key in done:
            continue
        rank = (counts.get(key, 0), a["surah"], a["ayah"])
        if rank < best_rank:
            best, best_rank = a, rank

    if best is None:
        raise HTTPException(
            status_code=404, detail="You've recited every verse — thank you!"
        )

    return VerseOut(
        surah=best["surah"],
        ayah=best["ayah"],
        text=_clean_text(best["surah"], best["text"]),
        sample_count=counts.get((best["surah"], best["ayah"]), 0),
    )


# --- Submissions ---


@router.post("/recitations", response_model=RecitationOut, status_code=201)
def submit(
    req: RecitationSubmit,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Recitation:
    ayah = get_ayah(req.surah, req.ayah)
    if ayah is None:
        raise HTTPException(status_code=404, detail="Verse not found")
    if not user.consent_ok:
        raise HTTPException(
            status_code=400, detail="Consent is required before submitting recitations"
        )

    audio_path, duration = _persist_audio(req.audio_base64)
    try:
        transcript = transcribe(audio_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Transcription failed") from exc

    ref_text = _clean_text(req.surah, ayah["text"])
    match_score = similarity(transcript, ref_text)

    rec = Recitation(
        user_id=user.id,
        ayah_id=ayah["id"],
        surah=req.surah,
        ayah=req.ayah,
        audio_path=audio_path,
        duration_s=duration,
        transcript=transcript,
        match_score=match_score,
        model_version=settings.model_id,
        status="pending",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/recitations/mine", response_model=list[RecitationOut])
def my_recitations(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Recitation]:
    return (
        db.query(Recitation)
        .filter(Recitation.user_id == user.id)
        .order_by(Recitation.created_at.desc())
        .all()
    )


# --- Coverage ---


@router.get("/coverage", response_model=CoverageOut)
def coverage(db: Session = Depends(get_db)) -> CoverageOut:
    rows = (
        db.query(Recitation.surah, Recitation.ayah, func.count(Recitation.id))
        .filter(Recitation.status == "approved")
        .group_by(Recitation.surah, Recitation.ayah)
        .all()
    )
    counts = {(s, a): c for s, a, c in rows}

    ayahs = all_ayahs()
    members: dict[int, list[dict]] = {}
    for a in ayahs:
        members.setdefault(a["surah"], []).append(a)

    total = len(ayahs)
    approved = sum(counts.values())
    covered = sum(1 for a in ayahs if counts.get((a["surah"], a["ayah"]), 0) >= 1)
    complete = sum(
        1 for a in ayahs if counts.get((a["surah"], a["ayah"]), 0) >= TARGET_PER_AYAH
    )

    by_surah = []
    for s in surahs():
        n = s["number"]
        app = sum(counts.get((a["surah"], a["ayah"]), 0) for a in members.get(n, []))
        cov = sum(
            1 for a in members.get(n, []) if counts.get((a["surah"], a["ayah"]), 0) >= 1
        )
        by_surah.append(
            SurahCoverageOut(
                surah=n, name=s["name"], approved=app, covered=cov, total=len(members.get(n, []))
            )
        )

    return CoverageOut(
        total_ayahs=total,
        approved_samples=approved,
        covered_ayahs=covered,
        complete_ayahs=complete,
        target_per_ayah=TARGET_PER_AYAH,
        by_surah=by_surah,
    )


# --- Admin review ---


@router.get("/admin/recitations", response_model=list[RecitationOut])
def review_queue(
    status: str | None = None,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> list[Recitation]:
    q = db.query(Recitation)
    if status:
        q = q.filter(Recitation.status == status)
    else:
        q = q.filter(Recitation.status == "pending")
    return q.order_by(Recitation.created_at.asc()).all()


@router.post("/admin/recitations/{rec_id}/review", response_model=RecitationOut)
def review(
    rec_id: int,
    req: ReviewRequest,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> Recitation:
    rec = db.get(Recitation, rec_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Recitation not found")
    rec.status = req.status
    rec.review_note = req.note
    rec.reviewed_by = admin.id
    rec.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/admin/recitations/{rec_id}/audio")
def recitation_audio(
    rec_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
) -> FileResponse:
    rec = db.get(Recitation, rec_id)
    if rec is None or not rec.audio_path:
        raise HTTPException(status_code=404, detail="Audio not found")
    if not os.path.isfile(rec.audio_path):
        raise HTTPException(status_code=404, detail="Audio file missing on disk")
    return FileResponse(rec.audio_path, media_type="audio/wav")

