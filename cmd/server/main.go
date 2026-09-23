package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"crm-backend/internal/app"
	"crm-backend/internal/config"
	"crm-backend/internal/handlers"
	"crm-backend/internal/middleware"

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
	tenant := func(perm string, h http.HandlerFunc) http.Handler {
		return middleware.Chain(h, auth, middleware.TenantResolver, func(n http.Handler) http.Handler {
			return middleware.RBACGuard(perm, n)
		})
	}
	authed := func(h http.HandlerFunc) http.Handler { return middleware.Chain(h, auth, middleware.TenantResolver) }

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) { middleware.WriteOK(w, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) { middleware.WriteOK(w, map[string]string{"status": "ok"}) })

	mux.HandleFunc("POST /api/v1/auth/login", handlers.Login)
	mux.HandleFunc("POST /api/v1/auth/refresh", handlers.Refresh)
	mux.HandleFunc("POST /api/v1/auth/logout", handlers.Logout)
	mux.HandleFunc("POST /api/v1/auth/switch-company", handlers.SwitchCompany)
	mux.HandleFunc("POST /api/v1/signup", handlers.Signup)

	mux.Handle("GET /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))
	mux.Handle("POST /api/v1/wa-channels", tenant("conversations.manage_channels", handlers.Channels))

	mux.Handle("GET /api/v1/conversations", tenant("conversations.read", handlers.Conversations))
	mux.Handle("POST /api/v1/conversations", tenant("conversations.reply", handlers.Conversations))
	mux.Handle("GET /api/v1/conversations/{id}/messages", authed(handlers.ConversationMessages))
	mux.Handle("POST /api/v1/conversations/{id}/reply", tenant("conversations.reply", handlers.ConversationReply))
	mux.Handle("PATCH /api/v1/conversations/{id}", tenant("conversations.assign", handlers.ConversationPatch))
	mux.HandleFunc("POST /api/v1/wa-webhook/{channelID}", handlers.Webhook)

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
	mux.HandleFunc("POST /api/v1/tickets/public", handlers.TicketPublic)

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

	// WithApp paling luar agar AppFrom tersedia di semua handler.
	wrapped := middleware.WithApp(a, middleware.CORS(cfg.CORSOrigins, mux))

	addr := ":" + strings.TrimSpace(cfg.Port)
	fmt.Println("listening on", addr)
	log.Fatal(http.ListenAndServe(addr, wrapped))
}
