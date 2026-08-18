# Deploy ASR on a serverless L4 GPU (Modal)

Run the **best model** (`large-v3-turbo` / Quran-tuned) at near-real-time by
offloading transcription to an **L4 GPU** on [Modal](https://modal.com) — you pay
**only for the GPU seconds you use** (~$0.80/hr, billed per second, $0 when idle).
The CPU app tier (KVM4) keeps serving the API, Postgres, Redis, and Caddy.

Cost at 1,000 recitations/day × 5 min each ≈ **$70–80/month** (L4), vs ~$150 on T4.

## 1. Create a Modal account (get $30 free credit)

1. Go to **https://modal.com** → **Sign up** (GitHub/Google/email).
2. You get **$30/month free credit** on the Starter plan — enough for the GPU cost
   at launch traffic, so you can test L4 essentially for free.

## 2. Install the Modal CLI

On your dev machine (or the VPS):

```bash
pip install modal          # or: curl -Ls https://modal.com/install.sh | sh
```

## 3. Link your account (creates a token)

```bash
modal token new
```

This prints a **token ID** and **token secret**. Save both — the API needs them
to call the worker.

## 4. Deploy the ASR worker (one command)

```bash
cd server
modal deploy modal/asr_app.py
```

This builds a container with `faster-whisper`, pre-caches `large-v3-turbo`
(~1.6 GB) into the image, and deploys it as an L4-backed app named **`tilawah-asr`**.

## 5. Point the API at the GPU

In your `.env` (or the VPS `.env` used by docker-compose):

```bash
ASR_BACKEND=modal
ASR_BEAM_SIZE=5                # drop to 1 for ~3-4x faster/cheaper (greedy)
MODAL_ASR_NAME=tilawah-asr
MODAL_TOKEN_ID=<from step 3>
MODAL_TOKEN_SECRET=<from step 3>
```

Then rebuild the API container (it now installs the `modal` SDK):

```bash
docker compose up -d --build api
```

## 6. Verify

```bash
curl -X POST https://tilawah.me/v1/correct \
  -H "Content-Type: application/json" \
  -d '{"audio_base64":"<base64 of a 16kHz mono wav>"}'
```

The first call cold-starts the L4 container (~5–10s); subsequent calls are ~1–3s
for a short ayah. Watch usage/cost at **https://modal.com/apps/tilawah-asr**.

## Switching back to CPU

```bash
ASR_BACKEND=local
docker compose up -d --build api
```

No code changes — `asr.py` branches on `ASR_BACKEND`.

## Using the Quran-fine-tuned model (optional, later)

The worker defaults to vanilla `large-v3-turbo`. To use your converted
`quran-ct2` (from `scripts/convert_model.sh`) on L4:

1. Create a Modal Volume and upload the `quran-ct2` directory.
2. Mount the volume in `server/modal/asr_app.py` and change `MODEL_ID`
   to the volume path.

## Alternative: dedicated always-on L4 (RunPod)

If you prefer a fixed, always-on GPU instead of serverless:

1. **https://www.runpod.io** → Sign up.
2. **Pods → Deploy** → pick **L4 (24 GB)** ($0.49/hr) — or **RTX A5000** ($0.27/hr,
   cheaper and also 24 GB).
3. Run the `server` Docker image with `DEVICE=0`, `MODEL_ID=large-v3-turbo`
   (or your `quran-ct2`), and point `REDIS_URL`/`DATABASE_URL` at your KVM4 host.
4. `ASR_BACKEND=local` + `DEVICE=0` on that pod.

Serverless (Modal) is cheaper unless you're past ~10,000 recitations/day.
