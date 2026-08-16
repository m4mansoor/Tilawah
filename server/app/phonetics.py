"""Phonetic (makharij al-huruf) model for tolerant Arabic matching.

Whisper — even the Quran-tuned model — routinely confuses letters that share or
neighbour an articulation point (makhraj) during recitation: ق/ك, ح/ه, ن/ل,
س/ص, ت/ط, etc. A naive letter-for-letter diff therefore flags correctly-recited
verses as wrong.

This module maps every Arabic letter to a phonetic class so the correction engine
can tell *real* recitation mistakes (letters from distant classes) apart from ASR
artifacts (letters within the same class). It deliberately errs on the side of
tolerance: a few missed makhraj errors are preferable to false alarms on correct
recitation, which destroys user trust.
"""
from __future__ import annotations

# letter -> phonetic class, grouped by makhraj (articulation point). Adjacent
# points are merged where ASR commonly confuses them. Every Arabic letter
# (including hamza) appears exactly once.
PHONETIC_GROUPS: dict[str, str] = {
    # Gutturals (al-halq): hamza/ha (deep throat) + ain/hha (mid throat).
    # Whisper heavily confuses ء/ه/ع/ح, so they share one class.
    "ء": "guttural",
    "ه": "guttural",
    "ع": "guttural",
    "ح": "guttural",
    # Uvular fricatives (near throat): ghain / kha.
    "غ": "uvular",
    "خ": "uvular",
    # Back of tongue (aqsa al-lisan): qaf / kaf.
    "ق": "velar",
    "ك": "velar",
    # Middle of tongue (wasat al-lisan): jeem / sheen / ya.
    "ج": "palatal",
    "ش": "palatal",
    "ي": "palatal",
    # Tip/edge of tongue sonorants: lam / noon / ra.
    "ل": "alveolar",
    "ن": "alveolar",
    "ر": "alveolar",
    # Tip-of-tongue stops: dal / ta / emphatic ta / emphatic dal (dad).
    "د": "dental",
    "ت": "dental",
    "ط": "dental",
    "ض": "dental",
    # Sibilant fricatives: seen / sad / tha.
    "س": "sibilant",
    "ص": "sibilant",
    "ث": "sibilant",
    # Voiced fricatives: thal / zay / dha.
    "ذ": "fricative",
    "ز": "fricative",
    "ظ": "fricative",
    # Labials: ba / meem / fa / waw.
    "ب": "labial",
    "م": "labial",
    "ف": "labial",
    "و": "labial",
    # Long vowel alef.
    "ا": "alef",
}

# Human-readable labels for each class (used in tajweed feedback).
CLASS_NAMES: dict[str, str] = {
    "guttural": "حرف حلقي (throat letter)",
    "uvular": "حرف لهوي (uvular)",
    "velar": "حرف طبقي (back-of-tongue)",
    "palatal": "حرف شجري (mid-tongue)",
    "alveolar": "حرف لثوي (alveolar)",
    "dental": "حرف أسناني (dental)",
    "sibilant": "حرف صفيري (sibilant)",
    "fricative": "حرف احتكاكي (fricative)",
    "labial": "حرف شفوي (labial)",
    "alef": "ألف (alef)",
}


def phonetic_key(letter: str) -> str:
    """Return the phonetic class for a single (normalized) Arabic letter."""
    return PHONETIC_GROUPS.get(letter, letter)


def phonetic_word(word: str) -> str:
    """Map a normalized Arabic word to its phonetic key string.

    Used as the alignment key in the word-level diff so that letters from the
    same phonetic class compare equal (e.g. ق/ك, ح/ه, ن/ل). Each letter's class
    is "."-joined so the key is unambiguous.
    """
    return ".".join(phonetic_key(ch) for ch in word)


def phonetic_normalize(text: str) -> str:
    """Map *already-normalized* Arabic text to its phonetic key string.

    `text` must be diacritic-free, space-separated Arabic (as produced by
    `verse_match.normalize`). Letters become their phonetic class, "."-joined
    within a word and space-separated between words, so `difflib` aligns on
    phonetic classes while preserving word boundaries.
    """
    return " ".join(phonetic_word(word) for word in text.split())
