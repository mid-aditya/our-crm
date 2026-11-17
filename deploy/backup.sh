#!/usr/bin/env bash
# Backup semua database (master + tenant) ke folder backups/ dalam format custom pg_dump.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

DC=(docker compose --env-file "$ENV_FILE")
DB_USER="${POSTGRES_USER:-crm}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups

dump() {
	local db="$1"
	echo "==> dump $db"
	"${DC[@]}" exec -T db pg_dump -U "$DB_USER" -Fc "$db" >"backups/${db}-${STAMP}.dump"
}

dump crm_master

while IFS= read -r db; do
	[[ -z "$db" ]] && continue
	dump "$db"
done < <("${DC[@]}" exec -T db psql -U "$DB_USER" -d postgres -tAc \
	"select datname from pg_database where datname like 'crm_tenant_%' order by 1")

echo "==> Selesai. File ada di backups/"
