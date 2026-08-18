"""Export approved recitations to a training manifest (audio + text pairs).

Run inside the api container or locally with DB access:
  python scripts/export_data.py [output.json]
"""
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db import SessionLocal  # noqa: E402
from app.models import Recitation  # noqa: E402


def main(out: str = "data/manifest.json") -> None:
    db = SessionLocal()
    rows = db.query(Recitation).filter(Recitation.status == "approved").all()
    manifest = []
    for r in rows:
        if not r.audio_path or not os.path.isfile(r.audio_path):
            continue
        manifest.append(
            {
                "audio": os.path.abspath(r.audio_path),
                "text": r.transcript,
                "surah": r.surah,
                "ayah": r.ayah,
                "scope": r.scope,
            }
        )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Exported {len(manifest)} approved recitations to {out}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/manifest.json")
