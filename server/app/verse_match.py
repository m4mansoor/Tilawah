"""Fuzzy verse matching: map a recognized transcript to the intended ayah.

Arabic is normalized by removing diacritics and unifying letter variants, then
candidates are scored by sequence similarity. Used as a fallback to locate the
ayah when the user did not select one explicitly.
"""
from __future__ import annotations

import difflib
import re
import unicodedata

# Harakat / tashkeel marks removed for matching.
_STRIP_RE = re.compile(r"[\u064B-\u0652\u0670]")

# Unify letter variants that differ only in orthography.
_NORMALIZE_MAP = str.maketrans(
    {"أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"}
)


def normalize(text: str) -> str:
    """Return a normalization of Arabic text suitable for matching."""
    text = unicodedata.normalize("NFKD", text)
    text = _STRIP_RE.sub("", text)
    text = text.translate(_NORMALIZE_MAP)
    return " ".join(re.findall(r"[\u0621-\u064A]+", text))


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
