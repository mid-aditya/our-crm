package handlers

import (
	"encoding/json"
	"net/http"

	"crm-backend/internal/middleware"
)

// GET /api/v1/emails?status=, POST /api/v1/emails (simpan draft/terkirim)
// PATCH /api/v1/emails/{id} {status}, POST /api/v1/emails/{id}/send
func Emails(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		status := r.URL.Query().Get("status")
		limit, offset := middleware.Page(r)
		q := `select id, direction, from_addr, to_addr, subject, body, status, contact_id, created_at from emails`
		var rows []map[string]any
		var total int
		if status != "" {
			_ = pool.QueryRow(r.Context(), `select count(*) from emails where status=$1`, status).Scan(&total)
			rows = listEmails(r, q+` where status=$1 order by created_at desc limit $2 offset $3`, status, limit, offset)
		} else {
			_ = pool.QueryRow(r.Context(), `select count(*) from emails`).Scan(&total)
			rows = listEmails(r, q+` order by created_at desc limit $1 offset $2`, limit, offset)
		}
		middleware.WritePage(w, 200, rows, middleware.PageMeta(limit, offset, total))
	case "POST":
		var in struct {
			To        string `json:"to"`
			Subject   string `json:"subject"`
			Body      string `json:"body"`
			ContactID string `json:"contact_id"`
			Status    string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
			return
		}
		if in.Status == "" {
			in.Status = "draft"
		}
		if in.Status != "draft" && in.Status != "send" && in.Status != "inbox" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status tidak valid")
			return
		}
		var contactID *string
		if in.ContactID != "" {
			contactID = &in.ContactID
		}
		var id string
		err := pool.QueryRow(r.Context(), `insert into emails (direction, to_addr, subject, body, status, contact_id) values ('outbound',$1,$2,$3,$4,$5) returning id`, nullStr(in.To), nullStr(in.Subject), nullStr(in.Body), in.Status, contactID).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func listEmails(r *http.Request, q string, args ...any) []map[string]any {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, direction, status string
		var from, to, subject, body, contactID *string
		var created any
		_ = rows.Scan(&id, &direction, &from, &to, &subject, &body, &status, &contactID, &created)
		out = append(out, map[string]any{"id": id, "direction": direction, "from": from, "to": to, "subject": subject, "body": body, "status": status, "contact_id": contactID})
	}
	return out
}

func emailID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/emails/"
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

// PATCH /api/v1/emails/{id} {status} | POST /api/v1/emails/{id}/send
func EmailDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := emailID(r)
	if r.Method == "POST" {
		// /send — tandai terkirim (pengiriman SMTP asli menyusul)
		var outID string
		if err := pool.QueryRow(r.Context(), `update emails set status='send', updated_at=now() where id=$1 returning id`, id).Scan(&outID); err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Email tidak ada")
			return
		}
		middleware.WriteJSON(w, 200, map[string]string{"id": outID, "status": "send"})
		return
	}
	if r.Method == "PATCH" {
		var in struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || (in.Status != "draft" && in.Status != "send" && in.Status != "inbox") {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status tidak valid")
			return
		}
		var outID string
		if err := pool.QueryRow(r.Context(), `update emails set status=$1, updated_at=now() where id=$2 returning id`, in.Status, id).Scan(&outID); err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Email tidak ada")
			return
		}
		middleware.WriteJSON(w, 200, map[string]string{"id": outID})
		return
	}
	middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
}

// GET /api/v1/email-templates, POST /api/v1/email-templates, DELETE /api/v1/email-templates/{id}
func EmailTemplates(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		rows, err := pool.Query(r.Context(), `select id, name, subject, body from email_templates order by created_at desc limit 100`)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name string
			var subject, body *string
			_ = rows.Scan(&id, &name, &subject, &body)
			out = append(out, map[string]any{"id": id, "name": name, "subject": subject, "body": body})
		}
		middleware.WriteJSON(w, 200, out)
	case "POST":
		var in struct {
			Name    string `json:"name"`
			Subject string `json:"subject"`
			Body    string `json:"body"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into email_templates (name, subject, body) values ($1,$2,$3) returning id`, in.Name, nullStr(in.Subject), nullStr(in.Body)).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
	case "DELETE":
		id := emailID(r)
		// path /email-templates/{id} — ambil segmen terakhir
		p := r.URL.Path
		for i := len(p) - 1; i >= 0; i-- {
			if p[i] == '/' {
				id = p[i+1:]
				break
			}
		}
		_, _ = pool.Exec(r.Context(), `delete from email_templates where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}
