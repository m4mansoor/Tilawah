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
