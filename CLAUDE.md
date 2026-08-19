# CLAUDE.md — Open Quran Engine (powers the Tilawah app)

## What this project is
Tilawah — an open, non-profit platform + apps that **listen to a person reciting the
Quran and correct their mistakes** (wrong words/letters + tajweed rules).

Core loop:
```
mic capture -> ASR (Whisper, Quran-tuned) -> fuzzy verse match -> word diff + tajweed rules -> corrections
```

## Repo layout (monorepo)
- `server/` — FastAPI correction engine.
  - `app/main.py` — `/health`, `/v1/correct` (transcribe→match→diff→tajweed), `/v1/auth/*`.
  - `app/trainer.py` — qari/learner data endpoints (`/v1/qari/*`, `/v1/recitations`,
    `/v1/surahs`, `/v1/coverage`, `/v1/admin/*`).
  - `app/asr.py` (Whisper), `app/verse_match.py`, `app/tajweed.py` + `app/tajweed_rules.py`.
- `web/` — React web platform.
  - `src/Landing.tsx` (landing), `src/AppNew.tsx` (main app router), `src/theme.css`.
  - Other views: `ReciteView.tsx`, `AssignmentsView.tsx`, `AdminView.tsx`, `widgets.tsx`, `ui.tsx`.
- `examples/tilawah-app/` — **Tauri v2** app (React frontend + Rust shell in `src-tauri/`) — an example client.
  - Records mic natively via cpal (`start_recording`/`stop_recording` Tauri commands in
    `src-tauri/src/lib.rs` → base64 16-bit mono WAV), with MediaRecorder fallback in browser.
  - POSTs `/v1/correct` (`API_URL` = `VITE_API_URL` or `http://localhost:8010`).
  - `src-tauri/` has `Cargo.toml` (cpal/hound/base64), `tauri.conf.json` (`com.tilawah.app`),
    `capabilities/default.json`.
- `_redesign/` — design mockups (`*.dc.html`) that web pages must match pixel-faithfully.
- `docs/` — architecture / deployment / go-live / gpu-deployment runbooks.
- `.github/workflows/release.yml` — Tauri desktop + Android + iOS builds on tags.

## Key facts
- Domain: `tilawah.me` (Cloudflare-proxied → origin VPS).
- VPS: `srv1840905.hstgr.cloud` / `185.230.64.207` (Hostinger, **SHARED** VPS).
  - Repo at `/opt/tilawah` (verify on connect; docs also mention `~/Tilawah`).
  - Shared ports: web on **8080/8443** (`docker-compose.shared.yml`), Caddy disabled
    (another app owns 80/443), API on **8010**.
- Deploy: on VPS `git pull` then
  `docker compose -f docker-compose.yml -f docker-compose.shared.yml build web && ... up -d web`
  (rebuild **only** `web`; do NOT `down` or `up -d` the whole stack — shared host).
- SSH (working): local key `~/.ssh/tilawah-deploy` (ED25519, fingerprint
  `SHA256:Cgc+towJpXLzDI0sxjmNbgT8i3lJDMRhEt0uWJYDMpA`, no passphrase).
  `~/.ssh/id_ed25519` (comment `tilawah-deploy`, `SHA256:ZNTF...`) is passphrase-locked
  and `~/.ssh/spt_deploy` (`spt-deploy-20260708`) belongs to a DIFFERENT project.
- GitHub remote: `https://github.com/m4mansoor/open-quran-engine.git` (renamed from `Tilawah`; the consumer app stays branded **Tilawah**).

## Current development state
- DONE: landing page rebuilt faithfully to `_redesign/Landing v2.dc.html` (commit `ed57047`).
- DONE: full web platform (auth, qari mode, learner mode), server engine, Tauri scaffold.
- DONE: **deployed web changes to VPS** (Landing.tsx + AppNew.tsx + theme.css + full
  `web/src` synced via scp; rebuilt `tilawah-web` only; verified live at tilawah.me).
- NOTE: ASR uses `ASR_BACKEND=modal` (L4 GPU, `server/modal/asr_app.py`). The worker has
  NO `keep_warm` → scales to zero; cold start ~30-60s after ~5 min idle, warm ~1.5s.
  User chose to keep it serverless (accept cold start) — leave `keep_warm` OFF.
- TODO: verify OTHER design pages match `_redesign/*.dc.html` (Login, Register, Browse,
  Recite, Profile, Leaderboard, Progress, etc.).
- TODO: harden Tauri desktop app — native mic capture (macOS WKWebView / Linux WebKitGTK
  break `MediaRecorder`), mic permission (`NSMicrophoneUsageDescription`), packaging.
- Mobile (iOS/Android): only scaffolded in `release.yml`, not yet generated locally.

## Commands
- Web build: `cd web && npm run build`
- Web dev:   `cd web && npm run dev`  (uses `web/.env.development` → `http://localhost:8010`)
- Server:    `cd server && uvicorn app.main:app --port 8000` / tests: `pytest`
- Desktop:   `cd examples/tilawah-app && npm run tauri dev` (or `npm run dev` for browser-only)
