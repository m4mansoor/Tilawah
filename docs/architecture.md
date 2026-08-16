# Tilawah — Architecture

Production-ready design. Every component is containerized, and the GPU layer is
serverless, so scaling is a configuration change — never a rewrite.

## Overview

```
                    ┌─────────────────────────────────────────────┐
                    │      Caddy (auto-HTTPS) on the KVM4 VPS       │
                    │      your domain → A record → VPS IP          │
                    └──────────────────────┬──────────────────────┘
                                           │ HTTPS / WSS
        ┌──────────────┬──────────────┬────┴─────┬──────────────┐
   Tauri Desktop  Tauri Mobile   Web Platform   (public API)
        └──────────────┴──────────────┴────┬─────┘
                                           │
                         ┌─────────────────▼─────────────────┐
                         │   App tier (CPU, containerized)    │
                         │  ┌────────────────────────────┐   │
                         │  │ API Gateway (FastAPI)        │   │  auth · rate-limit · REST + WSS
                         │  │ Recitation Service (FastAPI) │   │  orchestration · verse-match · tajweed diff
                         │  └──────────────┬─────────────┘   │
                         └─────────────────┼─────────────────┘
                                           │ enqueue audio job
                         ┌─────────────────▼─────────────────┐
                         │  Redis (Streams: queue + pub/sub   │
                         │  + cache + rate-limit)             │
                         └─────────────────┬─────────────────┘
                                           │
                         ┌─────────────────▼─────────────────┐
                         │  ASR Worker — SERVERLESS GPU       │
                         │  faster-whisper (CTranslate2, int8)│
                         │  whisper-large-v3-turbo Quran LoRA │
                         └───────────────────────────────────┘

Data:  PostgreSQL (self-hosted) · Audio files (local NVMe) · Redis
Obs:   Grafana Cloud (metrics/logs) · Sentry (errors)
```

## Layer decisions

| Layer | Decision | Rationale |
|---|---|---|
| Edge | Caddy (auto-HTTPS) on the VPS | Free TLS via Let's Encrypt; domain A record → VPS IP — no third party needed |
| Backend | Python **FastAPI** | Same language as ML stack — no boundary friction |
| App tier | Docker (OCI) containers | Runs on 1 VPS today or Kubernetes tomorrow — migration is config, not rewrite |
| ASR inference | **faster-whisper** (CTranslate2, int8) | ~4x faster, ~2x less memory than HF transformers |
| GPU execution | **Serverless GPU** (Modal / RunPod Serverless) | Scales to zero when idle; autoscales under load |
| Model | `whisper-large-v3-turbo` + Quran LoRA (Apache-2.0) | Best open Quran ASR; worker is model-agnostic |
| Queue | **Redis Streams** | Decouples ingestion from GPU; doubles as cache + rate-limit + pub/sub |
| Database | **PostgreSQL** (self-hosted) | Own the data — runs in a container on KVM4 with backups |
| Auth | FastAPI JWT (self-managed) | One auth for web + Tauri + mobile; no third-party dependency |
| Audio storage | Local NVMe disk (200 GB on KVM4) | Simplest & cheapest; holds tens of thousands of recordings |
| Realtime results | Redis pub/sub -> WebSocket | Push corrections to clients as they finish |
| Observability | Grafana Cloud + Sentry | Managed, free tier |
| CI/CD | **GitHub Actions** | Builds every app binary + Docker images on GitHub-hosted runners — no physical machines; GitOps-ready |
| IaC | Terraform / Pulumi | Reproducible infra-as-code from day 1 |

## Model serving contract (stable)

```
audio bytes + ayah_id
    -> { transcript (diacritized), word timestamps, confidence, corrections[] }
```

The model behind this contract can be upgraded freely.

## Build & Release — 100% CI, no physical machines

Every release binary for every platform is produced by **GitHub Actions**
(GitHub-hosted runners) with **Tauri v2**. No local machine — and no physical
Mac or other hardware — is ever used to build or sign. A developer only pushes a
`v*` tag (or runs the workflow manually).

| Target | GitHub runner | Output |
|---|---|---|
| Windows desktop | `windows-latest` | `.msi` / `.exe` |
| macOS desktop (Intel) | `macos-latest` | `.app` / `.dmg` |
| macOS desktop (Apple Silicon) | `macos-latest` | `.app` / `.dmg` (arm64) |
| Android | `ubuntu-latest` | `.apk` / `.aab` |
| iOS | `macos-latest` (Xcode) | `.ipa` |

- **Trigger:** push a `v*` tag, or `workflow_dispatch`.
- **Signing keys live only in CI:** code-signing certificates, Apple credentials,
  and the Android keystore are stored as **GitHub encrypted secrets** and applied
  inside the runners. Keys never leave GitHub.
- **macOS & iOS** build on Apple's `macos-latest` cloud runner (Xcode
  preinstalled), so a physical Mac is **not** required.
- **Artifacts** are attached to the GitHub Release automatically.
- The generated `src-tauri/gen/android` and `src-tauri/gen/ios` projects are
  committed to keep builds reproducible.

## Deployment on Hostinger KVM4 (CPU-only)

KVM4 = 4 vCPU AMD EPYC · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth.

The KVM4 VPS runs **only the server** (API + Redis + Postgres). App binaries are
built in GitHub Actions — never on the VPS or any local machine.

1. Install Docker + Docker Compose on the VPS.
2. `git clone <repo> && docker compose up -d --build`
3. The model is cached in the `tilawah-models` named volume (no re-download on reboot).
4. CPU inference with `whisper-base-ar-quran` (74M) is sufficient for the
   **record -> analyze** MVP flow.
5. Front it with **Caddy** (auto-HTTPS): point your domain's A record at the VPS IP.
6. **PostgreSQL** runs as the `db` service (persistent `tilawah-db` volume).
   Schedule nightly `pg_dump` backups (local + optional offsite) and enable WAL
   archiving for point-in-time recovery. Auth is self-managed JWT (FastAPI),
   no third-party provider. Recitation audio files live on the VPS's NVMe disk.

### Scaling path (additive, no re-architecture)
- **Higher accuracy / throughput:** point the ASR worker at a serverless GPU
  (Modal / RunPod) running the 809M turbo Quran model — same API contract.
- **More concurrent users:** add app-tier replicas behind a load balancer.
- **Live streaming mode:** add always-warm GPU pods.

## Data model (core)

```
users(id, email, ...)
ayahs(id, surah, ayah_no, text_uthmani, text_imla'i, tajweed_meta)
recitations(id, user_id, ayah_id, audio_url, model_version, status)
corrections(id, recitation_id, word_idx, expected, recognized, error_type, tajweed_rule)
sessions(id, user_id, surah, progress, stats)
```
