package main

import (
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
	"github.com/joho/godotenv"
)

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
	authed := func(h http.HandlerFunc) http.Handler { return middleware.Chain(h, auth, middleware.TenantResolver) }
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
	mux.HandleFunc("POST /api/v1/auth/refresh", handlers.Refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", handlers.Logout)
	mux.HandleFunc("POST /api/v1/auth/switch-company", handlers.SwitchCompany)

	mux.Handle("GET /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))
	mux.Handle("POST /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))

	mux.Handle("GET /api/v1/conversations", tenant("conversations.read", handlers.Conversations))
	mux.Handle("POST /api/v1/conversations", tenant("conversations.reply", handlers.Conversations))
	mux.Handle("GET /api/v1/conversations/{id}/messages", authed(handlers.ConversationMessages))
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

	// Agent-only — require JWT auth + tenant (uses authed middleware)
	mux.Handle("GET /api/v1/livechat/queue", authed(livechat.QueueHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/assign", authed(livechat.AssignHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/take", authed(livechat.TakeHandler))
	mux.Handle("POST /api/v1/livechat/sessions/{id}/resolve", authed(livechat.ResolveHandler))
	mux.Handle("GET /api/v1/livechat/sse", authed(livechat.SSEHandler))
	mux.Handle("GET /api/v1/livechat/agents", authed(livechat.AgentsHandler))
	mux.Handle("GET /api/v1/livechat/distribution", authed(livechat.GetDistributionHandler))
	mux.Handle("POST /api/v1/livechat/distribution", authed(livechat.SetDistributionHandler))

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
		if in.Role == "" {
			in.Role = "agent"
		}

		// Demo company UUID — must match the seeded company in migrations.
		demoCompanyID := "00000000-0000-0000-0000-000000000001"
		roleID := "00000000-0000-0000-0000-000000000002" // default role for demo

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
		demoUserID := "00000000-0000-0000-0000-000000000001"
		_, err = a.Master.Exec(r.Context(),
			`INSERT INTO users (id, company_id, email, full_name, role_id, status)
			 VALUES ($1, $2, $3, $4, $5, 'active')
			 ON CONFLICT (id) DO UPDATE SET status='active', role_id=excluded.role_id`,
			demoUserID, demoCompanyID, "demo@demo.com",
			map[string]string{"agent": "Demo Agent", "admin": "Demo Admin"}[in.Role],
			roleID)

		// Generate JWT access token
		ttl := 24 * time.Hour
		access, err := signDemoAccess(secret, demoUserID, demoCompanyID, roleID, ttl)
		if err != nil {
			middleware.WriteErr(w, 500, "TOKEN_ERROR", "Failed to generate token")
			return
		}

		middleware.WriteOK(w, map[string]any{
			"access_token": access,
			"token_type":   "Bearer",
			"user": map[string]string{
				"id":    demoUserID,
				"email": "demo@demo.com",
				"name":  map[string]string{"agent": "Demo Agent", "admin": "Demo Admin"}[in.Role],
				"role":  in.Role,
			},
			"company_id": demoCompanyID,
		})
	}
}

func signDemoAccess(secret, userID, companyID, roleID string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"user_id":    userID,
		"company_id": companyID,
		"role_id":    roleID,
		"iat":        now.Unix(),
		"exp":        now.Add(ttl).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
