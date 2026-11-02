#!/usr/bin/env bash
# Build & jalankan seluruh stack (db, backend, web/Caddy).
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
	echo "ERROR: $ENV_FILE tidak ada. Salin dari .env.production.example dulu." >&2
	exit 1
fi

docker compose --env-file "$ENV_FILE" pull
docker compose --env-file "$ENV_FILE" up -d --build
docker compose --env-file "$ENV_FILE" ps
