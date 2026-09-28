package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"crm-backend/internal/middleware"

	"github.com/jackc/pgx/v5"
)

// FieldDef definisi field custom form tiket per company.
type FieldDef struct {
	ID       string `json:"id"`
	Key      string `json:"field_key"`
	Label    string `json:"label"`
	Type     string `json:"field_type"`
	Required bool   `json:"required"`
	Options  []string `json:"options"`
	Position int    `json:"position"`
	Active   bool   `json:"active"`
}

func scanFieldDefs(rows pgx.Rows) []FieldDef {
	out := []FieldDef{}
	for rows.Next() {
		var f FieldDef
		var opts []byte
		_ = rows.Scan(&f.ID, &f.Key, &f.Label, &f.Type, &f.Required, &opts, &f.Position, &f.Active)
		_ = json.Unmarshal(opts, &f.Options)
		if f.Options == nil {
			f.Options = []string{}
		}
		out = append(out, f)
	}
	rows.Close()
	return out
}

// GET /api/v1/ticket-fields (form aktif company), POST (tambah, manage_roles)
func TicketFields(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Key      string   `json:"field_key"`
			Label    string   `json:"label"`
			Type     string   `json:"field_type"`
			Required bool     `json:"required"`
			Options  []string `json:"options"`
			Position int      `json:"position"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Label == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "label wajib")
			return
		}
		key := strings.ToLower(strings.TrimSpace(in.Key))
		if key == "" {
			key = strings.ToLower(strings.TrimSpace(in.Label))
			var clean strings.Builder
			prevUnderscore := false
			for _, r := range key {
				switch {
				case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '_':
					if r == '_' && prevUnderscore {
						continue
					}
					prevUnderscore = r == '_'
					clean.WriteRune(r)
				case r == ' ', r == '.', r == '-':
					if !prevUnderscore {
						clean.WriteRune('_')
						prevUnderscore = true
					}
				}
			}
			key = strings.Trim(clean.String(), "_")
			if key == "" {
				key = "field"
			}
		}
		for _, r := range key {
			if !(r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '_') {
				middleware.WriteErr(w, 400, "VALIDATION_ERROR", "field_key hanya a-z, 0-9, _")
				return
			}
		}
		ft := in.Type
		switch ft {
		case "text", "textarea", "number", "date", "select":
		default:
			ft = "text"
		}
		opts, _ := json.Marshal(in.Options)
		var id string
		err := pool.QueryRow(r.Context(), `insert into ticket_field_defs (field_key, label, field_type, required, options, position) values ($1,$2,$3,$4,$5,$6) on conflict (field_key) do update set label=excluded.label, field_type=excluded.field_type, required=excluded.required, options=excluded.options, position=excluded.position, active=true returning id`, key, in.Label, ft, in.Required, opts, in.Position).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan field")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select id, field_key, label, field_type, required, options, position, active from ticket_field_defs where active=true order by position, created_at`)
	if err != nil {
		middleware.WriteJSON(w, 200, []FieldDef{})
		return
	}
	middleware.WriteJSON(w, 200, scanFieldDefs(rows))
}

// PATCH /api/v1/ticket-fields/{id} {label?, required?, active?, position?, options?}
// DELETE /api/v1/ticket-fields/{id} (soft: active=false)
func TicketFieldDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := ticketFieldID(r)
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set active=false where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["label"].(string); ok && v != "" {
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set label=$1 where id=$2`, v, id)
	}
	if v, ok := raw["required"].(bool); ok {
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set required=$1 where id=$2`, v, id)
	}
	if v, ok := raw["active"].(bool); ok {
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set active=$1 where id=$2`, v, id)
	}
	if v, ok := raw["position"].(float64); ok {
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set position=$1 where id=$2`, int(v), id)
	}
	if v, ok := raw["options"].([]any); ok {
		opts := []string{}
		for _, o := range v {
			if s, ok := o.(string); ok {
				opts = append(opts, s)
			}
		}
		b, _ := json.Marshal(opts)
		_, _ = pool.Exec(r.Context(), `update ticket_field_defs set options=$1 where id=$2`, b, id)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

func ticketFieldID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/ticket-fields/"
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

// saveTicketCustomValues simpan nilai custom (hanya key yang terdaftar & aktif).
func saveTicketCustomValues(r *http.Request, ticketID string, vals map[string]string) {
	if len(vals) == 0 {
		return
	}
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select field_key from ticket_field_defs where active=true`)
	if err != nil {
		return
	}
	defer rows.Close()
	allowed := map[string]bool{}
	for rows.Next() {
		var k string
		_ = rows.Scan(&k)
		allowed[k] = true
	}
	for k, v := range vals {
		if allowed[k] {
			_, _ = pool.Exec(r.Context(), `insert into ticket_field_values (ticket_id, field_key, value) values ($1,$2,$3) on conflict (ticket_id, field_key) do update set value=excluded.value`, ticketID, k, v)
		}
	}
}

// ticketCustomValues baca nilai custom satu tiket.
func ticketCustomValues(r *http.Request, ticketID string) map[string]string {
	pool := middleware.Tenant(r)
	out := map[string]string{}
	rows, err := pool.Query(r.Context(), `select field_key, value from ticket_field_values where ticket_id=$1`, ticketID)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var k, v string
		_ = rows.Scan(&k, &v)
		out[k] = v
	}
	return out
}

// ---- Company settings (key-value per company) ----

// GET /api/v1/company/settings, PUT /api/v1/company/settings {settings: {k: v}}
func CompanySettings(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "PUT" {
		var in struct {
			Settings map[string]string `json:"settings"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Settings == nil {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "settings wajib object")
			return
		}
		for k, v := range in.Settings {
			if k == "" || len(k) > 64 {
				continue
			}
			_, _ = pool.Exec(r.Context(), `insert into company_settings (key, value) values ($1,$2) on conflict (key) do update set value=excluded.value, updated_at=now()`, k, v)
		}
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	rows, err := pool.Query(r.Context(), `select key, value from company_settings`)
	if err != nil {
		middleware.WriteJSON(w, 200, map[string]string{})
		return
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var k, v string
		_ = rows.Scan(&k, &v)
		out[k] = v
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/company/schema-version — versi boilerplate DB company (developer).
func SchemaVersion(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select version, applied_at from tenant_migrations order by applied_at`)
	vers := []map[string]any{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var v string
			var at any
			_ = rows.Scan(&v, &at)
			vers = append(vers, map[string]any{"version": v, "applied_at": at})
		}
	}
	middleware.WriteJSON(w, 200, vers)
}
