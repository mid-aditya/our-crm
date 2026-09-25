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
	permKeys := []string{"livechat.read", "livechat.reply", "livechat.assign", "channels.read"}
	if role == "admin" {
		permKeys = append(permKeys, "livechat.manage", "channels.manage")
	}
	permIDs := make([]string, 0, len(permKeys))
	for _, k := range permKeys {
		var pid string
		_ = tpool.QueryRow(ctx, `insert into permissions ("key", module) values ($1,'livechat') on conflict ("key") do update set "key"=excluded."key" returning id`, k).Scan(&pid)
		if pid == "" {
			_ = tpool.QueryRow(ctx, `select id from permissions where "key"=$1`, k).Scan(&pid)
		}
		if pid != "" {
			permIDs = append(permIDs, pid)
		}
	}
	roleName := map[string]string{"agent": "Agent", "admin": "Admin"}[role]
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
		})
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
	mux.Handle("GET /api/v1/roles", tenant("settings.manage_roles", handlers.Roles))
	mux.Handle("PUT /api/v1/roles/{id}/permissions", tenant("settings.manage_roles", handlers.Roles))

	// Livechat routes — agent endpoints require auth, visitor session creation is public
	mux.HandleFunc("GET /ws/livechat", livechat.WebSocketHandler)
	mux.HandleFunc("POST /api/v1/livechat/sessions", livechat.CreateSessionHandler) // public — visitor creates session
	mux.HandleFunc("GET /api/v1/livechat/sessions/{id}", livechat.SessionHandler)   // public — visitor/agent read session
	mux.HandleFunc("GET /api/v1/livechat/sessions/{id}/messages", livechat.MessagesHandler)
	mux.HandleFunc("POST /api/v1/livechat/sessions/{id}/messages", livechat.SendMessageHandler)

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
			Role string `json:"role"` // "agent" or "admin"
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			middleware.WriteErr(w, 400, "INVALID_REQUEST", "Invalid request body")
			return
		}
		if in.Role != "agent" && in.Role != "admin" {
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
