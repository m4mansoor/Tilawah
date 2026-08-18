"""Fine-tune a Whisper model (LoRA) on the exported training manifest.

A starting-point training script. Run on a GPU machine (or Colab) with:
  pip install transformers peft datasets torch
  python scripts/train_whisper.py --manifest data/manifest.json \
      --model openai/whisper-base --output models/tilawah-whisper
"""
from __future__ import annotations

import argparse
import json

from datasets import Dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    WhisperForConditionalGeneration,
    WhisperProcessor,
)


def load_manifest(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def prepare(processor):
    def fn(batch):
        audio = batch["audio"]
        feat = processor(audio, sampling_rate=16000, return_tensors="pt").input_features[0]
        labels = processor.tokenizer(batch["text"]).input_ids
        return {"input_features": feat, "labels": labels}

    return fn


def collate(features):
    from torch.nn.utils.rnn import pad_sequence

    import torch

    return {
        "input_features": torch.stack([f["input_features"] for f in features]),
        "labels": pad_sequence(
            [torch.tensor(f["labels"]) for f in features],
            batch_first=True,
            padding_value=processor.tokenizer.pad_token_id,
        ),
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--model", default="openai/whisper-base")
    p.add_argument("--output", default="models/tilawah-whisper")
    p.add_argument("--epochs", type=float, default=3.0)
    p.add_argument("--lr", type=float, default=1e-4)
    args = p.parse_args()

    global processor
    processor = WhisperProcessor.from_pretrained(args.model)
    model = WhisperForConditionalGeneration.from_pretrained(args.model)
    model.config.forced_decoder_ids = None

    lora = LoraConfig(
        r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05, bias="none",
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    ds = Dataset.from_list(load_manifest(args.manifest))
    ds = ds.map(prepare(processor), remove_columns=ds.column_names)

    training_args = Seq2SeqTrainingArguments(
        output_dir=args.output,
        per_device_train_batch_size=8,
        gradient_accumulation_steps=2,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        fp16=True,
        save_strategy="epoch",
        logging_steps=25,
        predict_with_generate=True,
    )

    trainer = Seq2SeqTrainer(
        args=training_args, model=model, train_dataset=ds, data_collator=collate,
    )
    trainer.train()
    model.save_pretrained(args.output)
    processor.save_pretrained(args.output)
    print(f"Saved fine-tuned model to {args.output}")


if __name__ == "__main__":
    main()
