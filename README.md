# Open Quran Engine 🕌

**Open-source AI Quran engine** — listen, correct, and teach Quran recitation with
word-by-word tajweed feedback.

> This is the open-source engine behind **Tilawah** (Arabic تِلاوَة, "recitation") — a
> free, non-profit platform + app for **Quran Learners** and **Quran Reciters (Qaris)**.

## 🎙️ For Qaris · 📖 For Learners — two ways to serve the Quran
- **Qaris (reciters)** lend their voice — recite verses and contribute clean recordings
  to a growing "waqf of sound" collection.
- **Learners** get instant, gentle feedback — every word compared and corrected, with the
  tajweed rules for that verse.

## What it is
- An **AI engine** (fine-tuned Whisper ASR) that transcribes your recitation with diacritics.
- A **correction engine** that diffs your recitation against the exact text of the ayah
  and highlights wrong / missing / extra words and **tajweed** issues.
- A **platform** (web) + **apps** (Tauri desktop & mobile) that listen to you recite the Quran.
- A **public API** for developers (see [API](#api) below).

## 📥 Try it
- **App & platform:** https://tilawah.me
- **Desktop + Android installers:** [Releases](https://github.com/m4mansoor/open-quran-engine/releases)

## Architecture (production-ready)
See [`docs/architecture.md`](docs/architecture.md) for the full design.

- **Clients:** Tauri v2 (desktop + mobile) + Web platform - all share one API.
- **App tier:** FastAPI (containerized) - orchestration, verse matching, tajweed diff.
- **ASR:** Whisper fine-tuned on Quran recitation (MaddoggProduction large-v3-turbo Quran LoRA, converted to CTranslate2 int8).
- **Queue/cache:** Redis (Streams + pub/sub).
- **Data:** PostgreSQL (self-hosted) + audio files on local NVMe disk.

## Repository layout
```
open-quran-engine/
├── server/          # FastAPI engine (runs on the Hostinger KVM4 VPS)
│   ├── app/
│   │   ├── main.py        # API (/health, /v1/correct, /v1/auth/*)
│   │   ├── trainer.py     # Qari data-collection endpoints (/v1/qari/*, /v1/surahs, /v1/recitations, /v1/coverage, /v1/admin/*)
│   │   ├── config.py      # central settings (model, device, audio_dir, admin_emails)
│   │   ├── schemas.py     # request/response models
│   │   ├── models.py      # SQLAlchemy models (users, recitations, corrections, sessions)
│   │   ├── migrate.py     # idempotent column migrations + admin seeding
│   │   ├── asr.py         # faster-whisper ASR wrapper
│   │   ├── phonetics.py   # makharij (articulation-point) phonetic classes
│   │   ├── verse_match.py # fuzzy transcript -> ayah matching
│   │   ├── tajweed.py        # word-level correction diff
│   │   ├── tajweed_rules.py  # madd/ghunnah/qalqalah/idgham/... detection
│   │   ├── mail.py           # email verification + password reset
│   │   ├── ratelimit.py      # per-user rate limiting
│   │   └── quran_data.py     # 6,236 ayahs + surah metadata
│   ├── Dockerfile
│   ├── requirements.txt
│   └── scripts/              # convert_model.sh, train_whisper.py, eval_model.py, segment.py, export_data.py, backup.sh
├── web/             # Qari web dashboard (Vite + React) - served by Caddy
├── apps/
│   └── desktop/     # Tauri v2 app (React + TS) → Windows/macOS/Android/iOS
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── NOTICES.md   # required open-source attribution
├── Caddyfile
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

Core endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/v1/correct` | Transcribe + correct a recitation (`audio_base64`) |
| POST | `/v1/auth/register` · `/v1/auth/login` | Create account / login → JWT |
| GET | `/v1/auth/me` | Current user (Bearer token) |

Trainer-platform endpoints (Qari data collection):

| Method | Endpoint | Description |
|---|---|---|
| GET/PUT | `/v1/qari/profile` | Onboarding: qira'ah, gender, level, consent |
| GET | `/v1/surahs` · `/v1/surahs/{n}` | Browse 114 surahs / 6,236 ayahs |
| GET | `/v1/qari/next-verse` | Coverage-aware verse assignment |
| POST | `/v1/recitations` | Submit audio → auto-transcribed + scored |
| GET | `/v1/recitations/mine` | Own submissions |
| GET | `/v1/coverage` | Collection progress (counts only) |
| GET | `/v1/admin/recitations` · POST `/v1/admin/recitations/{id}/review` | Admin review queue |
| GET | `/v1/leaderboard` | Top qaris by points |
| GET/POST | `/v1/assignments/mine` · `/v1/admin/assignments` | Admin assigns verses to qaris |
| GET | `/v1/admin/export` | Training-data manifest (JSON) |
| POST | `/v1/auth/verify` · `/v1/auth/password-reset` | Email verification & password reset |

### Trainer platform (build your own model)
`web/` is a Qari dashboard: a Qari registers, consents, then gets assigned (or picks)
a verse, recites it, and submits the audio. Submissions are auto-transcribed and scored
against the reference; an admin (see `ADMIN_EMAILS`) approves/rejects them. Approved
recordings become training data - the goal is 5 distinct Qaris per verse across the
whole Quran before fine-tuning Whisper. Recordings are private (each Qari sees only
their own); only aggregate counts are shared.

Two frontends share one API:
- `web/` - the Qari dashboard, served by Caddy at `tilawah.me`.
- `apps/desktop` - the Tauri correction app (desktop/mobile).

## Testing

```bash
# backend unit tests (24 tests: matching, tajweed, security, segmentation)
cd server && python -m unittest discover -s tests

# web type-check + production build
cd web && npm run build

# end-to-end smoke tests (needs API on :8010 + web dev server on :5180)
cd web && npx playwright install   # first run only
npm run dev &                      # one shell
npx playwright test                # another shell
```

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

## Deploy to production (tilawah.me)

Full step-by-step deployment to the KVM4 VPS with Caddy auto-HTTPS:
see [`docs/deployment.md`](docs/deployment.md).

```bash
# on the VPS
git clone https://github.com/m4mansoor/open-quran-engine.git && cd open-quran-engine
cp .env.example .env   # set POSTGRES_PASSWORD, JWT_SECRET, ADMIN_EMAILS
docker compose up -d --build   # builds API + web dashboard; Caddy serves HTTPS
```

## Model & licensing
- **ASR model:** `MaddoggProduction/whisper-l-v3-turbo-quran-lora-dataset-mix` - Apache-2.0, converted to CTranslate2 int8 (`quran-ct2`).
- **Reference text:** Tanzil Quran (public domain), shipped as `server/app/data/quran.json`.
- See [`docs/NOTICES.md`](docs/NOTICES.md) for the required attribution.
