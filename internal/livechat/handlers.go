package livechat

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"crm-backend/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Helper to extract session ID from URL path
func sessionIDFromPath(r *http.Request) string {
	// URL: /api/v1/livechat/sessions/{id}
	path := r.URL.Path
	prefix := "/api/v1/livechat/sessions/"
	idx := 0
	for i := 0; i+len(prefix) <= len(path); i++ {
		if path[i:i+len(prefix)] == prefix {
			idx = i + len(prefix)
			break
		}
	}
	if idx == 0 {
		return ""
	}
	rest := path[idx:]
	for i, ch := range rest {
		if ch == '/' {
			return rest[:i]
		}
	}
	return rest
}

// QueueHandler GET /api/livechat/queue - list waiting sessions for a company
func QueueHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	limit, offset := middleware.Page(r)
	var total int
	_ = pool.QueryRow(r.Context(), `select count(*) from livechat_sessions where company_id=$1 and status='waiting'`, companyID).Scan(&total)

	rows, err := pool.Query(r.Context(), `
		select id, company_id, visitor_id, visitor_name, visitor_email, assigned_agent_id,
			   status, last_message, last_message_at, waiting_since, resolved_at, created_at, updated_at
		from livechat_sessions
		where company_id=$1 and status='waiting'
		order by waiting_since asc
		limit $2 offset $3`, companyID, limit, offset)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil queue")
		return
	}
	defer rows.Close()

	sessions := []map[string]interface{}{}
	for rows.Next() {
		var s Session
		rows.Scan(&s.ID, &s.CompanyID, &s.VisitorID, &s.VisitorName, &s.VisitorEmail,
			&s.AssignedAgentID, &s.Status, &s.LastMessage, &s.LastMessageAt,
			&s.WaitingSince, &s.ResolvedAt, &s.CreatedAt, &s.UpdatedAt)
		sessions = append(sessions, map[string]interface{}{
			"id": s.ID, "company_id": s.CompanyID, "visitor_id": s.VisitorID,
			"visitor_name": s.VisitorName, "visitor_email": s.VisitorEmail,
			"assigned_agent_id": s.AssignedAgentID, "status": s.Status,
			"last_message": s.LastMessage, "last_message_at": s.LastMessageAt,
			"waiting_since": s.WaitingSince, "resolved_at": s.ResolvedAt,
			"created_at": s.CreatedAt, "updated_at": s.UpdatedAt,
		})
	}
	middleware.WritePage(w, 200, sessions, middleware.PageMeta(limit, offset, total))
}

// SessionHandler GET /api/livechat/sessions/{id}
func SessionHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	var s Session
	err := pool.QueryRow(r.Context(), `
		select id, company_id, visitor_id, visitor_name, visitor_email, assigned_agent_id,
			   status, last_message, last_message_at, waiting_since, resolved_at, created_at, updated_at
		from livechat_sessions where id=$1`, id).Scan(
		&s.ID, &s.CompanyID, &s.VisitorID, &s.VisitorName, &s.VisitorEmail,
		&s.AssignedAgentID, &s.Status, &s.LastMessage, &s.LastMessageAt,
		&s.WaitingSince, &s.ResolvedAt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Sesi tidak ditemukan")
		return
	}
	middleware.WriteJSON(w, 200, map[string]interface{}{
		"id": s.ID, "company_id": s.CompanyID, "visitor_id": s.VisitorID,
		"visitor_name": s.VisitorName, "visitor_email": s.VisitorEmail,
		"assigned_agent_id": s.AssignedAgentID, "status": s.Status,
		"last_message": s.LastMessage, "last_message_at": s.LastMessageAt,
		"waiting_since": s.WaitingSince, "resolved_at": s.ResolvedAt,
		"created_at": s.CreatedAt, "updated_at": s.UpdatedAt,
	})
}

// MessagesHandler GET /api/livechat/sessions/{id}/messages
func MessagesHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	limit, offset := middleware.Page(r)
	var total int
	_ = pool.QueryRow(r.Context(), `select count(*) from livechat_messages where session_id=$1`, id).Scan(&total)

	rows, err := pool.Query(r.Context(), `
		select id, session_id, direction, sender_id, sender_name, body, created_at
		from livechat_messages
		where session_id=$1
		order by created_at asc
		limit $2 offset $3`, id, limit, offset)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil pesan")
		return
	}
	defer rows.Close()

	messages := []map[string]interface{}{}
	for rows.Next() {
		var m Message
		rows.Scan(&m.ID, &m.SessionID, &m.Direction, &m.SenderID, &m.SenderName, &m.Body, &m.CreatedAt)
		messages = append(messages, map[string]interface{}{
			"id": m.ID, "session_id": m.SessionID, "direction": m.Direction,
			"sender_id": m.SenderID, "sender_name": m.SenderName,
			"body": m.Body, "created_at": m.CreatedAt,
		})
	}
	middleware.WritePage(w, 200, messages, middleware.PageMeta(limit, offset, total))
}

// SendMessageHandler POST /api/livechat/sessions/{id}/messages
func SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID
	claims := middleware.Claims(r)
	agentID := claims.UserID
	agentName := ""

	// Get agent name
	_ = pool.QueryRow(r.Context(), `select full_name from users where id=$1`, agentID).Scan(&agentName)

	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	var in struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Body == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "body wajib")
		return
	}

	// Insert message
	var msgID string
	err := pool.QueryRow(r.Context(), `
		insert into livechat_messages (session_id, direction, sender_id, sender_name, body)
		values ($1, 'outbound', $2, $3, $4)
		returning id`, id, agentID, agentName, in.Body).Scan(&msgID)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan pesan")
		return
	}

	// Update session
	_, _ = pool.Exec(r.Context(), `
		update livechat_sessions set last_message=$1, last_message_at=now(), updated_at=now()
		where id=$2`, in.Body, id)

	// Send to visitor via WebSocket
	SendAgentMessageToVisitor(id, in.Body, agentID, agentName)

	// Notify SSE clients
	TheSSEHub.BroadcastNewMessage(companyID, id, Message{
		ID:         msgID,
		SessionID:  id,
		Direction:  "outbound",
		SenderID:   &agentID,
		SenderName: &agentName,
		Body:       in.Body,
		CreatedAt:  time.Now(),
	})

	middleware.WriteJSON(w, 201, map[string]string{"id": msgID})
}

// AssignHandler POST /api/livechat/sessions/{id}/assign
func AssignHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	claims := middleware.Claims(r)
	companyID := claims.CompanyID

	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	var in struct {
		AgentID *string `json:"agent_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}

	var agentID string
	var agentName string

	// Get distribution settings
	var dist Distribution
	err := pool.QueryRow(r.Context(), `select mode, round_robin_index from livechat_distribution where company_id=$1`, companyID).Scan(&dist.Mode, &dist.RoundRobinIndex)
	if err != nil {
		dist.Mode = "manual" // Default to manual if no distribution set
	}

	if dist.Mode == "auto" && in.AgentID == nil {
		// Auto-assign using round-robin with least active chats
		agentID, agentName, err = autoAssignAgent(r.Context(), pool, companyID, dist.RoundRobinIndex)
		if err != nil {
			middleware.WriteErr(w, 500, "AUTO_ASSIGN_ERROR", "Tidak ada agent tersedia")
			return
		}
		// Update round-robin index
		_, _ = pool.Exec(r.Context(), `
			update livechat_distribution set round_robin_index=$1, updated_at=now()
			where company_id=$2`, dist.RoundRobinIndex+1, companyID)
	} else {
		if in.AgentID == nil || *in.AgentID == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "agent_id wajib")
			return
		}
		agentID = *in.AgentID
		_ = pool.QueryRow(r.Context(), `select full_name from users where id=$1`, agentID).Scan(&agentName)
	}

	// Update session
	_, err = pool.Exec(r.Context(), `
		update livechat_sessions set assigned_agent_id=$1, status='assigned', updated_at=now()
		where id=$2`, agentID, id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal assign sesi")
		return
	}

	// Notify visitor via WebSocket
	NotifySessionAssigned(id, agentID, agentName)

	// Notify agents via SSE
	TheSSEHub.BroadcastSessionAssigned(companyID, id, agentID)

	// Broadcast queue update
	broadcastQueueUpdate(r.Context(), pool, companyID)

	middleware.WriteJSON(w, 200, map[string]interface{}{
		"id":         id,
		"agent_id":   agentID,
		"agent_name": agentName,
	})
}

// autoAssignAgent finds the agent with the fewest active chats (round-robin)
func autoAssignAgent(ctx context.Context, pool *pgxpool.Pool, companyID string, startIndex int) (string, string, error) {
	// Get all agents with their active chat counts
	rows, err := pool.Query(ctx, `
		select u.id, u.full_name,
			   (select count(*) from livechat_sessions ls where ls.assigned_agent_id = u.id and ls.status = 'assigned') as active_chats
		from users u
		join user_roles ur on ur.user_id = u.id
		join roles r on r.id = ur.role_id
		join role_permissions rp on rp.role_id = r.id
		join permissions p on p.id = rp.permission_id
		where u.company_id = $1 and u.status = 'active' and p.key = 'livechat.reply'
		order by active_chats asc, u.id asc
	`, companyID)
	if err != nil {
		return "", "", err
	}
	defer rows.Close()

	var agents []struct {
		ID          string
		FullName    string
		ActiveChats int
	}
	for rows.Next() {
		var a struct {
			ID          string
			FullName    string
			ActiveChats int
		}
		rows.Scan(&a.ID, &a.FullName, &a.ActiveChats)
		agents = append(agents, a)
	}

	if len(agents) == 0 {
		return "", "", fmt.Errorf("no agents available")
	}

	// Round-robin from startIndex
	idx := startIndex % len(agents)
	return agents[idx].ID, agents[idx].FullName, nil
}

// SSEHandler GET /api/livechat/sse - SSE endpoint for agent dashboard
func SSEHandler(w http.ResponseWriter, r *http.Request) {
	claims := middleware.Claims(r)
	companyID := claims.CompanyID

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		middleware.WriteErr(w, 500, "SSE_NOT_SUPPORTED", "SSE not supported")
		return
	}

	ch := TheSSEHub.AddClient(companyID)
	defer TheSSEHub.RemoveClient(companyID, ch)

	// Send initial connection event
	fmt.Fprintf(w, "data: {\"type\":\"connected\",\"company_id\":\"%s\"}\n\n", companyID)
	flusher.Flush()

	// Keep-alive ticker
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case data, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}

// AgentsHandler GET /api/livechat/agents - list online agents for company
func AgentsHandler(w http.ResponseWriter, r *http.Request) {
	companyID := middleware.Claims(r).CompanyID

	// Get agents from DB
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `
		select u.id, u.full_name, u.email
		from users u
		join user_roles ur on ur.user_id = u.id
		join roles r on r.id = ur.role_id
		join role_permissions rp on rp.role_id = r.id
		join permissions p on p.id = rp.permission_id
		where u.company_id = $1 and u.status = 'active' and p.key = 'livechat.reply'
	`, companyID)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil agents")
		return
	}
	defer rows.Close()

	agents := []map[string]interface{}{}
	for rows.Next() {
		var id, fullName, email string
		rows.Scan(&id, &fullName, &email)
		online := TheHub.GetOnlineAgentCount(companyID) > 0 // Simplified: at least one agent online
		agents = append(agents, map[string]interface{}{
			"id":        id,
			"full_name": fullName,
			"email":     email,
			"online":    online,
		})
	}

	middleware.WriteJSON(w, 200, agents)
}

// GetDistributionHandler GET /api/livechat/distribution
func GetDistributionHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	var dist Distribution
	err := pool.QueryRow(r.Context(), `
		select id, company_id, mode, round_robin_index, updated_at
		from livechat_distribution where company_id=$1`, companyID).Scan(
		&dist.ID, &dist.CompanyID, &dist.Mode, &dist.RoundRobinIndex, &dist.UpdatedAt)
	if err != nil {
		// Return default if not set
		middleware.WriteJSON(w, 200, map[string]interface{}{
			"company_id":        companyID,
			"mode":              "manual",
			"round_robin_index": 0,
		})
		return
	}
	middleware.WriteJSON(w, 200, dist)
}

// SetDistributionHandler POST /api/livechat/distribution
func SetDistributionHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	companyID := middleware.Claims(r).CompanyID

	var in struct {
		Mode string `json:"mode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || (in.Mode != "manual" && in.Mode != "auto") {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "mode harus 'manual' atau 'auto'")
		return
	}

	_, err := pool.Exec(r.Context(), `
		insert into livechat_distribution (company_id, mode)
		values ($1, $2)
		on conflict (company_id) do update set mode=$2, updated_at=now()
	`, companyID, in.Mode)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan pengaturan")
		return
	}

	middleware.WriteJSON(w, 200, map[string]string{"status": "ok"})
}

// broadcastQueueUpdate sends queue update to all agents
func broadcastQueueUpdate(ctx context.Context, pool *pgxpool.Pool, companyID string) {
	rows, err := pool.Query(ctx, `
		select id, company_id, visitor_id, visitor_name, visitor_email, assigned_agent_id,
			   status, last_message, last_message_at, waiting_since, resolved_at, created_at, updated_at
		from livechat_sessions
		where company_id=$1 and status='waiting'
		order by waiting_since asc`, companyID)
	if err != nil {
		return
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		rows.Scan(&s.ID, &s.CompanyID, &s.VisitorID, &s.VisitorName, &s.VisitorEmail,
			&s.AssignedAgentID, &s.Status, &s.LastMessage, &s.LastMessageAt,
			&s.WaitingSince, &s.ResolvedAt, &s.CreatedAt, &s.UpdatedAt)
		sessions = append(sessions, s)
	}
	if sessions == nil {
		sessions = []Session{}
	}
	TheSSEHub.BroadcastQueueUpdate(companyID, sessions)
}

// SessionFromPool fetches a session from the database using a pool
func SessionFromPool(ctx context.Context, pool *pgxpool.Pool, sessionID string) (*Session, error) {
	var s Session
	err := pool.QueryRow(ctx, `
		select id, company_id, visitor_id, visitor_name, visitor_email, assigned_agent_id,
			   status, last_message, last_message_at, waiting_since, resolved_at, created_at, updated_at
		from livechat_sessions where id=$1`, sessionID).Scan(
		&s.ID, &s.CompanyID, &s.VisitorID, &s.VisitorName, &s.VisitorEmail,
		&s.AssignedAgentID, &s.Status, &s.LastMessage, &s.LastMessageAt,
		&s.WaitingSince, &s.ResolvedAt, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// SaveVisitorMessage saves a visitor message to the database
func SaveVisitorMessage(ctx context.Context, pool *pgxpool.Pool, sessionID string, body string, senderName string) (string, error) {
	var msgID string
	err := pool.QueryRow(ctx, `
		insert into livechat_messages (session_id, direction, sender_name, body)
		values ($1, 'inbound', $2, $3)
		returning id`, sessionID, senderName, body).Scan(&msgID)
	if err != nil {
		return "", err
	}
	// Update session
	_, _ = pool.Exec(ctx, `
		update livechat_sessions set last_message=$1, last_message_at=now(), updated_at=now()
		where id=$2`, body, sessionID)
	return msgID, nil
}

// CreateSessionHandler POST /api/v1/livechat/sessions
// Public endpoint for visitors (no auth needed, uses query param for company_id)
func CreateSessionHandler(w http.ResponseWriter, r *http.Request) {
	companyID := r.URL.Query().Get("company_id")
	if companyID == "" {
		middleware.WriteErr(w, 400, "MISSING_COMPANY", "company_id query param required")
		return
	}

	// Get tenant pool (this requires proper tenant resolution)
	// For public visitor endpoint, we need a different approach
	// ponytail: this needs a tenant pool resolver that works with query param
	// Using middleware.Tenant with a workaround
	pool, err := getTenantPool(r, companyID)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Tidak dapat terhubung ke database")
		return
	}

	var in struct {
		VisitorID    string `json:"visitor_id"`
		VisitorName  string `json:"visitor_name"`
		VisitorEmail string `json:"visitor_email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "INVALID_BODY", "Body tidak valid")
		return
	}
	if in.VisitorID == "" {
		middleware.WriteErr(w, 400, "MISSING_VISITOR_ID", "visitor_id wajib")
		return
	}

	var sessionID string
	err = pool.QueryRow(r.Context(), `
		insert into livechat_sessions (company_id, visitor_id, visitor_name, visitor_email, status, waiting_since)
		values ($1, $2, $3, $4, 'waiting', now())
		returning id
	`, companyID, in.VisitorID, nullString(in.VisitorName), nullString(in.VisitorEmail)).Scan(&sessionID)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal membuat sesi")
		return
	}

	// Broadcast queue update
	go broadcastQueueUpdate(r.Context(), pool, companyID)

	middleware.WriteJSON(w, 201, map[string]interface{}{
		"id":         sessionID,
		"company_id": companyID,
		"visitor_id": in.VisitorID,
		"status":     "waiting",
		"ws_url":     fmt.Sprintf("ws://localhost:%s/ws/livechat?session_id=%s&company_id=%s&role=visitor", "3001", sessionID, companyID),
	})
}

func nullString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// getTenantPool resolves a tenant pool from company_id
// ponytail: this is a simplified version — in production, use proper tenant resolution
func getTenantPool(r *http.Request, companyID string) (*pgxpool.Pool, error) {
	// Use the same approach as other handlers — get from middleware
	app := middleware.AppFrom(r)
	return app.TenantPool(r.Context(), companyID)
}

// TakeHandler POST /api/v1/livechat/sessions/{id}/take
// Agent takes a session (auto-assigns to themselves)
func TakeHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	claims := middleware.Claims(r)
	agentID := claims.UserID
	companyID := claims.CompanyID
	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	var agentName string
	_ = pool.QueryRow(r.Context(), `select full_name from users where id=$1`, agentID).Scan(&agentName)

	_, err := pool.Exec(r.Context(), `
		update livechat_sessions
		set assigned_agent_id=$1, status='assigned', updated_at=now()
		where id=$2`, agentID, id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil sesi")
		return
	}

	NotifySessionAssigned(id, agentID, agentName)
	TheSSEHub.BroadcastSessionAssigned(companyID, id, agentID)
	go broadcastQueueUpdate(r.Context(), pool, companyID)

	middleware.WriteJSON(w, 200, map[string]interface{}{
		"id":                id,
		"agent_id":          agentID,
		"agent_name":        agentName,
		"assigned_agent_id": agentID,
		"status":            "assigned",
	})
}

// ResolveHandler POST /api/v1/livechat/sessions/{id}/resolve
func ResolveHandler(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	claims := middleware.Claims(r)
	companyID := claims.CompanyID
	id := sessionIDFromPath(r)
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID sesi tidak valid")
		return
	}

	_, err := pool.Exec(r.Context(), `
		update livechat_sessions
		set status='resolved', resolved_at=now(), updated_at=now()
		where id=$1`, id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyelesaikan sesi")
		return
	}

	go broadcastQueueUpdate(r.Context(), pool, companyID)

	middleware.WriteJSON(w, 200, map[string]interface{}{
		"id":     id,
		"status": "resolved",
	})
}
