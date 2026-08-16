"""ASR engine — a thin, model-agnostic wrapper around Hugging Face Whisper.

The model is loaded lazily (thread-safe) so the API boots fast and stays
responsive while the model warms up. To upgrade the model, change
`settings.model_id` — no code or infrastructure change.
"""
from __future__ import annotations

import logging
import threading

from .config import settings

logger = logging.getLogger(__name__)

_pipe = None
_lock = threading.Lock()


def get_pipe():
    """Return a lazily-initialized ASR pipeline (thread-safe)."""
    global _pipe
    if _pipe is None:
        with _lock:
            if _pipe is None:
                from transformers import pipeline

                logger.info(
                    "Loading ASR model %s (device=%s)", settings.model_id, settings.device
                )
                _pipe = pipeline(
                    "automatic-speech-recognition",
                    model=settings.model_id,
                    device=settings.device,
                )
                logger.info("ASR model ready")
    return _pipe


def transcribe(audio_path: str) -> str:
    """Transcribe an audio file to (diacritized) Arabic text."""
    pipe = get_pipe()
    result = pipe(
        audio_path,
        generate_kwargs={"language": "arabic", "task": "transcribe"},
    )
    return result["text"].strip()


def transcribe_with_timestamps(audio_path: str):
    """Transcribe returning word-level timestamps (used for highlighting)."""
    pipe = get_pipe()
    return pipe(
        audio_path,
        generate_kwargs={"language": "arabic", "task": "transcribe"},
        return_timestamps="word",
    )
