"""Word-level correction: diff the recognized transcript against the reference ayah.

Words are aligned by their *phonetic key* (makharij al-huruf classes - see
phonetics.py) so ASR letter confusions (ق/ك, ح/ه, ن/ل, ...) don't produce false
"substitution" errors on correctly-recited text. Genuine mistakes between distant
articulation classes still surface as errors.
"""
from __future__ import annotations

import difflib

from .phonetics import phonetic_word
from .verse_match import normalize


def diff_words(expected: str, recognized: str) -> list[dict]:
    """Compare expected (reference) vs recognized words and return per-word errors.

    Returns a list of ``{"index", "word", "expected", "recognized", "error_type"}``.
    """
    exp_words = normalize(expected).split()
    rec_words = normalize(recognized).split()

    # Phonetic keys drive the alignment; real words are kept for reporting.
    exp_keys = [phonetic_word(w) for w in exp_words]
    rec_keys = [phonetic_word(w) for w in rec_words]

    errors: list[dict] = []
    matcher = difflib.SequenceMatcher(a=exp_keys, b=rec_keys, autojunk=False)
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            continue

        if op == "replace":
            # Pair up words one-to-one as substitutions where possible.
            n = min(i2 - i1, j2 - j1)
            for k in range(n):
                errors.append(
                    {
                        "index": i1 + k,
                        "word": exp_words[i1 + k],
                        "expected": exp_words[i1 + k],
                        "recognized": rec_words[j1 + k],
                        "error_type": "substitution",
                    }
                )
            # Leftover expected words = deletions (user skipped them).
            for k in range(i1 + n, i2):
                errors.append(
                    {
                        "index": k,
                        "word": exp_words[k],
                        "expected": exp_words[k],
                        "recognized": None,
                        "error_type": "deletion",
                    }
                )
            # Leftover recognized words = insertions (extra words spoken).
            for k in range(j1 + n, j2):
                errors.append(
                    {
                        "index": j1,
                        "word": rec_words[k],
                        "expected": None,
                        "recognized": rec_words[k],
                        "error_type": "insertion",
                    }
                )

        elif op == "delete":
            for k in range(i1, i2):
                errors.append(
                    {
                        "index": k,
                        "word": exp_words[k],
                        "expected": exp_words[k],
                        "recognized": None,
                        "error_type": "deletion",
                    }
                )

        elif op == "insert":
            for k in range(j1, j2):
                errors.append(
                    {
                        "index": j1,
                        "word": rec_words[k],
                        "expected": None,
                        "recognized": rec_words[k],
                        "error_type": "insertion",
                    }
                )
    return errors


_DIACRITICS = set("\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652\u0670")

_HARAKAT_NAMES = {
    "\u064e": "fat-ha",
    "\u064f": "damma",
    "\u0650": "kasra",
    "\u064b": "tanween fat-ha",
    "\u064c": "tanween damma",
    "\u064d": "tanween kasra",
    "\u0652": "sukun",
    "\u0651": "shadda",
    "\u0670": "dagger alef",
}


def _skeleton_marks(word: str) -> list[tuple[str, str]]:
    """Return (letter, marks) pairs for a diacritized Arabic word."""
    out: list[tuple[str, str]] = []
    for ch in word:
        if ch in _DIACRITICS:
            if out:
                letter, marks = out[-1]
                out[-1] = (letter, marks + ch)
        else:
            out.append((ch, ""))
    return out


def _describe_marks(marks: str) -> str:
    if not marks:
        return "no harakat"
    return " + ".join(_HARAKAT_NAMES.get(m, m) for m in marks)


def diacritic_diff(expected: str, recognized: str) -> list[str]:
    """Return harakat differences between two diacritized words that share the
    same letter skeleton. Returns [] when the skeletons differ or are identical.
    """
    exp = _skeleton_marks(expected)
    rec = _skeleton_marks(recognized)
    if len(exp) != len(rec):
        return []
    notes: list[str] = []
    for (el, em), (rl, rm) in zip(exp, rec):
        if el != rl:
            return []  # different consonant skeleton, not a pure harakat error
        if em != rm:
            notes.append(f"{el}: {_describe_marks(rm)} instead of {_describe_marks(em)}")
    return notes
