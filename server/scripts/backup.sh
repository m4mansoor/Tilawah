#!/bin/sh
# Nightly Postgres backup. Add to cron on the VPS:
#   0 2 * * * /path/to/Tilawah/server/scripts/backup.sh
set -e
mkdir -p "$(dirname "$0")/../backups"
docker compose exec -T db pg_dump -U tilawah tilawah > "$(dirname "$0")/../backups/tilawah-$(date +%F).sql"
echo "Backup written to backups/tilawah-$(date +%F).sql"
