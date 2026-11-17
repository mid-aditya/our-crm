#!/usr/bin/env bash
# Terapkan migrasi master DB (sekali di awal, aman diulang untuk migrasi bertanggal).
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
	echo "ERROR: $ENV_FILE tidak ada. Salin dari .env.production.example dulu." >&2
	exit 1
fi

set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a

DC=(docker compose --env-file "$ENV_FILE")
DB_USER="${POSTGRES_USER:-crm}"
DB_NAME="crm_master"

echo "==> Menunggu Postgres siap..."
ready=0
for _ in $(seq 1 30); do
	if "${DC[@]}" exec -T db pg_isready -U "$DB_USER" -d postgres >/dev/null 2>&1; then
		ready=1
		break
	fi
	sleep 2
done
if [[ "$ready" != "1" ]]; then
	echo "ERROR: Postgres belum siap. Cek: docker compose --env-file $ENV_FILE ps" >&2
	exit 1
fi

if ! "${DC[@]}" exec -T db psql -U "$DB_USER" -d postgres -tAc \
	"select 1 from pg_database where datname='$DB_NAME'" | grep -q 1; then
	echo "==> Membuat database $DB_NAME"
	"${DC[@]}" exec -T db createdb -U "$DB_USER" "$DB_NAME"
fi

apply() {
	echo "==> $1"
	"${DC[@]}" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$1"
}

# master_0001.sql membuat tipe ENUM, jadi tidak idempotent — lewati bila sudah ada.
if "${DC[@]}" exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc \
	"select to_regclass('public.companies')" | grep -q companies; then
	echo "==> Schema master sudah ada, lewati master_0001.sql"
else
	apply migrations/master_0001.sql
fi

# Urutan bertanggal WAJIB seperti ini (livechat membuat company demo, dst).
apply migrations/20260924072200_livechat.sql
apply migrations/20260925000000_users.sql
apply migrations/20260925000001_multi_channel.sql
apply migrations/20260926000000_master_rbac.sql
apply migrations/20260927000000_kanban_bot.sql
apply migrations/20260928000000_supervisor.sql

# Modul email untuk DB master/demo (idempotent, aman diulang).
apply migrations/tenant_email_0001.sql

echo "==> Migrasi selesai."
