# Tilawah — Architecture

Production-ready design. Every component is containerized, and the GPU layer is
serverless, so scaling is a configuration change — never a rewrite.

## Overview

```
                    ┌─────────────────────────────────────────────┐
                    │            Cloudflare (DNS · CDN · WAF · DDoS)│
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

Data:  PostgreSQL (self-hosted) · Object storage (Cloudflare R2) · Redis
Obs:   Grafana Cloud (metrics/logs) · Sentry (errors)
```

## Layer decisions

| Layer | Decision | Rationale |
|---|---|---|
| Edge | Cloudflare | Free CDN/WAF/DDoS; R2 storage sits on it (zero egress) |
| Backend | Python **FastAPI** | Same language as ML stack — no boundary friction |
| App tier | Docker (OCI) containers | Runs on 1 VPS today or Kubernetes tomorrow — migration is config, not rewrite |
| ASR inference | **faster-whisper** (CTranslate2, int8) | ~4x faster, ~2x less memory than HF transformers |
| GPU execution | **Serverless GPU** (Modal / RunPod Serverless) | Scales to zero when idle; autoscales under load |
| Model | `whisper-large-v3-turbo` + Quran LoRA (Apache-2.0) | Best open Quran ASR; worker is model-agnostic |
| Queue | **Redis Streams** | Decouples ingestion from GPU; doubles as cache + rate-limit + pub/sub |
| Database | **PostgreSQL** (self-hosted) | Own the data — runs in a container on KVM4 with backups |
| Auth | FastAPI JWT (self-managed) | One auth for web + Tauri + mobile; no third-party dependency |
| Audio storage | Cloudflare R2 (S3-compatible) | Zero egress fees (audio is egress-heavy) |
| Realtime results | Redis pub/sub -> WebSocket | Push corrections to clients as they finish |
| Observability | Grafana Cloud + Sentry | Managed, free tier |
| CI/CD | GitHub Actions -> GHCR | GitOps-ready (ArgoCD/Flux if/when K8s) |
| IaC | Terraform / Pulumi | Reproducible infra-as-code from day 1 |

## Model serving contract (stable)

```
audio bytes + ayah_id
    -> { transcript (diacritized), word timestamps, confidence, corrections[] }
```

The model behind this contract can be upgraded freely.

## Deployment on Hostinger KVM4 (CPU-only)

KVM4 = 4 vCPU AMD EPYC · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth.

1. Install Docker + Docker Compose on the VPS.
2. `git clone <repo> && docker compose up -d --build`
3. The model is cached in the `tilawah-models` named volume (no re-download on reboot).
4. CPU inference with `whisper-base-ar-quran` (74M) is sufficient for the
   **record -> analyze** MVP flow.
5. Front it with Caddy/Nginx + Cloudflare for TLS and WAF.
6. **PostgreSQL** runs as the `db` service (persistent `tilawah-db` volume).
   Schedule nightly `pg_dump` backups to R2 and enable WAL archiving for
   point-in-time recovery. Auth is self-managed JWT (FastAPI), no third-party provider.

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
