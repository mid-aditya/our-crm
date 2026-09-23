package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
)

// GET /api/v1/tickets?status=, POST /api/v1/tickets
func Tickets(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		status := r.URL.Query().Get("status")
		q := `select id, number, subject, description, contact_id, assignee_id, priority, status, source, resolved_at, created_at from tickets`
		var rows []map[string]any
		if status != "" {
			rows = listTickets(r, q+` where status=$1 order by created_at desc limit 100`, status)
		} else {
			rows = listTickets(r, q+` order by created_at desc limit 100`)
		}
		middleware.WriteJSON(w, 200, rows)
	case "POST":
		var in struct {
			Subject     string `json:"subject"`
			Description string `json:"description"`
			ContactID   string `json:"contact_id"`
			Priority    string `json:"priority"`
			AssigneeID  string `json:"assignee_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Subject == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "subject wajib")
			return
		}
		if in.Priority == "" {
			in.Priority = "medium"
		}
		if in.Priority != "low" && in.Priority != "medium" && in.Priority != "urgent" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "priority tidak valid")
			return
		}
		number := fmt.Sprintf("T-%d-%d", time.Now().Year(), time.Now().Unix()%1000000)
		var contactID, assigneeID *string
		if in.ContactID != "" {
			contactID = &in.ContactID
		}
		if in.AssigneeID != "" {
			assigneeID = &in.AssigneeID
		}
		var id string
		err := pool.QueryRow(r.Context(), `insert into tickets (number, subject, description, contact_id, assignee_id, priority, source) values ($1,$2,$3,$4,$5,$6,'agent') returning id`, number, in.Subject, nullStr(in.Description), contactID, assigneeID, in.Priority).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id, "number": number})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func listTickets(r *http.Request, q string, args ...any) []map[string]any {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, number, subject, priority, status, source string
		var desc, contactID, assigneeID *string
		var resolved *time.Time
		var created time.Time
		_ = rows.Scan(&id, &number, &subject, &desc, &contactID, &assigneeID, &priority, &status, &source, &resolved, &created)
		out = append(out, map[string]any{"id": id, "number": number, "subject": subject, "description": desc, "contact_id": contactID, "assignee_id": assigneeID, "priority": priority, "status": status, "source": source, "resolved_at": resolved, "created_at": created})
	}
	return out
}

func ticketID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/tickets/"
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

// GET /api/v1/tickets/{id} (+replies), POST /api/v1/tickets/{id}/replies, PATCH /api/v1/tickets/{id}
func TicketDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := ticketID(r)
	if r.Method == "GET" {
		var t struct {
			ID, Number, Subject, Priority, Status, Source string
			Desc, ContactID, AssigneeID                  *string
			Resolved                                     *time.Time
			Created                                      time.Time
		}
		err := pool.QueryRow(r.Context(), `select id, number, subject, description, contact_id, assignee_id, priority, status, source, resolved_at, created_at from tickets where id=$1`, id).
			Scan(&t.ID, &t.Number, &t.Subject, &t.Desc, &t.ContactID, &t.AssigneeID, &t.Priority, &t.Status, &t.Source, &t.Resolved, &t.Created)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Tiket tidak ada")
			return
		}
		rows, _ := pool.Query(r.Context(), `select id, author_id, author_type, body, created_at from ticket_replies where ticket_id=$1 order by created_at`, id)
		replies := []map[string]any{}
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var rid, atype, body string
				var author *string
				var created time.Time
				_ = rows.Scan(&rid, &author, &atype, &body, &created)
				replies = append(replies, map[string]any{"id": rid, "author_id": author, "author_type": atype, "body": body, "created_at": created})
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{
			"id": t.ID, "number": t.Number, "subject": t.Subject, "description": t.Desc, "contact_id": t.ContactID,
			"assignee_id": t.AssigneeID, "priority": t.Priority, "status": t.Status, "source": t.Source,
			"resolved_at": t.Resolved, "created_at": t.Created,
		}, "meta": map[string]any{"replies": replies}})
		return
	}
	if r.Method == "POST" {
		// POST /tickets/{id}/replies — path check dilakukan di main via prefix
		var in struct {
			Body string `json:"body"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Body == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "body wajib")
			return
		}
		c := middleware.Claims(r)
		var author *string
		if c != nil {
			author = &c.UserID
		}
		var rid string
		if err := pool.QueryRow(r.Context(), `insert into ticket_replies (ticket_id, author_id, author_type, body) values ($1,$2,'agent',$3) returning id`, id, author, in.Body).Scan(&rid); err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		_, _ = pool.Exec(r.Context(), `update tickets set updated_at=now() where id=$1`, id)
		middleware.WriteJSON(w, 201, map[string]string{"id": rid})
		return
	}
	if r.Method == "PATCH" {
		var raw map[string]any
		if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
			return
		}
		setClauses := ""
		args := []any{}
		i := 1
		if s, ok := raw["status"].(string); ok {
			if s != "open" && s != "pending" && s != "resolved" && s != "closed" {
				middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status tidak valid")
				return
			}
			setClauses += fmt.Sprintf("status=$%d,", i)
			args = append(args, s)
			i++
			if s == "resolved" {
				setClauses += fmt.Sprintf("resolved_at=now(),")
			}
		}
		if p, ok := raw["priority"].(string); ok {
			if p != "low" && p != "medium" && p != "urgent" {
				middleware.WriteErr(w, 400, "VALIDATION_ERROR", "priority tidak valid")
				return
			}
			setClauses += fmt.Sprintf("priority=$%d,", i)
			args = append(args, p)
			i++
		}
		if v, ok := raw["assignee_id"]; ok {
			if s, ok := v.(string); ok && s != "" {
				setClauses += fmt.Sprintf("assignee_id=$%d,", i)
				args = append(args, s)
				i++
			} else {
				setClauses += "assignee_id=null,"
			}
		}
		if setClauses == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
			return
		}
		setClauses += "updated_at=now()"
		args = append(args, id)
		var outID string
		err := pool.QueryRow(r.Context(), fmt.Sprintf(`update tickets set %s where id=$%d returning id`, setClauses, i), args...).Scan(&outID)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Tiket tidak ada")
			return
		}
		middleware.WriteJSON(w, 200, map[string]string{"id": outID})
		return
	}
	middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
}

// POST /api/v1/tickets/public — form publik tanpa JWT, pakai X-Company-Id.
func TicketPublic(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	var in struct {
		Subject     string `json:"subject"`
		Description string `json:"description"`
		Name        string `json:"name"`
		Phone       string `json:"phone"`
		Email       string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil ||
		len(in.Subject) < 3 || len(in.Description) < 5 || in.Name == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "subject, description, name wajib (validasi panjang)")
		return
	}
	companyID := r.Header.Get("X-Company-Id")
	if companyID == "" {
		middleware.WriteErr(w, 400, "NO_COMPANY", "Form belum terhubung ke perusahaan (X-Company-Id)")
		return
	}
	pool, err := a.TenantPool(r.Context(), companyID)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	var contactID *string
	if in.Phone != "" {
		var id string
		_ = pool.QueryRow(r.Context(), `select id from contacts where phone=$1 limit 1`, in.Phone).Scan(&id)
		if id == "" {
			_ = pool.QueryRow(r.Context(), `insert into contacts (full_name, phone, email, source) values ($1,$2,$3,'ticket-form') returning id`, in.Name, nullStr(in.Phone), nullStr(in.Email)).Scan(&id)
		}
		if id != "" {
			contactID = &id
		}
	}
	number := fmt.Sprintf("T-%d-%d", time.Now().Year(), time.Now().Unix()%1000000)
	_, err = pool.Exec(r.Context(), `insert into tickets (number, subject, description, contact_id, priority, source) values ($1,$2,$3,$4,'medium','public_form')`, number, in.Subject, in.Description, contactID)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	middleware.WriteJSON(w, 201, map[string]string{"number": number, "message": "Laporan diterima, tim kami akan menghubungi"})
}
