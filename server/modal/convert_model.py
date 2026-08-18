"""One-off conversion: download the Quran-tuned Whisper model and convert it to
CTranslate2 int8, stored in a Modal Volume that the ASR worker (asr_app.py) mounts.

Run once:
    modal run modal/convert_model.py
"""
from __future__ import annotations

import modal

MODEL = "MaddoggProduction/whisper-l-v3-turbo-quran-lora-dataset-mix"
VOLUME_NAME = "quran-ct2-model"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands("pip install torch --index-url https://download.pytorch.org/whl/cpu")
    .pip_install("transformers", "ctranslate2", "huggingface_hub", "sentencepiece", "accelerate", "safetensors")
)

app = modal.App("tilawah-model-convert", image=image)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)


@app.function(volumes={"/models": volume}, timeout=3600)
def convert() -> None:
    import os
    import shutil
    import subprocess

    from huggingface_hub import hf_hub_download

    out = "/models/quran-ct2"
    os.makedirs(out, exist_ok=True)
    result = subprocess.run(
        [
            "ct2-transformers-converter",
            "--model", MODEL,
            "--output_dir", out,
            "--quantization", "int8",
            "--force",
        ],
        capture_output=True,
        text=True,
    )
    print("=== STDOUT (tail) ===")
    print(result.stdout[-3000:])
    print("=== STDERR (tail) ===")
    print(result.stderr[-3000:])
    if result.returncode != 0:
        raise RuntimeError(f"converter failed with exit {result.returncode}")
    # faster-whisper needs this for 128-mel feature extraction.
    shutil.copy(
        hf_hub_download(MODEL, "preprocessor_config.json"),
        f"{out}/preprocessor_config.json",
    )
    print("DONE. Volume files:")
    for name in sorted(os.listdir(out)):
        print(" ", name)


@app.local_entrypoint()
def main() -> None:
    convert.remote()
