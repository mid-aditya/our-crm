package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"crm-backend/internal/middleware"
)

// Contacts: GET list/detail, POST create, PATCH update, DELETE soft-delete.
func Contacts(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := contactID(r)
	switch r.Method {
	case "GET":
		if id != "" {
			var cid, fullName string
			var email, phone, company, source *string
			var tags []string
			err := pool.QueryRow(r.Context(), `select id, full_name, email, phone, company_name, source, tags from contacts where id=$1 and deleted_at is null`, id).
				Scan(&cid, &fullName, &email, &phone, &company, &source, &tags)
			if err != nil {
				middleware.WriteErr(w, 404, "NOT_FOUND", "Kontak tidak ada")
				return
			}
			middleware.WriteJSON(w, 200, map[string]any{"id": cid, "full_name": fullName, "email": email, "phone": phone, "company_name": company, "source": source, "tags": tags})
			return
		}
		search := r.URL.Query().Get("search")
		limit, offset := middleware.Page(r)
		q := `select id, full_name, email, phone, company_name, source, created_at from contacts where deleted_at is null`
		var rowsOut []map[string]any
		var total int
		if search != "" {
			_ = pool.QueryRow(r.Context(), `select count(*) from contacts where deleted_at is null and (full_name ilike $1 or email ilike $1 or phone ilike $1)`, "%"+search+"%").Scan(&total)
			rowsOut = contactRows(r, q+` and (full_name ilike $1 or email ilike $1 or phone ilike $1) order by created_at desc limit $2 offset $3`, "%"+search+"%", limit, offset)
		} else {
			_ = pool.QueryRow(r.Context(), `select count(*) from contacts where deleted_at is null`).Scan(&total)
			rowsOut = contactRows(r, q+` order by created_at desc limit $1 offset $2`, limit, offset)
		}
		middleware.WritePage(w, 200, rowsOut, middleware.PageMeta(limit, offset, total))
	case "POST":
		var in struct {
			FullName    string   `json:"full_name"`
			Email       string   `json:"email"`
			Phone       string   `json:"phone"`
			CompanyName string   `json:"company_name"`
			Source      string   `json:"source"`
			Tags        []string `json:"tags"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.FullName) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "full_name wajib")
			return
		}
		phone := normalizePhone(in.Phone)
		c := middleware.Claims(r)
		var owner *string
		if c != nil {
			owner = &c.UserID
		}
		tags := in.Tags
		if tags == nil {
			tags = []string{}
		}
		var newID string
		err := pool.QueryRow(r.Context(), `insert into contacts (full_name, email, phone, company_name, source, tags, owner_user_id) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
			in.FullName, nullStr(in.Email), phone, nullStr(in.CompanyName), nullStr(in.Source), tags, owner).Scan(&newID)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": newID})
	case "PATCH":
		if id == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "id wajib")
			return
		}
		var raw map[string]any
		if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
			return
		}
		cols := map[string]string{"full_name": "full_name", "email": "email", "phone": "phone", "company_name": "company_name", "source": "source"}
		set := ""
		args := []any{}
		i := 1
		for k, col := range cols {
			if v, ok := raw[k].(string); ok {
				val := v
				if k == "phone" {
					val = strOrEmpty(normalizePhone(v))
				}
				set += col + "=$" + itoa(i) + ","
				args = append(args, val)
				i++
			}
		}
		if set == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Tidak ada field valid")
			return
		}
		set += "updated_at=now()"
		args = append(args, id)
		var outID string
		err := pool.QueryRow(r.Context(), "update contacts set "+set+" where id=$"+itoa(i)+" returning id", args...).Scan(&outID)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Kontak tidak ada")
			return
		}
		middleware.WriteJSON(w, 200, map[string]string{"id": outID})
	case "DELETE":
		if id == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "id wajib")
			return
		}
		_, _ = pool.Exec(r.Context(), `update contacts set deleted_at=now() where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func contactRows(r *http.Request, q string, args ...any) []map[string]any {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, fullName string
		var email, phone, company, source *string
		var created any
		_ = rows.Scan(&id, &fullName, &email, &phone, &company, &source, &created)
		out = append(out, map[string]any{"id": id, "full_name": fullName, "email": email, "phone": phone, "company_name": company, "source": source})
	}
	return out
}

func contactID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/contacts/"
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

// normalizePhone: 08.. -> +628.., 62.. -> +62..
func normalizePhone(v string) *string {
	if v == "" {
		return nil
	}
	d := ""
	for _, ch := range v {
		if ch >= '0' && ch <= '9' {
			d += string(ch)
		}
	}
	var out string
	switch {
	case strings.HasPrefix(d, "62"):
		out = "+" + d
	case strings.HasPrefix(d, "0"):
		out = "+62" + d[1:]
	default:
		out = "+" + d
	}
	return &out
}

func strOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	var b [10]byte
	p := len(b)
	for i > 0 {
		p--
		b[p] = byte('0' + i%10)
		i /= 10
	}
	return string(b[p:])
}
