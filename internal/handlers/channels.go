package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"crm-backend/internal/middleware"
)

// GET /api/v1/wa-channels, POST /api/v1/wa-channels
func Channels(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		rows, err := pool.Query(r.Context(), `select id, name, type, config, status, created_at from whatsapp_channels order by created_at limit 20`)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name, typ, status string
			var cfg map[string]string
			var created string
			_ = rows.Scan(&id, &name, &typ, &cfg, &status, &created)
			out = append(out, map[string]any{"id": id, "name": name, "type": typ, "config": maskConfig(cfg), "status": status})
		}
		middleware.WriteJSON(w, 200, out)
	case "POST":
		var in struct {
			Name   string            `json:"name"`
			Type   string            `json:"type"`
			Config map[string]string `json:"config"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" || (in.Type != "official" && in.Type != "unofficial") {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name & type (official/unofficial) wajib")
			return
		}
		if in.Config == nil {
			in.Config = map[string]string{}
		}
		var id, status string
		var cfg map[string]string
		err := pool.QueryRow(r.Context(), `insert into whatsapp_channels (name, type, config) values ($1,$2,$3) returning id, status, config`, in.Name, in.Type, in.Config).Scan(&id, &status, &cfg)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]any{"id": id, "name": in.Name, "type": in.Type, "config": maskConfig(cfg), "status": status})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

var secretRe = regexp.MustCompile(`(?i)token|key|secret`)

func maskConfig(cfg map[string]string) map[string]any {
	out := map[string]any{}
	for k, v := range cfg {
		if secretRe.MatchString(k) {
			out[k] = "••••••"
		} else {
			out[k] = v
		}
	}
	return out
}
