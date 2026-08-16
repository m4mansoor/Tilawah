"""Load and query the Quran reference text (imla'i script, diacritized).

The reference text powers verse matching and word-level correction. It ships as
a static JSON file (AlQuran.cloud `quran-simple`, sourced from Tanzil). The Quran
text itself is public domain, so the data file is safe to redistribute.

The returned shape per ayah is: {"id", "surah", "ayah", "text"}.
"""
from __future__ import annotations

import json
import os

_DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "quran.json")

_ayahs: list[dict] | None = None
_by_id: dict[int, dict] | None = None


def load_quran() -> list[dict]:
    """Return a flat, ordered list of all 6236 ayahs."""
    global _ayahs, _by_id
    if _ayahs is None:
        with open(_DATA_PATH, encoding="utf-8") as f:
            raw = json.load(f)

        flat: list[dict] = []
        for surah in raw["data"]["surahs"]:
            for a in surah["ayahs"]:
                flat.append(
                    {
                        "id": int(a["number"]),
                        "surah": int(surah["number"]),
                        "ayah": int(a["numberInSurah"]),
                        "text": a["text"].replace("\ufeff", "").strip(),
                    }
                )
        _ayahs = flat
        _by_id = {ayah["id"]: ayah for ayah in flat}
    return _ayahs


def get_ayah_by_id(ayah_id: int) -> dict | None:
    """Return the ayah with the given global id (1..6236)."""
    load_quran()
    return _by_id.get(ayah_id)


def get_ayah(surah: int, ayah: int) -> dict | None:
    """Return the ayah identified by (surah, ayah) numbers."""
    load_quran()
    for a in _ayahs:
        if a["surah"] == surah and a["ayah"] == ayah:
            return a
    return None


def all_ayahs() -> list[dict]:
    """Return all ayahs (for fuzzy matching)."""
    return load_quran()
