"""Text-level tajweed rule detection (ahkam al-tajweed).

Detects the main recitation rules present in a diacritized Arabic ayah so the
correction engine can show the student *where* each rule applies. Audio-level
measurement (madd length, ghunnah duration) is a separate later phase that needs
forced alignment.
"""
from __future__ import annotations

FATHA = "\u064e"
DAMMA = "\u064f"
KASRA = "\u0650"
SHADDA = "\u0651"
SUKUN = "\u0652"

_DIACRITICS = set("\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670")

MADD_LETTERS = {"ا", "و", "ي"}
QALQALAH = {"ق", "ط", "ب", "ج", "د"}
IDGHAM_GHUNNA = {"ي", "ن", "م", "و"}
IDGHAM_NO_GHUNNA = {"ل", "ر"}
IKHFA_LETTERS = set("تثجدذزسشصضطظفقك")


def _is_diacritic(ch: str) -> bool:
    return ch in _DIACRITICS


def _tokens(text: str) -> list[str]:
    """Group each letter with its following diacritics; spaces kept as tokens."""
    tokens: list[str] = []
    for ch in text:
        if ch == " ":
            tokens.append(" ")
        elif _is_diacritic(ch):
            if tokens:
                tokens[-1] += ch
            else:
                tokens.append(ch)
        else:
            tokens.append(ch)
    return tokens


def _base(tok: str) -> str:
    return tok[0] if tok and tok != " " else ""


def _next_base(toks: list[str], i: int) -> str:
    """Return the base letter of the next non-space token after index i."""
    for j in range(i + 1, len(toks)):
        b = _base(toks[j])
        if b:
            return b
    return ""


def _has(tok: str, mark: str) -> bool:
    return mark in tok


def detect_tajweed(text: str) -> list[dict]:
    """Return the tajweed rules present in a diacritized ayah text."""
    toks = _tokens(text)
    rules: list[dict] = []

    for i, tok in enumerate(toks):
        b = _base(tok)
        if not b:
            continue

        if _has(tok, SHADDA) and b in {"ن", "م"}:
            rules.append(
                {
                    "rule": "ghunnah",
                    "letter": b,
                    "description": "Ghunnah: nasalize and hold the sound (~2 counts).",
                }
            )

        if _has(tok, SUKUN) and b in QALQALAH:
            rules.append(
                {
                    "rule": "qalqalah",
                    "letter": b,
                    "description": "Qalqalah: a light echo/bounce on the letter.",
                }
            )

        if _has(tok, SUKUN) and b == "ن":
            nxt = _next_base(toks, i)
            if nxt in IDGHAM_GHUNNA:
                rules.append(
                    {
                        "rule": "idgham",
                        "letter": b + nxt,
                        "description": "Idgham with ghunnah: merge the noon into the next letter.",
                    }
                )
            elif nxt in IDGHAM_NO_GHUNNA:
                rules.append(
                    {
                        "rule": "idgham",
                        "letter": b + nxt,
                        "description": "Idgham without ghunnah: merge the noon fully.",
                    }
                )
            elif nxt == "ب":
                rules.append(
                    {
                        "rule": "iqlab",
                        "letter": b + nxt,
                        "description": "Iqlab: noon becomes a hidden meem before baa.",
                    }
                )
            elif nxt in IKHFA_LETTERS:
                rules.append(
                    {
                        "rule": "ikhfa",
                        "letter": b + nxt,
                        "description": "Ikhfa: hide the noon with a light nasal sound.",
                    }
                )

        if b in MADD_LETTERS and i > 0:
            prev = toks[i - 1]
            if (
                (b == "ا" and prev.endswith(FATHA))
                or (b == "و" and prev.endswith(DAMMA))
                or (b == "ي" and prev.endswith(KASRA))
            ):
                rules.append(
                    {
                        "rule": "madd",
                        "letter": b,
                        "description": "Madd: lengthen the vowel (~2 counts).",
                    }
                )

    return rules


def tajweed_summary(rules: list[dict]) -> dict[str, int]:
    """Count rules by type."""
    counts: dict[str, int] = {}
    for r in rules:
        counts[r["rule"]] = counts.get(r["rule"], 0) + 1
    return counts
