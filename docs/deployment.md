# Deploy Tilawah (tilawah.me) to Hostinger KVM4

Production deployment on a Hostinger KVM4 VPS (4 vCPU · 16 GB RAM · 200 GB NVMe),
fronted by Caddy with automatic HTTPS.

## 1. DNS
In your registrar (where you bought tilawah.me), create A records:
- `@`  →  <VPS-IP>
- `www` →  <VPS-IP>

Caddy obtains Let's Encrypt certificates automatically for both.

## 2. Install Docker on the VPS
```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Get the code + configure secrets
```bash
git clone https://github.com/m4mansoor/Tilawah.git
cd Tilawah
cp .env.example .env
nano .env        # set a strong POSTGRES_PASSWORD and JWT_SECRET
```

## 4. Launch
```bash
docker compose up -d --build
docker compose ps    # verify api / db / redis / caddy are all Up
```

## 5. Verify
```bash
curl https://tilawah.me/health
# => {"status":"ok","app":"Tilawah","model":"tarteel-ai/whisper-base-ar-quran"}
```

The first `/v1/correct` call downloads the Whisper model (~300 MB) into the
`tilawah-models` volume — it is cached thereafter.

## Ports & services
- **80/443** — Caddy (public HTTPS). Only these should be open in the VPS firewall.
- **8010** — API (local/debug only; keep closed to the internet).
- **5432 / 6379** — PostgreSQL / Redis (internal only, not exposed).

## Updates
```bash
git pull
docker compose up -d --build
```

## Backups (nightly Postgres dump — add to cron)
```bash
docker compose exec db pg_dump -U tilawah tilawah > backup-$(date +%F).sql
```
