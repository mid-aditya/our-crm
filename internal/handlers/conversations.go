package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
)

// GET /api/v1/conversations?status=, POST /api/v1/conversations
func Conversations(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		status := r.URL.Query().Get("status")
		limit, offset := middleware.Page(r)
		q := `select id, channel_id, contact_id, assigned_agent_id, status, last_message_at, awaiting_since, created_at from conversations`
		var out []map[string]any
		var total int
		if status != "" {
			_ = pool.QueryRow(r.Context(), `select count(*) from conversations where status=$1`, status).Scan(&total)
			out = listConvs(r, q+` where status=$1 order by last_message_at desc nulls last limit $2 offset $3`, status, limit, offset)
		} else {
			_ = pool.QueryRow(r.Context(), `select count(*) from conversations`).Scan(&total)
			out = listConvs(r, q+` order by last_message_at desc nulls last limit $1 offset $2`, limit, offset)
		}
		middleware.WritePage(w, 200, out, middleware.PageMeta(limit, offset, total))
	case "POST":
		var in struct {
			ChannelID string `json:"channel_id"`
			ContactID string `json:"contact_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ChannelID == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "channel_id wajib")
			return
		}
		c := middleware.Claims(r)
		var id string
		var contactID, agentID *string
		if in.ContactID != "" {
			contactID = &in.ContactID
		}
		if c != nil {
			agentID = &c.UserID
		}
		err := pool.QueryRow(r.Context(), `insert into conversations (channel_id, contact_id, assigned_agent_id) values ($1,$2,$3) returning id`, in.ChannelID, contactID, agentID).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func listConvs(r *http.Request, q string, args ...any) []map[string]any {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, status string
		var chID, contactID, agentID *string
		var lastMsg, awaiting, created *time.Time
		_ = rows.Scan(&id, &chID, &contactID, &agentID, &status, &lastMsg, &awaiting, &created)
		out = append(out, map[string]any{
			"id": id, "channel_id": chID, "contact_id": contactID, "assigned_agent_id": agentID,
			"status": status, "last_message_at": lastMsg, "awaiting_since": awaiting, "created_at": created,
		})
	}
	return out
}

// ConversationMessages GET /api/v1/conversations/{id}/messages
// ConversationReply POST /api/v1/conversations/{id}/reply {body}
// ConversationPatch PATCH /api/v1/conversations/{id} {status?, assigned_agent_id?}
// Webhook POST /api/v1/wa-webhook/{channelID} {from, text, external_id?} + header X-Company-Id
func convID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/conversations/"
	i := indexOf(p, marker)
	if i < 0 {
		return ""
	}
	rest := p[i+len(marker):]
	for j, ch := range rest {
		if ch == '/' {
			return rest[:j]
		}
	}
	return rest
}

func ConversationMessages(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := convID(r)
	limit, offset := middleware.Page(r)
	rows, err := pool.Query(r.Context(), `select id, direction, sender_id, body, media_url, status, external_id, created_at from conversation_messages where conversation_id=$1 order by created_at limit $2 offset $3`, id, limit, offset)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var m struct {
			ID, Direction, Body, Status string
			SenderID, MediaURL, ExtID   *string
			Created                     time.Time
		}
		_ = rows.Scan(&m.ID, &m.Direction, &m.SenderID, &m.Body, &m.MediaURL, &m.Status, &m.ExtID, &m.Created)
		out = append(out, map[string]any{"id": m.ID, "direction": m.Direction, "sender_id": m.SenderID, "body": m.Body, "media_url": m.MediaURL, "status": m.Status, "external_id": m.ExtID, "created_at": m.Created})
	}
	middleware.WriteJSON(w, 200, out)
}

func ConversationReply(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	pool := middleware.Tenant(r)
	id := convID(r)
	var in struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Body == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "body wajib")
		return
	}
	var conv struct {
		ChannelID, ContactID *string
		Assigned             *string
	}
	var channelID string
	var contactID, assigned *string
	if err := pool.QueryRow(r.Context(), `select channel_id, contact_id, assigned_agent_id from conversations where id=$1`, id).Scan(&channelID, &contactID, &assigned); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Percakapan tidak ada")
		return
	}
	conv.ChannelID = &channelID
	conv.ContactID = contactID
	conv.Assigned = assigned
	var chType string
	var chCfg map[string]string
	if err := pool.QueryRow(r.Context(), `select type, config from whatsapp_channels where id=$1`, channelID).Scan(&chType, &chCfg); err != nil {
		middleware.WriteErr(w, 400, "NO_CHANNEL", "Channel tidak ditemukan")
		return
	}
	var to *string
	if contactID != nil {
		var phone *string
		_ = pool.QueryRow(r.Context(), `select phone from contacts where id=$1`, *contactID).Scan(&phone)
		to = phone
	}
	c := middleware.Claims(r)
	var senderID *string
	if c != nil {
		senderID = &c.UserID
	}
	var msgID string
	if err := pool.QueryRow(r.Context(), `insert into conversation_messages (conversation_id, direction, sender_id, body) values ($1,'outbound',$2,$3) returning id`, id, senderID, in.Body).Scan(&msgID); err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	result := struct {
		OK         bool
		ExternalID string
		Err        string
	}{}
	if to != nil && *to != "" {
		res := a.Sender.Send(chType, chCfg, *to, in.Body)
		result.OK, result.ExternalID, result.Err = res.OK, res.ExternalID, res.Err
	} else {
		result.Err = "Kontak tidak punya nomor HP"
	}
	status := "failed"
	if result.OK {
		status = "sent"
	}
	var extID *string
	if result.ExternalID != "" {
		extID = &result.ExternalID
	}
	_, _ = pool.Exec(r.Context(), `update conversation_messages set status=$1, external_id=$2 where id=$3`, status, extID, msgID)
	_, _ = pool.Exec(r.Context(), `update conversations set last_message_at=now(), awaiting_since=null, assigned_agent_id=coalesce(assigned_agent_id,$2), updated_at=now() where id=$1`, id, senderID)
	if !result.OK {
		middleware.WriteErr(w, 502, "WA_SEND_FAILED", firstNonEmpty(result.Err, "Gagal kirim"))
		return
	}
	middleware.WriteJSON(w, 201, map[string]any{"id": msgID, "status": "sent", "external_id": extID})
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func ConversationPatch(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := convID(r)
	var in struct {
		Status          *string `json:"status"`
		AssignedAgentID *string `json:"assigned_agent_id"`
		HasAssignee     bool
	}
	// deteksi null eksplisit via map
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if s, ok := raw["status"].(string); ok {
		if s != "open" && s != "pending" && s != "resolved" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status tidak valid")
			return
		}
		in.Status = &s
	}
	if v, ok := raw["assigned_agent_id"]; ok {
		in.HasAssignee = true
		if s, ok := v.(string); ok && s != "" {
			in.AssignedAgentID = &s
		}
	}
	var outID string
	if in.Status != nil && in.HasAssignee {
		err := pool.QueryRow(r.Context(), `update conversations set status=$1, assigned_agent_id=$2, updated_at=now() where id=$3 returning id`, *in.Status, in.AssignedAgentID, id).Scan(&outID)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Percakapan tidak ada")
			return
		}
	} else if in.Status != nil {
		err := pool.QueryRow(r.Context(), `update conversations set status=$1, updated_at=now() where id=$2 returning id`, *in.Status, id).Scan(&outID)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Percakapan tidak ada")
			return
		}
	} else if in.HasAssignee {
		err := pool.QueryRow(r.Context(), `update conversations set assigned_agent_id=$1, updated_at=now() where id=$2 returning id`, in.AssignedAgentID, id).Scan(&outID)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Percakapan tidak ada")
			return
		}
	} else {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status/assigned_agent_id tidak valid")
		return
	}
	middleware.WriteJSON(w, 200, map[string]string{"id": outID})
}

// Webhook inbound — tanpa JWT, pakai header X-Company-Id.
func Webhook(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	// /api/v1/wa-webhook/{channelID}
	p := r.URL.Path
	idx := -1
	for i := 0; i+12 < len(p); i++ {
		if p[i:i+12] == "/wa-webhook/" {
			idx = i + 12
			break
		}
	}
	if idx < 0 {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Channel tidak ada")
		return
	}
	channelID := p[idx:]
	var in struct {
		From       string `json:"from"`
		Text       string `json:"text"`
		ExternalID string `json:"external_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.From == "" || in.Text == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "from & text wajib")
		return
	}
	companyID := r.Header.Get("X-Company-Id")
	if companyID == "" {
		middleware.WriteErr(w, 401, "NO_COMPANY", "X-Company-Id wajib")
		return
	}
	pool, err := a.TenantPool(r.Context(), companyID)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	var chName string
	if err := pool.QueryRow(r.Context(), `select name from whatsapp_channels where id=$1`, channelID).Scan(&chName); err != nil {
		middleware.WriteErr(w, 404, "NO_CHANNEL", "Channel tidak ada")
		return
	}
	var contactID string
	_ = pool.QueryRow(r.Context(), `select id from contacts where phone=$1 limit 1`, in.From).Scan(&contactID)
	if contactID == "" {
		var fullName = in.From
		err := pool.QueryRow(r.Context(), `insert into contacts (full_name, phone, source) values ($1,$2,$3) returning id`, fullName, in.From, "wa:"+chName).Scan(&contactID)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
	}
	var convID string
	err = pool.QueryRow(r.Context(), `select id from conversations where channel_id=$1 and contact_id=$2 and status='open' limit 1`, channelID, contactID).Scan(&convID)
	now := time.Now()
	if err != nil {
		_ = pool.QueryRow(r.Context(), `insert into conversations (channel_id, contact_id, last_message_at, awaiting_since) values ($1,$2,$3,$3) returning id`, channelID, contactID, now).Scan(&convID)
	} else {
		_, _ = pool.Exec(r.Context(), `update conversations set last_message_at=$1, awaiting_since=coalesce(awaiting_since,$1), updated_at=$1 where id=$2`, now, convID)
	}
	var extID *string
	if in.ExternalID != "" {
		extID = &in.ExternalID
	}
	_, _ = pool.Exec(r.Context(), `insert into conversation_messages (conversation_id, direction, body, external_id, status) values ($1,'inbound',$2,$3,'delivered')`, convID, in.Text, extID)
	middleware.WriteJSON(w, 200, map[string]string{"conversation_id": convID})
}
