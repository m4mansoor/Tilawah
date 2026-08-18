"""Split a full surah/juz audio into per-ayah clips using word timestamps.

Uses faster-whisper (the same ASR engine as the API) to get word timestamps,
aligns the recognized words to the known ayah boundaries of the surah, and emits
one 16 kHz mono WAV clip per ayah with ffmpeg. Pass `--dry-run` to print the
alignment plan without requiring ffmpeg or writing files.

Usage:
  python scripts/segment.py --audio recording.wav --surah 112 [--out data/clips] [--dry-run]
  python scripts/segment.py --audio recording.wav --juz 30 [--out data/clips]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata

# Make `app.quran_data` importable whether run as `python scripts/segment.py`
# (cwd = server/) or via an absolute path.
_SERVER_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVER_ROOT not in sys.path:
    sys.path.insert(0, _SERVER_ROOT)

from app.quran_data import ayahs_of_juz, ayahs_of_surah  # noqa: E402


def strip_diacritics(text: str) -> str:
    """Remove harakat/diacritics via NFKD decomposition."""
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c))


def norm_word(text: str) -> str:
    """Normalize an Arabic word for matching: strip diacritics, tatweel, punctuation."""
    text = strip_diacritics(text).replace("\u0640", "")  # tatweel
    return "".join(re.findall(r"[\u0621-\u064A]+", text))


def words_match(recognized: str, expected: str) -> bool:
    """Whether a recognized token corresponds to an expected word.

    Whisper word timestamps sometimes merge or split Arabic words, so beyond an
    exact match we also accept one side containing the other (when the shorter
    side has at least 2 letters, to avoid single-letter false positives).
    """
    if recognized == expected:
        return True
    if min(len(recognized), len(expected)) >= 2:
        return recognized in expected or expected in recognized
    return False


def align_clips(recognized: list[dict], ayahs: list[dict]) -> list[dict]:
    """Greedily align recognized words (with timestamps) onto ayah boundaries.

    Args:
        recognized: [{"word": str, "start": float, "end": float}, ...]
            Words in recitation order, already normalized.
        ayahs: [{"surah": int, "ayah": int, "words": [str, ...]}, ...]
            Expected words in recitation order.

    Returns:
        [{"surah": int, "ayah": int, "start": float, "end": float}, ...]
            One entry per ayah that had at least one matched word.
    """
    flat: list[tuple[int, str]] = []
    for i, a in enumerate(ayahs):
        for w in a["words"]:
            flat.append((i, w))

    clips: list[dict] = []
    cur: dict | None = None
    cur_idx = -1
    r = 0
    for ayah_idx, expected in flat:
        matched = None
        for k in range(r, len(recognized)):
            if words_match(recognized[k]["word"], expected):
                matched = recognized[k]
                r = k + 1
                break
        if matched is None:
            continue
        if cur is not None and ayah_idx != cur_idx:
            clips.append(cur)
            cur = None
        if cur is None:
            cur = {
                "surah": ayahs[ayah_idx]["surah"],
                "ayah": ayahs[ayah_idx]["ayah"],
                "start": matched["start"],
                "end": matched["end"],
            }
            cur_idx = ayah_idx
        else:
            cur["end"] = matched["end"]
    if cur is not None:
        clips.append(cur)
    return clips


def transcribe_words(model, audio: str) -> list[dict]:
    segments, _ = model.transcribe(audio, language="ar", word_timestamps=True)
    words: list[dict] = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            word = norm_word(w.word)
            if word:
                words.append({"word": word, "start": w.start, "end": w.end})
    return words


def _ayah_word_lists(ayahs: list[dict]) -> list[dict]:
    out = []
    for a in ayahs:
        words = [w for w in (norm_word(x) for x in a["text"].split()) if w]
        out.append({"surah": a["surah"], "ayah": a["ayah"], "words": words})
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--audio", required=True)
    scope = p.add_mutually_exclusive_group(required=True)
    scope.add_argument("--surah", type=int)
    scope.add_argument("--juz", type=int)
    p.add_argument("--out", default="data/clips")
    p.add_argument("--model", default="large-v3-turbo")
    p.add_argument("--device", default="cpu")
    p.add_argument("--compute-type", default="int8")
    p.add_argument("--pad", type=float, default=0.25, help="padding (s) added around each clip")
    p.add_argument("--dry-run", action="store_true", help="print the alignment plan without writing clips")
    args = p.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is required: pip install faster-whisper")

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    words = transcribe_words(model, args.audio)

    if args.surah:
        ayahs = _ayah_word_lists(ayahs_of_surah(args.surah))
    else:
        ayahs = _ayah_word_lists(ayahs_of_juz(args.juz))

    clips = align_clips(words, ayahs)

    if args.dry_run:
        for c in clips:
            print(f"{c['surah']}:{c['ayah']}\t{c['start']:.2f}-{c['end']:.2f}")
        print(f"{len(clips)} ayahs aligned from {len(words)} recognized words.")
        return

    os.makedirs(args.out, exist_ok=True)
    manifest: list[dict] = []
    for c in clips:
        start = max(0.0, c["start"] - args.pad)
        end = c["end"] + args.pad
        out_name = f"{c['surah']:03d}-{c['ayah']:03d}.wav"
        out_path = os.path.join(args.out, out_name)
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", f"{start:.3f}",
                "-t", f"{end - start:.3f}",
                "-i", args.audio,
                "-ar", "16000", "-ac", "1",
                out_path,
            ],
            check=True,
        )
        manifest.append({"surah": c["surah"], "ayah": c["ayah"], "audio": out_path})

    with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(clips)} clips + manifest.json to {args.out}")


if __name__ == "__main__":
    main()
