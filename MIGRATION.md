# Migration notes — SaaS CRM multi-tenant

Kode lama (Next.js + Supabase, single shared DB + RLS per `team_id`)
tetap utuh di `src/` pada branch `backup/pre-migration`.
Struktur target (Fastify + Drizzle + Vue) dibangun berdampingan di
`apps/`, `packages/`, `docker-compose.yml` — strangler pattern.

Mapping data lama → tenant DB baru:
- `teams` → `companies` (master) + 1 tenant DB per team
- `profiles` → `users` + `roles` (Owner/Admin/Member) + `company_user_index`
- `contacts.label[]` → `tags`; tambah soft delete `deleted_at`
- `deals.stage` enum (chat_masuk/tertarik/ditawar/deal/batal) → `deal_stages` + `deals.stage_id`
- `tasks` → `activities` (type=task); `campaigns`/`messages` menyusul setelah paritas inti
