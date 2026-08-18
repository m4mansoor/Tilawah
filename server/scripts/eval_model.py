"""Evaluate a model against a training manifest (word/char error rate).

Usage:
  python scripts/eval_model.py --manifest data/manifest.json --model openai/whisper-base
"""
from __future__ import annotations

import argparse
import json

import evaluate


def norm(text: str) -> str:
    import re
    import unicodedata

    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return " ".join(re.findall(r"[\u0621-\u064A]+", text))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--model", default="openai/whisper-base")
    p.add_argument("--limit", type=int, default=50)
    args = p.parse_args()

    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor

    processor = WhisperProcessor.from_pretrained(args.model)
    model = WhisperForConditionalGeneration.from_pretrained(args.model)

    with open(args.manifest, encoding="utf-8") as f:
        rows = json.load(f)[: args.limit]

    wer = evaluate.load("wer")
    cer = evaluate.load("cer")
    preds, refs = [], []
    for r in rows:
        audio = r["audio"]
        feat = processor(audio, sampling_rate=16000, return_tensors="pt").input_features
        with torch.no_grad():
            ids = model.generate(feat)
        pred = processor.batch_decode(ids, skip_special_tokens=True)[0]
        preds.append(norm(pred))
        refs.append(norm(r["text"]))

    print(f"WER: {wer.compute(predictions=preds, references=refs):.4f}")
    print(f"CER: {cer.compute(predictions=preds, references=refs):.4f}")


if __name__ == "__main__":
    main()
