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
                import os

                from faster_whisper import WhisperModel

                device = "cpu" if settings.device < 0 else "cuda"
                model_path = settings.model_id
                # Fall back to vanilla turbo if the converted model isn't present.
                if model_path.startswith("/") and not os.path.isdir(model_path):
                    logger.warning(
                        "Converted model %s not found; falling back to large-v3-turbo",
                        model_path,
                    )
                    model_path = "large-v3-turbo"
                logger.info(
                    "Loading ASR model %s (device=%s, int8)",
                    model_path,
                    device,
                )
                _model = WhisperModel(
                    model_path,
                    device=device,
                    compute_type="int8",
                )
                logger.info("ASR model ready")
    return _model


def _remote_transcribe(audio_path: str) -> str:
    """Transcribe via the deployed Modal GPU worker (serverless L4)."""
    try:
        import modal
    except ImportError as exc:
        raise RuntimeError(
            "ASR_BACKEND=modal requires the 'modal' package. Run: pip install modal"
        ) from exc

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    cls = modal.Cls.from_name(settings.modal_asr_name, "Transcriber")
    return cls().transcribe.remote(audio_bytes, settings.asr_beam_size)


def transcribe(audio_path: str) -> str:
    """Transcribe an audio file to Arabic text."""
    if settings.asr_backend == "modal":
        return _remote_transcribe(audio_path)
    model = get_model()
    segments, _info = model.transcribe(
        audio_path, language="ar", beam_size=settings.asr_beam_size
    )
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip()


def transcribe_with_timestamps(audio_path: str):
    """Transcribe returning word-level segments (used for highlighting)."""
    model = get_model()
    segments, _info = model.transcribe(
        audio_path, language="ar", beam_size=settings.asr_beam_size
    )
    return list(segments)

