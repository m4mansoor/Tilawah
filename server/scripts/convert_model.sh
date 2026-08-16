#!/bin/sh
# Convert the Quran-tuned Whisper model to CTranslate2 int8 for faster-whisper.
# Run INSIDE the api container (or anywhere ct2-transformers-converter is installed).
#
#   docker exec tilawah-api sh /app/scripts/convert_model.sh
#
set -e

MODEL="MaddoggProduction/whisper-l-v3-turbo-quran-lora-dataset-mix"
OUT="/root/.cache/huggingface/quran-ct2"

echo "Converting $MODEL -> $OUT (int8)..."
ct2-transformers-converter --model "$MODEL" --output_dir "$OUT" --quantization int8

echo "Copying preprocessor_config.json (required for 128-mel feature extraction)..."
SRC="$(find /root/.cache/huggingface -name preprocessor_config.json -path "*Maddogg*" | head -1)"
if [ -n "$SRC" ]; then
  cp "$SRC" "$OUT/preprocessor_config.json"
else
  python -c "from huggingface_hub import hf_hub_download; import shutil; shutil.copy(hf_hub_download('$MODEL','preprocessor_config.json'), '$OUT/preprocessor_config.json')"
fi

echo "Done: $OUT"
