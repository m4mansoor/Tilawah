"""Fuzzy verse matching: map a recognized transcript to the intended ayah.

Arabic is normalized by removing diacritics and unifying letter variants, then
candidates are scored by sequence similarity. Used as a fallback to locate the
ayah when the user did not select one explicitly.
"""
from __future__ import annotations

import difflib
import re
import unicodedata

# Unify letter variants that differ only in orthography.
_NORMALIZE_MAP = str.maketrans(
    {"أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"}
)


def normalize(text: str) -> str:
    """Return a normalization of Arabic text suitable for matching.

    Strips diacritics, hamza marks, and unifies letter variants so that
    "أَحَدٌ" and "احد" compare equal.
    """
    text = unicodedata.normalize("NFKD", text)
    # Remove all combining marks (harakat, shadda, hamza, etc.).
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.translate(_NORMALIZE_MAP)
    return " ".join(re.findall(r"[\u0621-\u064A]+", text))


_BASMALA = "بسم الله الرحمن الرحيم"


def strip_basmala(text: str) -> str:
    """Remove a leading Basmala (بسم الله الرحمن الرحيم) if present."""
    words = text.split()
    if len(words) >= 4 and normalize(" ".join(words[:4])) == normalize(_BASMALA):
        return " ".join(words[4:]).strip()
    return text


def similarity(recognized: str, candidate: str) -> float:
    """Return a 0..1 similarity score between two normalized Arabic strings."""
    return difflib.SequenceMatcher(None, normalize(recognized), normalize(candidate)).ratio()


def find_best_ayah(transcript: str, ayahs: list[dict]) -> dict | None:
    """Return the ayah whose text best matches the transcript.

    `ayahs` is a list of ``{"id": int, "text": str}`` (imla'i/Uthmani text).
    Returns ``None`` when the transcript is too short or too dissimilar to
    confidently match any verse.
    """
    norm_transcript = normalize(transcript)
    if len(norm_transcript.split()) < 3:
        return None  # too short to reliably match

    best, best_score = None, 0.0
    for ayah in ayahs:
        score = difflib.SequenceMatcher(
            None, norm_transcript, normalize(ayah["text"])
        ).ratio()
        if score > best_score:
            best, best_score = ayah, score
    return best if best_score >= 0.6 else None


def find_best_reference(transcript: str, ayahs: list[dict]) -> dict | None:
    """Return the best-matching reference — a single ayah or a full surah.

    Users may recite one verse or a whole surah, so we compare the transcript
    against individual ayahs *and* each surah's concatenated text.
    Returns ``{"text": str, "id": int}`` or ``None`` when nothing matches.
    """
    norm_transcript = normalize(transcript)
    if len(norm_transcript.split()) < 3:
        return None

    best, best_score = None, 0.0

    def consider(candidate_text: str, candidate_id: int) -> None:
        nonlocal best, best_score
        score = difflib.SequenceMatcher(
            None, norm_transcript, normalize(candidate_text)
        ).ratio()
        if score > best_score:
            best, best_score = {"text": candidate_text, "id": candidate_id}, score

    # Individual ayahs.
    for a in ayahs:
        consider(a["text"], a["id"])

    # Full surahs (concatenate each surah's ayahs in order).
    surahs: dict[int, list[dict]] = {}
    for a in ayahs:
        surahs.setdefault(a["surah"], []).append(a)
    for num, members in surahs.items():
        full = " ".join(a["text"] for a in members)
        if num != 1:  # Al-Fatiha's Basmala is ayah 1; other surahs carry it as a data prefix
            full = strip_basmala(full)
        consider(full, members[0]["id"])

    return best if best_score >= 0.6 else None
