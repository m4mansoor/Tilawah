"""Word-level correction: diff the recognized transcript against the reference ayah.

This is the MVP heuristic (word-level edit diff on normalized Arabic). It will be
extended with phonetic / tajweed-aware rules (makharij, madd, qalqalah, ghunnah,
etc.) in a later phase — the function signature stays stable.
"""
from __future__ import annotations

import difflib

from .verse_match import normalize


def diff_words(expected: str, recognized: str) -> list[dict]:
    """Compare expected (reference) vs recognized words and return per-word errors.

    Returns a list of ``{"index", "word", "expected", "recognized", "error_type"}``.
    """
    exp_words = normalize(expected).split()
    rec_words = normalize(recognized).split()

    errors: list[dict] = []
    matcher = difflib.SequenceMatcher(a=exp_words, b=rec_words, autojunk=False)

    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            continue
        # Words present in the reference but missing / changed in the recitation.
        if op in ("replace", "delete"):
            for idx in range(i1, i2):
                errors.append(
                    {
                        "index": idx,
                        "word": exp_words[idx],
                        "expected": exp_words[idx],
                        "recognized": None,
                        "error_type": "deletion" if op == "delete" else "substitution",
                    }
                )
        # Words in the recitation that are extra / wrong.
        if op in ("replace", "insert"):
            for idx in range(j1, j2):
                errors.append(
                    {
                        "index": idx,
                        "word": rec_words[idx],
                        "expected": None,
                        "recognized": rec_words[idx],
                        "error_type": "insertion" if op == "insert" else "substitution",
                    }
                )
    return errors
