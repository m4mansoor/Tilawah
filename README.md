# Tilawah (تِلاوَة) — AI Quran Recitation Corrector

Tilawah listens to Quran recitation, recognizes the words, and points out
recitation and Tajweed mistakes — word by word — so anyone can recite with confidence.

> **Working title:** Tilawah (Arabic تِلاوَة, "recitation"). Started as "Quran Corrector".

## What it is
- A **platform** (web) + **apps** (Tauri desktop & mobile) that listen to you recite the Quran.
- An **AI engine** (fine-tuned Whisper ASR) that transcribes your recitation with diacritics.
- A **correction engine** that diffs your recitation against the exact text of the ayah
  and highlights wrong / missing / extra words and Tajweed issues.

## Architecture (production-ready)
See [`docs/architecture.md`](docs/architecture.md) for the full design.

- **Clients:** Tauri v2 (desktop + mobile) + Web platform — all share one API.
- **App tier:** FastAPI (containerized) — orchestration, verse matching, tajweed diff.
- **ASR:** Whisper fine-tuned on Quran recitation (Tarteel's open Apache-2.0 model).
- **Queue/cache:** Redis (Streams + pub/sub).
- **Data:** PostgreSQL (self-hosted) + audio files on local NVMe disk.

## Repository layout
```
quran-corrector/
├── server/          # FastAPI correction engine (runs on the Hostinger KVM4 VPS)
│   ├── app/
│   │   ├── main.py        # API endpoints (/health, /v1/correct)
│   │   ├── config.py      # central settings (model, device, redis)
│   │   ├── schemas.py     # request/response models
│   │   ├── asr.py         # model-agnostic ASR wrapper (Tarteel Whisper)
│   │   ├── verse_match.py # fuzzy transcript -> ayah matching
│   │   └── tajweed.py     # word-level correction diff
│   ├── Dockerfile
│   └── requirements.txt
├── apps/
│   └── desktop/     # Tauri v2 app (React + TS) → Windows/macOS/Android/iOS
├── docs/
│   ├── architecture.md
│   └── NOTICES.md   # required open-source attribution
└── docker-compose.yml
```

## Quickstart

Local (Python):
```bash
cd server
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
# open http://localhost:8010/docs
```

Docker (recommended, matches production on KVM4):
```bash
docker compose up --build
```

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/v1/correct` | Transcribe + correct a recitation (`audio_base64`) |
| POST | `/v1/auth/register` | Create account → JWT |
| POST | `/v1/auth/login` | Login → JWT |
| GET | `/v1/auth/me` | Current user (Bearer token) |

The React frontend in `apps/desktop` is the **single codebase for desktop, mobile, and
web** — served statically it becomes the web platform (the API has CORS enabled).

## Tauri app (Windows / macOS / Android / iOS)

```bash
cd apps/desktop
npm install
npm run tauri dev          # desktop (Windows/macOS/Linux)
npm run tauri android dev  # Android (requires Android SDK + NDK)
npm run tauri ios dev      # iOS (requires macOS + Xcode)
```

Release installers for all platforms are built in GitHub Actions
(`.github/workflows/release.yml`) whenever a `v*` tag is pushed.

## Model & licensing
- **ASR model:** `tarteel-ai/whisper-base-ar-quran` — Apache-2.0, ungated (no permission needed).
- **Training data:** `tarteel-ai/everyayah` — MIT.
- **Optional upgrade:** `MaddoggProduction/whisper-l-v3-turbo-quran-lora-dataset-mix` — Apache-2.0.
- See [`docs/NOTICES.md`](docs/NOTICES.md) for the required attribution (include in the app's licenses screen).
