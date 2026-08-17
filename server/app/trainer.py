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
from .models import Correction, Recitation, User
from .quran_data import all_ayahs, ayahs_of_juz, ayahs_of_surah, get_ayah, juz_list, surahs
from .schemas import (
    CoverageOut,
    JuzOut,
    QariProfileOut,
    QariProfileUpdate,
    RecitationOut,
    RecitationSubmit,
    ReviewRequest,
    SurahCoverageOut,
    SurahOut,
    VerseOut,
    WordError,
)
from .tajweed import diff_words
from .verse_match import similarity, strip_basmala

router = APIRouter(prefix="/v1", tags=["trainer"])

# Coverage target: distinct Qaris per verse. 3 = minimum, 5 = ideal.
TARGET_PER_AYAH = 5


def _clean_text(surah: int, text: str) -> str:
    """Strip the data file's Basmala prefix from ayah 1 (Al-Fatiha excepted)."""
    return strip_basmala(text) if surah != 1 else text


def _scope_text(scope: str, surah: int | None, ayah: int | None, juz: int | None) -> str | None:
    """Return the full reference text for a recitation scope."""
    if scope == "ayah":
        a = get_ayah(surah or 0, ayah or 0)
        return _clean_text(a["surah"], a["text"]) if a else None
    if scope == "surah":
        members = ayahs_of_surah(surah or 0)
        if not members:
            return None
        full = " ".join(a["text"] for a in members)
        return strip_basmala(full) if (surah or 0) != 1 else full
    if scope == "juz":
        members = ayahs_of_juz(juz or 0)
        if not members:
            return None
        return " ".join(a["text"] for a in members)
    return None


def _summarize(errors: list[dict]) -> str:
    """Human summary of what lowered the match score."""
    if not errors:
        return "No mistakes detected. Masha'Allah!"
    subs = sum(1 for e in errors if e["error_type"] == "substitution")
    dels = sum(1 for e in errors if e["error_type"] == "deletion")
    ins = sum(1 for e in errors if e["error_type"] == "insertion")
    parts = []
    if subs:
        parts.append(f"{subs} substitution{'s' if subs != 1 else ''}")
    if dels:
        parts.append(f"{dels} deletion{'s' if dels != 1 else ''}")
    if ins:
        parts.append(f"{ins} insertion{'s' if ins != 1 else ''}")
    return ", ".join(parts) + " detected."


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
        .filter(Recitation.surah == number, Recitation.status == "approved", Recitation.scope == "ayah")
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


@router.get("/juz", response_model=list[JuzOut])
def list_juz() -> list[dict]:
    return juz_list()


@router.get("/juz/{number}", response_model=list[VerseOut])
def list_juz_ayahs(number: int) -> list[VerseOut]:
    if number < 1 or number > 30:
        raise HTTPException(status_code=404, detail="Juz not found")
    return [
        VerseOut(
            surah=a["surah"],
            ayah=a["ayah"],
            text=_clean_text(a["surah"], a["text"]),
            sample_count=0,
        )
        for a in ayahs_of_juz(number)
    ]


# --- Assignment ---


@router.get("/qari/next-verse", response_model=VerseOut)
def next_verse(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> VerseOut:
    """Return the verse this qari hasn't done yet with the fewest samples."""
    counts = dict(
        db.query(Recitation.surah, Recitation.ayah, func.count(Recitation.id))
        .filter(Recitation.status == "approved", Recitation.scope == "ayah")
        .group_by(Recitation.surah, Recitation.ayah)
        .all()
    )
    done = {
        (s, a)
        for s, a in db.query(Recitation.surah, Recitation.ayah)
        .filter(Recitation.user_id == user.id, Recitation.scope == "ayah")
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
            status_code=404, detail="You've recited every verse - thank you!"
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
) -> RecitationOut:
    if not user.consent_ok:
        raise HTTPException(
            status_code=400, detail="Consent is required before submitting recitations"
        )

    ref_text = _scope_text(req.scope, req.surah, req.ayah, req.juz)
    if not ref_text:
        raise HTTPException(status_code=400, detail="Could not resolve the selected recitation")

    audio_path, duration = _persist_audio(req.audio_base64)
    try:
        transcript = transcribe(audio_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Transcription failed") from exc

    match_score = similarity(transcript, ref_text)
    errors = diff_words(ref_text, transcript)
    summary = _summarize(errors)

    ayah_id = None
    if req.scope == "ayah":
        a = get_ayah(req.surah or 0, req.ayah or 0)
        ayah_id = a["id"] if a else None

    rec = Recitation(
        user_id=user.id,
        ayah_id=ayah_id,
        surah=req.surah,
        ayah=req.ayah,
        scope=req.scope,
        juz=req.juz,
        audio_path=audio_path,
        duration_s=duration,
        transcript=transcript,
        match_score=match_score,
        model_version=settings.model_id,
        status="pending",
    )
    db.add(rec)
    db.flush()

    for e in errors:
        db.add(
            Correction(
                recitation_id=rec.id,
                word_idx=e["index"],
                word=e["word"],
                expected=e["expected"],
                recognized=e["recognized"],
                error_type=e["error_type"],
            )
        )
    db.commit()
    db.refresh(rec)

    return RecitationOut(
        id=rec.id,
        user_id=rec.user_id,
        surah=rec.surah,
        ayah=rec.ayah,
        scope=rec.scope,
        juz=rec.juz,
        transcript=rec.transcript,
        match_score=rec.match_score,
        duration_s=rec.duration_s,
        status=rec.status,
        summary=summary,
        errors=[WordError(**e) for e in errors[:20]],
        created_at=rec.created_at,
    )


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
        .filter(Recitation.status == "approved", Recitation.scope == "ayah")
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

