"""Tilawah ASR worker on Modal — run faster-whisper on an L4 GPU.

This is a *serverless* worker: it scales to zero when idle and you only pay for
the GPU seconds it actually uses (L4 ≈ $0.80/hr, billed per second). It decouples
ASR from the CPU app tier (KVM4), which matches docs/architecture.md.

Deploy once:
    cd server
    modal token new                 # first time: link your Modal account
    modal deploy modal/asr_app.py   # creates the "tilawah-asr" app

Then point the API at it (set in .env / docker-compose):
    ASR_BACKEND=modal
    MODAL_ASR_NAME=tilawah-asr
    MODAL_TOKEN_ID=...       (from `modal token new` output)
    MODAL_TOKEN_SECRET=...

The worker loads `large-v3-turbo` by default. To use your Quran-fine-tuned model
instead, convert it with scripts/convert_model.sh and mount the resulting
`quran-ct2` directory via a Modal Volume, then change MODEL_ID below.
"""
from __future__ import annotations

import modal

# Model the worker loads. Default: vanilla large-v3-turbo (auto-downloaded ~1.6 GB).
# Swap for your converted Quran-tuned CTranslate2 model once it's in a Volume.
MODEL_ID = "large-v3-turbo"


def _download_model() -> None:
    """Pre-cache the model into the image at build time (fast cold starts)."""
    from faster_whisper import WhisperModel

    WhisperModel(MODEL_ID, device="cpu", compute_type="int8")


image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.0-runtime-ubuntu22.04",
        add_python="3.11",
    )
    .pip_install("faster-whisper")
    .run_function(_download_model)
)

app = modal.App("tilawah-asr", image=image)


@app.cls(gpu="L4", max_containers=8)
class Transcriber:
    """Loads the model once per warm container, then serves concurrent calls."""

    @modal.enter()
    def load(self) -> None:
        from faster_whisper import WhisperModel

        self.model = WhisperModel(MODEL_ID, device="cuda", compute_type="int8")

    @modal.method()
    def transcribe(self, audio_bytes: bytes, beam_size: int = 5) -> str:
        import os
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            path = f.name
        try:
            segments, _ = self.model.transcribe(
                path, language="ar", beam_size=beam_size
            )
            return " ".join(seg.text.strip() for seg in segments).strip()
        finally:
            try:
                os.remove(path)
            except OSError:
                pass
