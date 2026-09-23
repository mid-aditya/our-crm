# CRM Backend (Go)

Backend CRM multi-tenant (DB-per-company) untuk **conversation**,
**blast message**, dan **ticketing** via WhatsApp **official**
(Meta Cloud API) maupun **unofficial** (gateway Baileys via HTTP).

Arsip implementasi Node.js sebelumnya tersimpan di branch
`archive/node-prototype`; project lama di `backup/pre-migration`.

## Stack

- Go 1.26, `net/http` stdlib (routing pola Go 1.22+)
- PostgreSQL 15+ via `pgx/v5` (pool per-tenant + LRU eviction, max 50)
- JWT access (15 mnt) + refresh token (hash di DB, bisa revoke)
- Password hashing argon2id (`golang.org/x/crypto`)
- Kredensial DB tenant dienkripsi AES-256-GCM di master DB

## Struktur

```
cmd/server/main.go          entrypoint + routing
internal/config             env loader (fail fast)
internal/db                 pool per-tenant + LRU
internal/crypto_util        AES-256-GCM
internal/auth               argon2id, JWT, refresh token
internal/middleware         auth JWT, tenant resolver, RBAC, CORS
internal/handlers           auth, signup, channels, conversations,
                            campaigns, tickets, reports, contacts, users
internal/wa                 sender official/unofficial + template {{var}}
internal/provision          signup: create DB + migrasi + seed + aktif
migrations/master_0001.sql  schema master (crm_master)
```

## Jalan lokal (Flyenv Postgres)

```powershell
Copy-Item .env.example .env
# isi MASTER_DSN, JWT_*_SECRET, TENANT_CRED_KEY (64 hex)
go run ./cmd/server
```

Buat database master sekali (via SQL editor):
`psql -f migrations/master_0001.sql`, lalu seed plan/admin manual
atau daftar company baru via `POST /api/v1/signup`.

## API (`/api/v1`)

- `GET /health`, `GET /api/v1/health`
- Auth: `POST /auth/login|refresh|logout|switch-company`
- `POST /signup` (provisioning sinkron di lokal)
- Channels: `GET|POST /wa-channels`
- Conversations: `GET|POST /conversations`, `GET .../messages`,
  `POST .../reply`, `PATCH ...` (status/assign),
  `POST /wa-webhook/{channelID}` (header `X-Company-Id`)
- Campaigns: `GET|POST /campaigns`, `GET .../preview`,
  `POST .../launch`, `DELETE ...`
- Tickets: `GET|POST /tickets`, `GET|PATCH .../{id}`,
  `POST .../{id}/replies`, `POST /tickets/public` (tanpa auth)
- Reports: `GET /reports/overview|conversations|funnel|agents`
- Contacts: `GET|POST /contacts`, `GET|PATCH|DELETE /contacts/{id}`
- Users/Roles: `GET /users`, `POST /users/invite`,
  `PATCH /users/{id}/role`, `GET /roles`, `PUT /roles/{id}/permissions`

Semua endpoint bisnis: `authenticate -> tenantResolver (company dari JWT)
-> rbacGuard(permission) -> handler`.

## Test

```powershell
go test ./...
```
