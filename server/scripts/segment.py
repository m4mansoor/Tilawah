"""Split a full surah/juz audio into per-ayah clips using word timestamps.

Requires faster-whisper (the same ASR engine used by the API). Produces
per-ayah clips so full-surah/juz submissions also contribute to verse-level
training data.

Usage:
  python scripts/segment.py --audio recording.wav --surah 112 [--out data/clips]
"""
from __future__ import annotations

import argparse
import os

from faster_whisper import WhisperModel


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--audio", required=True)
    p.add_argument("--surah", type=int, required=True)
    p.add_argument("--out", default="data/clips")
    p.add_argument("--model", default="large-v3-turbo")
    args = p.parse_args()

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(args.audio, language="ar", word_timestamps=True)

    # A production implementation maps word timestamps onto the ayah boundaries
    # from quran_data and emits one clip per ayah. This is a scaffold: it prints
    # the aligned words so you can wire the boundary logic.
    os.makedirs(args.out, exist_ok=True)
    for seg in segments:
        for w in seg.words:
            print(f"{w.start:.2f}-{w.end:.2f}\t{w.word}")


if __name__ == "__main__":
    main()
