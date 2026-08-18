# Go Live: Tilawah (tilawah.me)

Checklist to take Tilawah from local dev → public production on `tilawah.me`.

## ✅ Already done
- Secure `.env` generated (strong `POSTGRES_PASSWORD` + `JWT_SECRET`), DB re-initialized.
- Local stack verified healthy: `api`, `db`, `redis`, `web` up; E2E tests pass.
- `modal` CLI installed; `server/modal/asr_app.py` ready to deploy to an L4 GPU.

## You need to do 3 things (in this order)

### 1. Deploy the ASR worker to Modal (L4 GPU, ~$0.80/hr pay-per-use)
```bash
python -m modal setup          # opens a browser → sign in to Modal (once)
cd server && modal deploy modal/asr_app.py   # first deploy ~3-6 min (pre-caches model)
modal token new                # prints MODAL_TOKEN_ID + MODAL_TOKEN_SECRET
```
Add to `.env`:
```
ASR_BACKEND=modal
MODAL_TOKEN_ID=<from modal token new>
MODAL_TOKEN_SECRET=<from modal token new>
```
> Optional: leave `ASR_BACKEND=local` to run on CPU for now and switch later.

### 2. Get a VPS (KVM4) and deploy the stack
```bash
# on the VPS (fresh Ubuntu, Docker installed)
git clone https://github.com/m4mansoor/Tilawah.git && cd Tilawah
cp .env.example .env
nano .env   # set POSTGRES_PASSWORD, JWT_SECRET, ADMIN_EMAILS=<your email>, and Modal vars
docker compose up -d --build
docker compose ps   # api / web / db / redis / caddy should all be "Up"
```
> Caddy binds ports **80/443**. On a shared dev machine those may be taken — on a
> dedicated VPS they are free, which is required for auto-HTTPS.

### 3. Point DNS at the VPS
Create **A records** at your registrar:
- `@` → VPS-IP
- `www` → VPS-IP

Caddy fetches Let's Encrypt certificates automatically. Then verify:
```bash
curl https://tilawah.me/health
# {"status":"ok","app":"Tilawah","model":"/root/.cache/huggingface/quran-ct2"}
```

## Admin access
Set `ADMIN_EMAILS=you@email.com` **before** `docker compose up` so your account gets
the admin review panel (approve/reject recitations + assign verses).

## Notes
- First `/v1/correct` downloads the model (~1.5 GB) into the `tilawah-models` volume; cached thereafter.
- For the Quran-tuned model (best accuracy), run once on the VPS:
  `docker compose exec api sh /app/scripts/convert_model.sh && docker compose restart api`.
- Cost: app VPS ~$10–15/mo + Modal L4 ~$0–80/mo depending on recitation volume.
