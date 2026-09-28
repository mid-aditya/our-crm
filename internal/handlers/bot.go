package handlers

import (
	"encoding/json"
	"net/http"

	"crm-backend/internal/middleware"
)

// BotQA CRUD — pertanyaan & jawaban custom sebelum didistribusi ke agent.
// Mendukung pertanyaan beranak via parent_id (jawaban lanjutan / cabang).
// GET terbuka untuk login; tulis butuh settings.manage_roles.
type botQA struct {
	ID       string  `json:"id"`
	ParentID *string `json:"parent_id"`
	Keywords string  `json:"keywords"`
	Question string  `json:"question"`
	Answer   string  `json:"answer"`
	Position int     `json:"position"`
	Active   bool    `json:"active"`
	Escalate bool    `json:"escalate"`
	Children int     `json:"children"`
}

// GET /api/v1/bot-qa, POST /api/v1/bot-qa
func BotQAList(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			ParentID *string `json:"parent_id"`
			Keywords string  `json:"keywords"`
			Question string  `json:"question"`
			Answer   string  `json:"answer"`
			Position int     `json:"position"`
			Escalate bool    `json:"escalate"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Answer == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "answer wajib")
			return
		}
		if in.ParentID != nil && *in.ParentID == "" {
			in.ParentID = nil
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into bot_qa (parent_id, keywords, question, answer, position, escalate) values ($1,$2,$3,$4,$5,$6) returning id`, in.ParentID, in.Keywords, in.Question, in.Answer, in.Position, in.Escalate).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select q.id, q.parent_id, q.keywords, q.question, q.answer, q.position, q.active, q.escalate, (select count(*) from bot_qa c where c.parent_id=q.id) from bot_qa q order by q.parent_id nulls first, q.position, q.created_at`)
	if err != nil {
		middleware.WriteJSON(w, 200, []botQA{})
		return
	}
	defer rows.Close()
	out := []botQA{}
	for rows.Next() {
		var b botQA
		_ = rows.Scan(&b.ID, &b.ParentID, &b.Keywords, &b.Question, &b.Answer, &b.Position, &b.Active, &b.Escalate, &b.Children)
		out = append(out, b)
	}
	middleware.WriteJSON(w, 200, out)
}

// PATCH /api/v1/bot-qa/{id}, DELETE /api/v1/bot-qa/{id}
func BotQADetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := kanbanID(r, "/bot-qa/")
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from bot_qa where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["keywords"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update bot_qa set keywords=$1, updated_at=now() where id=$2`, v, id)
	}
	if v, ok := raw["question"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update bot_qa set question=$1, updated_at=now() where id=$2`, v, id)
	}
	if v, ok := raw["answer"].(string); ok && v != "" {
		_, _ = pool.Exec(r.Context(), `update bot_qa set answer=$1, updated_at=now() where id=$2`, v, id)
	}
	if v, ok := raw["active"].(bool); ok {
		_, _ = pool.Exec(r.Context(), `update bot_qa set active=$1, updated_at=now() where id=$2`, v, id)
	}
	if v, ok := raw["parent_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" && s != id {
			_, _ = pool.Exec(r.Context(), `update bot_qa set parent_id=$1, updated_at=now() where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update bot_qa set parent_id=null, updated_at=now() where id=$1`, id)
		}
	}
	if v, ok := raw["escalate"].(bool); ok {
		_, _ = pool.Exec(r.Context(), `update bot_qa set escalate=$1, updated_at=now() where id=$2`, v, id)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}
