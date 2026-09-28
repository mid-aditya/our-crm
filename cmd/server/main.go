package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"crm-backend/internal/app"
	"crm-backend/internal/config"
	"crm-backend/internal/handlers"
	"crm-backend/internal/livechat"
	"crm-backend/internal/middleware"
	"crm-backend/internal/provision"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// ensureDemoTenantUser membuat user + role + permission livechat di tenant DB
// agar auto-assign dan GET /livechat/agents menemukan agent.
// Mengembalikan effective user id (reuse baris by email bila sudah ada).
func ensureDemoTenantUser(ctx context.Context, tpool *pgxpool.Pool, userID, email, name, role string) string {
	// Self-heal: demo company memakai master sebagai tenant pool dan tenant lama
	// belum tentu punya tabel RBAC/livechat/channel → buat bila belum ada.
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, is_system_role BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "key" VARCHAR(128) NOT NULL UNIQUE, description TEXT, module TEXT)`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS role_permissions (role_id UUID NOT NULL, permission_id UUID NOT NULL, PRIMARY KEY (role_id, permission_id))`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS livechat_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID, visitor_id VARCHAR(64) NOT NULL, visitor_name VARCHAR(255), visitor_email VARCHAR(255), assigned_agent_id UUID, status VARCHAR(32) NOT NULL DEFAULT 'waiting', last_message TEXT, last_message_at TIMESTAMPTZ, waiting_since TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(company_id, visitor_id))`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS livechat_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID NOT NULL REFERENCES livechat_sessions(id) ON DELETE CASCADE, direction VARCHAR(16) NOT NULL, sender_id UUID, sender_name VARCHAR(255), body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS livechat_distribution (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID UNIQUE, mode VARCHAR(16) NOT NULL DEFAULT 'manual', round_robin_index INT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS ticket_field_defs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), field_key TEXT NOT NULL UNIQUE, label TEXT NOT NULL, field_type TEXT NOT NULL DEFAULT 'text', required BOOLEAN NOT NULL DEFAULT false, options JSONB NOT NULL DEFAULT '[]', position INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS ticket_field_values (ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, field_key TEXT NOT NULL, value TEXT NOT NULL DEFAULT '', PRIMARY KEY (ticket_id, field_key))`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS company_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS tenant_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `insert into tenant_migrations (version) values ('tenant_0001') on conflict do nothing`)
	// Tabel inti CRM (kontak, percakapan, kampanye, tiket) — belum ada di master/demo lama.
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS contacts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL, email TEXT, phone TEXT, company_name TEXT, source TEXT, owner_user_id UUID, tags TEXT[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ)`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), channel_id UUID NOT NULL, contact_id UUID, assigned_agent_id UUID, status TEXT NOT NULL DEFAULT 'open', last_message_at TIMESTAMPTZ, awaiting_since TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS conversation_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, direction TEXT NOT NULL, sender_id UUID, body TEXT NOT NULL, media_url TEXT, status TEXT NOT NULL DEFAULT 'sent', external_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, channel_id UUID NOT NULL, template TEXT NOT NULL, audience JSONB NOT NULL DEFAULT '{}', scheduled_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'draft', stats JSONB NOT NULL DEFAULT '{"sent": 0, "failed": 0, "total": 0}', created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS tickets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), number TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, description TEXT, contact_id UUID, assignee_id UUID, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', source TEXT NOT NULL DEFAULT 'agent', resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS ticket_replies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE, author_id UUID, author_type TEXT NOT NULL DEFAULT 'agent', body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS operational_hours (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), day_of_week INT NOT NULL, open_time TIME, close_time TIME, is_closed BOOLEAN NOT NULL DEFAULT false, UNIQUE(day_of_week))`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS agent_presence (user_id UUID PRIMARY KEY, status TEXT NOT NULL DEFAULT 'offline', aux_label TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS leave_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT true)`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS leave_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, leave_type_id UUID REFERENCES leave_types(id), start_date DATE NOT NULL, end_date DATE NOT NULL, reason TEXT, status TEXT NOT NULL DEFAULT 'pending', approver_id UUID, decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, date DATE NOT NULL, check_in TIMESTAMPTZ, check_out TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'present', UNIQUE(user_id, date))`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, user_name TEXT, role_name TEXT, method TEXT NOT NULL, path TEXT NOT NULL, status_code INT NOT NULL DEFAULT 0, ip TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	// Kanban + bot + flag sesi untuk DB lama.
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS kanban_boards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS kanban_columns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), board_id UUID NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE, name TEXT NOT NULL, position INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS kanban_cards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, assignee_id UUID, position INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS kanban_card_moves (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), card_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE, from_column_id UUID, to_column_id UUID, moved_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `CREATE TABLE IF NOT EXISTS bot_qa (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_id UUID REFERENCES bot_qa(id) ON DELETE CASCADE, keywords TEXT NOT NULL DEFAULT '', question TEXT NOT NULL DEFAULT '', answer TEXT NOT NULL, position INT NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, escalate BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE bot_qa ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES bot_qa(id) ON DELETE CASCADE`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_handled BOOLEAN NOT NULL DEFAULT false`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS bot_node_id UUID`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0`)
	_, _ = tpool.Exec(ctx, `ALTER TABLE livechat_sessions ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ`)
	for _, kp := range []string{"kanban.read", "kanban.manage"} {		var pid string
		_ = tpool.QueryRow(ctx, `insert into permissions ("key", module) values ($1,'kanban') on conflict ("key") do update set "key"=excluded."key" returning id`, kp).Scan(&pid)
		if pid == "" {
			_ = tpool.QueryRow(ctx, `select id from permissions where "key"=$1`, kp).Scan(&pid)
		}
		if pid != "" {
			_, _ = tpool.Exec(ctx, `insert into role_permissions (role_id, permission_id) select r.id, $1 from roles r where r.name in ('Developer','Admin','SPV','Agent') on conflict do nothing`, pid)
		}
	}
	// Seed Q&A bot default bila kosong.
	_, _ = tpool.Exec(ctx, `insert into bot_qa (keywords, question, answer, position, escalate) select 'halo,hallo,hai,pagi,siang,sore,malam,hello,hi','Salam pembuka','Halo! Selamat datang di layanan kami. Ada yang bisa kami bantu? Ketik "agent" untuk bicara dengan agent.',0,false where not exists (select 1 from bot_qa)`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (keywords, question, answer, position, escalate) select 'agent,admin,cs,customer service,orang','Minta agent','Baik, saya hubungkan ke agent kami. Mohon tunggu sebentar ya.',999,true where not exists (select 1 from bot_qa where escalate)`)
	// Seed template sample: pertanyaan beranak (bisa diubah/hapus via Pengaturan → Bot Responder).
	_, _ = tpool.Exec(ctx, `insert into bot_qa (keywords, question, answer, position, escalate) select 'jam buka,jadwal,operasional,buka jam berapa','Jam operasional','Kami buka Senin–Jumat 09.00–17.00 dan Sabtu 09.00–12.00.',10,false where not exists (select 1 from bot_qa where question='Jam operasional')`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (parent_id, keywords, question, answer, position, escalate) select id,'sabtu,weekend','Hari Sabtu','Hari Sabtu kami buka 09.00–12.00. Di luar itu silakan tinggalkan pesan, akan kami balas jam kerja berikutnya.',0,false from bot_qa where question='Jam operasional' and parent_id is null and not exists (select 1 from bot_qa where question='Hari Sabtu') limit 1`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (parent_id, keywords, question, answer, position, escalate) select id,'libur,tanggal merah,holiday,cuti bersama','Hari libur','Hari libur nasional dan cuti bersama kami tutup. Operasional kembali hari kerja berikutnya.',1,false from bot_qa where question='Jam operasional' and parent_id is null and not exists (select 1 from bot_qa where question='Hari libur') limit 1`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (keywords, question, answer, position, escalate) select 'cara order,order,beli,pesan,gimana cara','Cara order','Order bisa lewat chat ini, marketplace, atau datang langsung ke toko kami.',20,false where not exists (select 1 from bot_qa where question='Cara order')`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (parent_id, keywords, question, answer, position, escalate) select id,'bayar,pembayaran,transfer,qris,cod','Pembayaran','Kami menerima transfer bank, QRIS, e-wallet, dan COD untuk area tertentu.',0,false from bot_qa where question='Cara order' and parent_id is null and not exists (select 1 from bot_qa where question='Pembayaran') limit 1`)
	_, _ = tpool.Exec(ctx, `insert into bot_qa (parent_id, keywords, question, answer, position, escalate) select id,'kirim,ongkir,ekspedisi,delivery,pengiriman','Pengiriman','Pengiriman via ekspedisi reguler/ekonomi. Ongkir dihitung otomatis saat checkout, gratis ongkir untuk pembelian di atas Rp200.000.',1,false from bot_qa where question='Cara order' and parent_id is null and not exists (select 1 from bot_qa where question='Pengiriman') limit 1`)
	// Level hierarki + permission supervisi untuk role yang sudah ada.
	_, _ = tpool.Exec(ctx, `update roles set level=100 where name='Developer'`)
	_, _ = tpool.Exec(ctx, `update roles set level=80 where name='Admin'`)
	_, _ = tpool.Exec(ctx, `update roles set level=10 where name in ('Agent','Member')`)
	// SPV: 1 tingkat di atas agent — buat bila belum ada.
	_, _ = tpool.Exec(ctx, `insert into roles (name, is_system_role, level) select 'SPV', false, 50 where not exists (select 1 from roles where name='SPV')`)
	for _, sp := range []string{"team.manage", "activity.read", "leave.manage", "attendance.read"} {
		var pid string
		_ = tpool.QueryRow(ctx, `insert into permissions ("key", module) values ($1,'team') on conflict ("key") do update set "key"=excluded."key" returning id`, sp).Scan(&pid)
		if pid == "" {
			_ = tpool.QueryRow(ctx, `select id from permissions where "key"=$1`, sp).Scan(&pid)
		}
		if pid != "" {
			_, _ = tpool.Exec(ctx, `insert into role_permissions (role_id, permission_id) select r.id, $1 from roles r where r.name in ('Developer','Admin','SPV') on conflict do nothing`, pid)
		}
	}
	// Seed jam operasional & jenis cuti default.
	for d := 0; d <= 6; d++ {
		closed := d == 0 || d == 6
		var open, close *string
		if !closed {
			o, c := "09:00", "17:00"
			open, close = &o, &c
		}
		_, _ = tpool.Exec(ctx, `insert into operational_hours (day_of_week, open_time, close_time, is_closed) values ($1,$2::time,$3::time,$4) on conflict (day_of_week) do nothing`, d, open, close, closed)
	}
	for _, lt := range []string{"Cuti Tahunan", "Izin", "Sakit"} {
		_, _ = tpool.Exec(ctx, `insert into leave_types (name) values ($1) on conflict (name) do nothing`, lt)
	}
	permKeys := provision.AgentPermKeys()
	switch role {
	case "admin":
		permKeys = provision.AdminPermKeys()
	case "spv":
		permKeys = provision.SpvPermKeys()
	}
	permIDs := make([]string, 0, len(permKeys))
	for _, k := range permKeys {
		module := k
		if i := strings.Index(k, "."); i > 0 {
			module = k[:i]
		}
		var pid string
		_ = tpool.QueryRow(ctx, `insert into permissions ("key", module) values ($1,$2) on conflict ("key") do update set "key"=excluded."key" returning id`, k, module).Scan(&pid)
		if pid == "" {
			_ = tpool.QueryRow(ctx, `select id from permissions where "key"=$1`, k).Scan(&pid)
		}
		if pid != "" {
			permIDs = append(permIDs, pid)
		}
	}
	roleName := map[string]string{"agent": "Agent", "admin": "Admin", "spv": "SPV"}[role]
	if roleName == "" {
		roleName = "Agent"
	}
	var tenantRoleID string
	_ = tpool.QueryRow(ctx, `select id from roles where name=$1 limit 1`, roleName).Scan(&tenantRoleID)
	if tenantRoleID == "" {
		_ = tpool.QueryRow(ctx, `insert into roles (name) values ($1) returning id`, roleName).Scan(&tenantRoleID)
	}
	for _, pid := range permIDs {
		if tenantRoleID != "" {
			_, _ = tpool.Exec(ctx, `insert into role_permissions (role_id, permission_id) values ($1,$2) on conflict do nothing`, tenantRoleID, pid)
		}
	}
	// Upsert skema-agnostik (master: UNIQUE(company_id,email), tenant: UNIQUE(email)):
	// cari by email dulu, lalu UPDATE atau INSERT by id.
	var existingID string
	_ = tpool.QueryRow(ctx, `select id from users where email=$1 limit 1`, email).Scan(&existingID)
	effectiveID := userID
	if existingID != "" {
		effectiveID = existingID
		_, _ = tpool.Exec(ctx, `update users set status='active', role_id=$2, full_name=$3, email=$4 where id=$1`, effectiveID, nullUUID(tenantRoleID), name, email)
	} else {
		_, _ = tpool.Exec(ctx, `insert into users (id, email, password_hash, full_name, role_id, status) values ($1,$2,'',$3,$4,'active')`, effectiveID, email, name, nullUUID(tenantRoleID))
	}
	_, _ = tpool.Exec(ctx, `create table if not exists role_menu_grants (role_key text not null, menu_key text not null, granted_at timestamptz not null default now(), primary key (role_key, menu_key))`)
	// Default akses sidebar per role; admin/developer bisa ubah via PUT /roles/{role}/menus.
	for _, m := range []string{"dashboard", "conversations", "kanban", "contacts", "attendance"} {
		_, _ = tpool.Exec(ctx, `insert into role_menu_grants (role_key, menu_key) values ('agent',$1) on conflict do nothing`, m)
	}
	for _, m := range []string{"dashboard", "conversations", "kanban", "contacts", "attendance", "reports"} {
		_, _ = tpool.Exec(ctx, `insert into role_menu_grants (role_key, menu_key) values ('spv',$1) on conflict do nothing`, m)
	}
	if role == "agent" {
		// Demo Agent di bawah naungan Demo SPV (bila SPV sudah pernah login).
		var spvID string
		_ = tpool.QueryRow(ctx, `select id from users where email='spv@demo.com' limit 1`).Scan(&spvID)
		if spvID != "" && spvID != effectiveID {
			_, _ = tpool.Exec(ctx, `update users set supervisor_id=$1 where id=$2`, spvID, effectiveID)
		}
	}
	return effectiveID
}

func nullUUID(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	a, err := app.New(cfg)
	if err != nil {
		log.Fatalf("init: %v", err)
	}
	defer a.Master.Close()

	mux := http.NewServeMux()
	secret := cfg.JWTAccessSecret
	auth := func(h http.Handler) http.Handler { return middleware.Authenticate(secret, h) }
	adminAuth := func(h http.HandlerFunc) http.Handler { return middleware.Chain(h, auth, middleware.TenantResolver) }
	tenant := func(perm string, h http.HandlerFunc) http.Handler {
		return middleware.Chain(h, auth, middleware.TenantResolver, func(next http.Handler) http.Handler {
			return middleware.RBACGuard(perm, next)
		}, middleware.ActivityLogger)
	}

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { middleware.WriteOK(w, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) { middleware.WriteOK(w, map[string]string{"status": "ok"}) })

	// Rate limit ketat untuk endpoint publik/sensitif (anti brute force).
	strict := middleware.NewRateLimiter(10, time.Minute)
	mux.Handle("POST /api/v1/auth/login", strict.Limit(http.HandlerFunc(handlers.Login)))
	mux.Handle("POST /api/v1/auth/demo-login", strict.Limit(http.HandlerFunc(demoLoginHandler(secret, a))))
	mux.Handle("POST /api/v1/signup", strict.Limit(http.HandlerFunc(handlers.Signup)))
	mux.Handle("POST /api/v1/tickets/public", strict.Limit(http.HandlerFunc(handlers.TicketPublic)))
	mux.Handle("POST /api/v1/wa-webhook/{channelID}", strict.Limit(http.HandlerFunc(handlers.Webhook)))
	mux.Handle("POST /api/v1/auth/refresh", strict.Limit(http.HandlerFunc(handlers.Refresh)))
	mux.Handle("POST /api/v1/auth/logout", strict.Limit(http.HandlerFunc(handlers.Logout)))
	mux.Handle("POST /api/v1/auth/switch-company", strict.Limit(http.HandlerFunc(handlers.SwitchCompany)))

	mux.Handle("GET /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))
	mux.Handle("POST /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))

	mux.Handle("GET /api/v1/conversations", tenant("conversations.read", handlers.Conversations))
	mux.Handle("POST /api/v1/conversations", tenant("conversations.reply", handlers.Conversations))
	mux.Handle("GET /api/v1/conversations/{id}/messages", tenant("conversations.read", handlers.ConversationMessages))
	mux.Handle("POST /api/v1/conversations/{id}/reply", tenant("conversations.reply", handlers.ConversationReply))
	mux.Handle("PATCH /api/v1/conversations/{id}", tenant("conversations.assign", handlers.ConversationPatch))

	mux.Handle("GET /api/v1/campaigns", tenant("campaigns.read", handlers.Campaigns))
	mux.Handle("POST /api/v1/campaigns", tenant("campaigns.create", handlers.Campaigns))
	mux.Handle("GET /api/v1/campaigns/{id}/preview", tenant("campaigns.read", handlers.CampaignPreview))
	mux.Handle("POST /api/v1/campaigns/{id}/launch", tenant("campaigns.launch", handlers.CampaignLaunch))
	mux.Handle("DELETE /api/v1/campaigns/{id}", tenant("campaigns.delete", handlers.CampaignDelete))

	mux.Handle("GET /api/v1/tickets", tenant("tickets.read", handlers.Tickets))
	mux.Handle("POST /api/v1/tickets", tenant("tickets.create", handlers.Tickets))
	mux.Handle("GET /api/v1/tickets/{id}", tenant("tickets.read", handlers.TicketDetail))
	mux.Handle("POST /api/v1/tickets/{id}/replies", tenant("tickets.update", handlers.TicketDetail))
	mux.Handle("PATCH /api/v1/tickets/{id}", tenant("tickets.update", handlers.TicketDetail))

	mux.Handle("GET /api/v1/reports/overview", tenant("reports.view", handlers.ReportOverview))
	mux.Handle("GET /api/v1/reports/conversations", tenant("reports.view", handlers.ReportConversations))
	mux.Handle("GET /api/v1/reports/funnel", tenant("reports.view", handlers.ReportFunnel))
	mux.Handle("GET /api/v1/reports/agents", tenant("reports.view", handlers.ReportAgents))

	mux.Handle("GET /api/v1/contacts", tenant("contacts.read", handlers.Contacts))
	mux.Handle("POST /api/v1/contacts", tenant("contacts.create", handlers.Contacts))
	mux.Handle("GET /api/v1/contacts/{id}", tenant("contacts.read", handlers.Contacts))
	mux.Handle("PATCH /api/v1/contacts/{id}", tenant("contacts.update", handlers.Contacts))
	mux.Handle("DELETE /api/v1/contacts/{id}", tenant("contacts.delete", handlers.Contacts))

	mux.Handle("GET /api/v1/users", tenant("settings.manage_roles", handlers.Users))
	mux.Handle("POST /api/v1/users/invite", tenant("settings.manage_roles", handlers.Users))
	mux.Handle("PATCH /api/v1/users/{id}/role", tenant("settings.manage_roles", handlers.UserRole))
	mux.Handle("GET /api/v1/roles/{role}/menus", tenant("settings.manage_roles", handlers.RoleMenus))
	mux.Handle("PUT /api/v1/roles/{role}/menus", tenant("settings.manage_roles", handlers.RoleMenus))
	mux.Handle("PUT /api/v1/users/{id}/supervisor", tenant("team.manage", handlers.UserSupervisor))

	// Dashboard summary: ringkasan aktivitas sesuai hierarki (semua user login).
	mux.Handle("GET /api/v1/dashboard/summary", middleware.Chain(http.HandlerFunc(handlers.DashboardSummary), auth, middleware.TenantResolver))
	mux.Handle("GET /api/v1/menu-grants", middleware.Chain(http.HandlerFunc(handlers.MyMenus), auth, middleware.TenantResolver, middleware.ActivityLogger))

	// Operational hours (lihat: semua login; setup: admin/developer).
	// Catatan: GET juga dicatat? tidak (GET dilewati logger).
	mux.Handle("GET /api/v1/settings/operational-hours", middleware.Chain(http.HandlerFunc(handlers.GetOperationalHours), auth, middleware.TenantResolver))
	mux.Handle("PUT /api/v1/settings/operational-hours", tenant("settings.manage_roles", handlers.PutOperationalHours))

	// Presence / aux agent.
	mux.Handle("GET /api/v1/livechat/presence", middleware.Chain(http.HandlerFunc(handlers.GetMyPresence), auth, middleware.TenantResolver))
	mux.Handle("PUT /api/v1/livechat/presence", middleware.Chain(http.HandlerFunc(handlers.PutMyPresence), auth, middleware.TenantResolver, middleware.ActivityLogger))
	mux.Handle("GET /api/v1/livechat/presences", tenant("team.manage", handlers.ListPresences))

	// Cuti/izin.
	mux.Handle("GET /api/v1/leave-types", middleware.Chain(http.HandlerFunc(handlers.LeaveTypes), auth, middleware.TenantResolver))
	mux.Handle("POST /api/v1/leave-types", tenant("leave.manage", handlers.LeaveTypes))
	mux.Handle("GET /api/v1/leaves", middleware.Chain(http.HandlerFunc(handlers.Leaves), auth, middleware.TenantResolver, middleware.ActivityLogger))
	mux.Handle("POST /api/v1/leaves", middleware.Chain(http.HandlerFunc(handlers.Leaves), auth, middleware.TenantResolver, middleware.ActivityLogger))
	mux.Handle("GET /api/v1/leaves/all", tenant("team.manage", handlers.LeavesAll))
	mux.Handle("POST /api/v1/leaves/{id}/approve", tenant("team.manage", handlers.ApproveLeave))

	// Absensi.
	mux.Handle("POST /api/v1/attendance/check-in", middleware.Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { handlers.AttendanceCheck(w, r, false) }), auth, middleware.TenantResolver, middleware.ActivityLogger))
	mux.Handle("POST /api/v1/attendance/check-out", middleware.Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { handlers.AttendanceCheck(w, r, true) }), auth, middleware.TenantResolver, middleware.ActivityLogger))
	mux.Handle("GET /api/v1/attendance/mine", middleware.Chain(http.HandlerFunc(handlers.AttendanceList), auth, middleware.TenantResolver))
	mux.Handle("GET /api/v1/attendance", tenant("attendance.read", handlers.AttendanceList))

	// Log aktivitas (developer..spv+).
	mux.Handle("GET /api/v1/activity-logs", tenant("activity.read", handlers.ActivityLogs))

	// Form tiket custom per company (baca: semua login; kelola: admin/developer).
	mux.Handle("GET /api/v1/ticket-fields", middleware.Chain(http.HandlerFunc(handlers.TicketFields), auth, middleware.TenantResolver))
	mux.Handle("POST /api/v1/ticket-fields", tenant("settings.manage_roles", handlers.TicketFields))
	mux.Handle("PATCH /api/v1/ticket-fields/{id}", tenant("settings.manage_roles", handlers.TicketFieldDetail))
	mux.Handle("DELETE /api/v1/ticket-fields/{id}", tenant("settings.manage_roles", handlers.TicketFieldDetail))

	// Pengaturan umum + versi skema DB company.
	mux.Handle("GET /api/v1/company/settings", middleware.Chain(http.HandlerFunc(handlers.CompanySettings), auth, middleware.TenantResolver))
	mux.Handle("PUT /api/v1/company/settings", tenant("settings.manage_roles", handlers.CompanySettings))
	mux.Handle("GET /api/v1/company/schema-version", tenant("settings.manage_roles", handlers.SchemaVersion))

	// Kanban ala Trello.
	mux.Handle("GET /api/v1/kanban/boards", tenant("kanban.read", handlers.KanbanBoards))
	mux.Handle("POST /api/v1/kanban/boards", tenant("kanban.manage", handlers.KanbanBoards))
	mux.Handle("GET /api/v1/kanban/boards/{id}", tenant("kanban.read", handlers.KanbanBoardDetail))
	mux.Handle("PATCH /api/v1/kanban/boards/{id}", tenant("kanban.manage", handlers.KanbanBoardDetail))
	mux.Handle("DELETE /api/v1/kanban/boards/{id}", tenant("kanban.manage", handlers.KanbanBoardDetail))
	mux.Handle("POST /api/v1/kanban/boards/{id}/columns", tenant("kanban.manage", handlers.KanbanColumns))
	mux.Handle("PATCH /api/v1/kanban/columns/{id}", tenant("kanban.manage", handlers.KanbanColumns))
	mux.Handle("DELETE /api/v1/kanban/columns/{id}", tenant("kanban.manage", handlers.KanbanColumns))
	mux.Handle("POST /api/v1/kanban/cards", tenant("kanban.manage", handlers.KanbanCards))
	mux.Handle("PATCH /api/v1/kanban/cards/{id}", tenant("kanban.manage", handlers.KanbanCards))
	mux.Handle("DELETE /api/v1/kanban/cards/{id}", tenant("kanban.manage", handlers.KanbanCards))
	mux.Handle("POST /api/v1/kanban/cards/{id}/move", tenant("kanban.manage", handlers.KanbanMove))
	mux.Handle("GET /api/v1/kanban/cards/{id}/moves", tenant("kanban.read", handlers.KanbanMoves))
	mux.Handle("GET /api/v1/kanban/my-cards", middleware.Chain(http.HandlerFunc(handlers.KanbanMyCards), auth, middleware.TenantResolver))

	// Bot responder (kelola: admin/developer; baca: semua login).
	mux.Handle("GET /api/v1/bot-qa", middleware.Chain(http.HandlerFunc(handlers.BotQAList), auth, middleware.TenantResolver))
	mux.Handle("POST /api/v1/bot-qa", tenant("settings.manage_roles", handlers.BotQAList))
	mux.Handle("PATCH /api/v1/bot-qa/{id}", tenant("settings.manage_roles", handlers.BotQADetail))
	mux.Handle("DELETE /api/v1/bot-qa/{id}", tenant("settings.manage_roles", handlers.BotQADetail))
	mux.Handle("GET /api/v1/roles", tenant("settings.manage_roles", handlers.Roles))
	mux.Handle("PUT /api/v1/roles/{id}/permissions", tenant("settings.manage_roles", handlers.Roles))

	// Livechat routes — visitor publik (buat sesi) + agent (JWT+tenant+RBAC).
	// Pesan visitor lewat WebSocket (disimpan di handleVisitorMessage);
	// POST .../messages khusus agent (butuh identitas JWT untuk sender).
	mux.HandleFunc("GET /ws/livechat", livechat.WebSocketHandler)
	mux.HandleFunc("POST /api/v1/livechat/sessions", livechat.CreateSessionHandler) // public — visitor creates session
	mux.HandleFunc("GET /api/v1/livechat/sessions/{id}", livechat.SessionHandler)   // public — visitor/agent read session
	mux.HandleFunc("GET /api/v1/livechat/sessions/{id}/messages", livechat.MessagesHandler)
	mux.Handle("POST /api/v1/livechat/sessions/{id}/messages", tenant("livechat.reply", livechat.SendMessageHandler))

	// Agent-only — JWT + tenant + RBAC livechat
	mux.Handle("GET /api/v1/livechat/queue", tenant("livechat.read", livechat.QueueHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/assign", tenant("livechat.assign", livechat.AssignHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/take", tenant("livechat.reply", livechat.TakeHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/resolve", tenant("livechat.assign", livechat.ResolveHandler))
	mux.Handle("GET /api/v1/livechat/sse", tenant("livechat.read", livechat.SSEHandler))
	mux.Handle("GET /api/v1/livechat/agents", tenant("livechat.read", livechat.AgentsHandler))
	mux.Handle("GET /api/v1/livechat/distribution", tenant("livechat.read", livechat.GetDistributionHandler))
	mux.Handle("POST /api/v1/livechat/distribution", tenant("livechat.manage", livechat.SetDistributionHandler))

	// Channel management (company tenant level)
	mux.Handle("GET /api/v1/channel-types", tenant("channels.read", handlers.ChannelTypes))
	mux.Handle("GET /api/v1/company/channels", tenant("channels.read", handlers.CompanyChannels))
	mux.Handle("GET /api/v1/company/channels/{typeId}", tenant("channels.read", handlers.GetCompanyChannel))
	mux.Handle("POST /api/v1/company/channels", tenant("channels.manage", handlers.EnableChannel))
	mux.Handle("DELETE /api/v1/company/channels/{typeId}", tenant("channels.manage", handlers.DisableChannel))
	mux.Handle("GET /api/v1/company/channels/{typeId}/configs", tenant("channels.read", handlers.GetCompanyChannel))
	mux.Handle("POST /api/v1/company/channels/{typeId}/configs", tenant("channels.manage", handlers.SaveChannelConfig))

	// Platform admin: manage companies (JWT + tenant, no RBAC for demo compatibility)
	mux.Handle("GET /api/v1/admin/companies", adminAuth(handlers.AdminCompanies))
	mux.Handle("POST /api/v1/admin/companies", adminAuth(handlers.CreateAdminCompany))
	mux.Handle("GET /api/v1/admin/companies/{id}", adminAuth(handlers.GetAdminCompany))
	mux.Handle("PATCH /api/v1/admin/companies/{id}", adminAuth(handlers.UpdateAdminCompany))
	mux.Handle("DELETE /api/v1/admin/companies/{id}", adminAuth(handlers.DeleteAdminCompany))

	// WithApp paling luar agar AppFrom tersedia di semua handler.
	wrapped := middleware.WithApp(a, middleware.RequestLog(middleware.CORS(cfg.CORSOrigins, mux)))

	addr := ":" + strings.TrimSpace(cfg.Port)
	fmt.Println("listening on", addr)
	log.Fatal(http.ListenAndServe(addr, wrapped))
}

// demoLoginHandler returns a handler that generates a JWT for the demo company + role.
func demoLoginHandler(secret string, a *app.App) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Role string `json:"role"` // "agent", "spv" atau "admin"
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			middleware.WriteErr(w, 400, "INVALID_REQUEST", "Invalid request body")
			return
		}
		if in.Role != "agent" && in.Role != "admin" && in.Role != "spv" {
			in.Role = "agent"
		}

		// Demo company UUID — must match the seeded company in migrations.
		demoCompanyID := "00000000-0000-0000-0000-000000000001"
		// Bedakan user + role per pilihan login agar "login sebagai agent"
		// tidak berubah jadi owner/admin di dashboard.
		var demoUserID, demoEmail, demoName, roleID string
		switch in.Role {
		case "admin":
			demoUserID = "00000000-0000-0000-0000-000000000002"
			demoEmail = "admin@demo.com"
			demoName = "Demo Admin"
			roleID = "00000000-0000-0000-0000-000000000003" // admin/owner
		case "spv":
			demoUserID = "00000000-0000-0000-0000-000000000003"
			demoEmail = "spv@demo.com"
			demoName = "Demo SPV"
			roleID = "00000000-0000-0000-0000-000000000004" // spv
		default:
			demoUserID = "00000000-0000-0000-0000-000000000001"
			demoEmail = "demo@demo.com"
			demoName = "Demo Agent"
			roleID = "00000000-0000-0000-0000-000000000002" // agent
		}

		// Verify demo company exists
		var exists bool
		err := a.Master.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM companies WHERE id=$1)`,
			demoCompanyID).Scan(&exists)
		if err != nil || !exists {
			middleware.WriteErr(w, 404, "DEMO_NOT_SETUP", "Demo company not found. Run migrations first.")
			return
		}

		// Get or create a demo user
		_, err = a.Master.Exec(r.Context(),
			`INSERT INTO users (id, company_id, email, full_name, role_id, status)
			 VALUES ($1, $2, $3, $4, $5, 'active')
			 ON CONFLICT (id) DO UPDATE SET status='active', role_id=excluded.role_id, full_name=excluded.full_name, email=excluded.email`,
			demoUserID, demoCompanyID, demoEmail, demoName, roleID)

		// Mirror ke tenant DB: auto-assign & daftar agent baca dari tenant pool,
		// sedangkan demo-login sebelumnya hanya menulis ke master → agent selalu kosong.
		// JWT memakai effective id dari tenant agar RBACGuard menemukan user.
		effectiveID := demoUserID
		if tpool, terr := a.TenantPool(r.Context(), demoCompanyID); terr == nil && tpool != nil {
			effectiveID = ensureDemoTenantUser(r.Context(), tpool, demoUserID, demoEmail, demoName, in.Role)
		}

		// Generate JWT access token
		ttl := 24 * time.Hour
		access, err := signDemoAccess(secret, effectiveID, demoCompanyID, roleID, in.Role, ttl)
		if err != nil {
			middleware.WriteErr(w, 500, "TOKEN_ERROR", "Failed to generate token")
			return
		}

		middleware.WriteOK(w, map[string]any{
			"access_token": access,
			"token_type":   "Bearer",
			"user": map[string]string{
				"id":    effectiveID,
				"email": demoEmail,
				"name":  demoName,
				"role":  in.Role,
			},
			"company_id": demoCompanyID,
		})
	}
}

func signDemoAccess(secret, userID, companyID, roleID, role string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"user_id":    userID,
		"company_id": companyID,
		"role_id":    roleID,
		"role":       role,
		"iat":        now.Unix(),
		"exp":        now.Add(ttl).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
