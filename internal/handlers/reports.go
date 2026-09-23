package handlers

import (
	"net/http"

	"crm-backend/internal/middleware"
)

// GET /api/v1/reports/overview
func ReportOverview(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	var openConv, openTickets, deals, contactsCount, agents int
	_ = pool.QueryRow(r.Context(), `select count(*) from conversations where status='open'`).Scan(&openConv)
	_ = pool.QueryRow(r.Context(), `select count(*) from tickets where status in ('open','pending')`).Scan(&openTickets)
	_ = pool.QueryRow(r.Context(), `select count(*) from deals where deleted_at is null`).Scan(&deals)
	_ = pool.QueryRow(r.Context(), `select count(*) from contacts where deleted_at is null`).Scan(&contactsCount)
	_ = pool.QueryRow(r.Context(), `select count(*) from users`).Scan(&agents)
	middleware.WriteJSON(w, 200, map[string]int{
		"open_conversations": openConv, "open_tickets": openTickets, "deals": deals,
		"contacts": contactsCount, "agents": agents,
	})
}

// GET /api/v1/reports/conversations — volume per hari 30 hari
func ReportConversations(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select to_char(created_at,'YYYY-MM-DD') as day, direction, count(*) from conversation_messages where created_at > now() - interval '30 days' group by 1,2 order by 1`)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var day, dir string
		var n int
		_ = rows.Scan(&day, &dir, &n)
		out = append(out, map[string]any{"day": day, "direction": dir, "n": n})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/reports/funnel — deals, tickets, campaigns
func ReportFunnel(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	deals := agg(r, `select status, count(*) from deals where deleted_at is null group by status`)
	tickets := agg(r, `select status, count(*) from tickets group by status`)
	crows, _ := pool.Query(r.Context(), `select id, name, status, stats from campaigns order by created_at desc limit 50`)
	camps := []map[string]any{}
	if crows != nil {
		defer crows.Close()
		for crows.Next() {
			var id, name, status string
			var stats map[string]any
			_ = crows.Scan(&id, &name, &status, &stats)
			camps = append(camps, map[string]any{"id": id, "name": name, "status": status, "stats": stats})
		}
	}
	middleware.WriteJSON(w, 200, map[string]any{"deals": deals, "tickets": tickets, "campaigns": camps})
}

func agg(r *http.Request, q string) []map[string]any {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), q)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var s string
		var n int
		_ = rows.Scan(&s, &n)
		out = append(out, map[string]any{"status": s, "n": n})
	}
	return out
}

// GET /api/v1/reports/agents — performa per agent
func ReportAgents(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	arows, err := pool.Query(r.Context(), `select id, full_name, email from users`)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	defer arows.Close()
	out := []map[string]any{}
	for arows.Next() {
		var id, name, email string
		_ = arows.Scan(&id, &name, &email)
		var replies, resolved, won, active int
		_ = pool.QueryRow(r.Context(), `select count(*) from conversation_messages where sender_id=$1 and direction='outbound'`, id).Scan(&replies)
		_ = pool.QueryRow(r.Context(), `select count(*) from tickets where assignee_id=$1 and status in ('resolved','closed')`, id).Scan(&resolved)
		_ = pool.QueryRow(r.Context(), `select count(*) from deals where owner_user_id=$1 and status='won' and deleted_at is null`, id).Scan(&won)
		_ = pool.QueryRow(r.Context(), `select count(*) from conversations where assigned_agent_id=$1 and status != 'resolved'`, id).Scan(&active)
		out = append(out, map[string]any{"id": id, "name": name, "email": email, "replies": replies, "tickets_resolved": resolved, "deals_won": won, "active_conversations": active})
	}
	middleware.WriteJSON(w, 200, out)
}
