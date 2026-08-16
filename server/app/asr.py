"""ASR engine using faster-whisper (CTranslate2) for fast CPU inference.

faster-whisper is ~4x faster than the stock transformers pipeline on CPU and
uses int8 quantization, which is the production-standard approach for Whisper.
"""
from __future__ import annotations

import logging
import threading

from .config import settings

logger = logging.getLogger(__name__)

_model = None
_lock = threading.Lock()


def get_model():
    """Return a lazily-initialized faster-whisper model (thread-safe)."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from faster_whisper import WhisperModel

                device = "cpu" if settings.device < 0 else "cuda"
                logger.info(
                    "Loading ASR model %s (device=%s, int8)",
                    settings.model_id,
                    device,
                )
                _model = WhisperModel(
                    settings.model_id,
                    device=device,
                    compute_type="int8",
                )
                logger.info("ASR model ready")
    return _model


def transcribe(audio_path: str) -> str:
    """Transcribe an audio file to Arabic text."""
    model = get_model()
    segments, _info = model.transcribe(audio_path, language="ar", beam_size=5)
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip()


def transcribe_with_timestamps(audio_path: str):
    """Transcribe returning word-level segments (used for highlighting)."""
    model = get_model()
    segments, _info = model.transcribe(audio_path, language="ar", beam_size=5)
    return list(segments)

