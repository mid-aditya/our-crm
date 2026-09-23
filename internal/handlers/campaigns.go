package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
	"crm-backend/internal/wa"
)

// GET /api/v1/campaigns, POST /api/v1/campaigns
func Campaigns(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		limit, offset := middleware.Page(r)
		var total int
		_ = pool.QueryRow(r.Context(), `select count(*) from campaigns`).Scan(&total)
		rows, err := pool.Query(r.Context(), `select id, name, channel_id, template, audience, scheduled_at, status, stats, created_at from campaigns order by created_at desc limit $1 offset $2`, limit, offset)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name, chID, tpl, status string
			var audience, stats map[string]any
			var sched *time.Time
			var created time.Time
			_ = rows.Scan(&id, &name, &chID, &tpl, &audience, &sched, &status, &stats, &created)
			out = append(out, map[string]any{"id": id, "name": name, "channel_id": chID, "template": tpl, "audience": audience, "scheduled_at": sched, "status": status, "stats": stats})
		}
		middleware.WritePage(w, 200, out, middleware.PageMeta(limit, offset, total))
	case "POST":
		var in struct {
			Name        string         `json:"name"`
			ChannelID   string         `json:"channel_id"`
			Template    string         `json:"template"`
			Audience    map[string]any `json:"audience"`
			ScheduledAt *time.Time     `json:"scheduled_at"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" || in.ChannelID == "" || in.Template == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name, channel_id, template wajib")
			return
		}
		if in.Audience == nil {
			in.Audience = map[string]any{}
		}
		c := middleware.Claims(r)
		var by *string
		if c != nil {
			by = &c.UserID
		}
		var id string
		err := pool.QueryRow(r.Context(), `insert into campaigns (name, channel_id, template, audience, scheduled_at, created_by) values ($1,$2,$3,$4,$5,$6) returning id`, in.Name, in.ChannelID, in.Template, in.Audience, in.ScheduledAt, by).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func campaignID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/campaigns/"
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

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// GET /api/v1/campaigns/{id}/preview
func CampaignPreview(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := campaignID(r)
	var tpl string
	var audience map[string]any
	if err := pool.QueryRow(r.Context(), `select template, audience from campaigns where id=$1`, id).Scan(&tpl, &audience); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Campaign tidak ada")
		return
	}
	targets := resolveAudience(r, audience)
	sample := ""
	if len(targets) > 0 {
		sample = wa.RenderTemplate(tpl, targets[0].vars)
	}
	middleware.WriteJSON(w, 200, map[string]any{"total": len(targets), "sample": sample})
}

// POST /api/v1/campaigns/{id}/launch — kirim inline per batch + throttle.
func CampaignLaunch(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	pool := middleware.Tenant(r)
	id := campaignID(r)
	var tpl, status, chID string
	var audience map[string]any
	if err := pool.QueryRow(r.Context(), `select template, status, channel_id, audience from campaigns where id=$1`, id).Scan(&tpl, &status, &chID, &audience); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Campaign tidak ada")
		return
	}
	if status != "draft" {
		middleware.WriteErr(w, 400, "ALREADY_LAUNCHED", "Campaign sudah "+status)
		return
	}
	var chType string
	var chCfg map[string]string
	if err := pool.QueryRow(r.Context(), `select type, config from whatsapp_channels where id=$1`, chID).Scan(&chType, &chCfg); err != nil {
		middleware.WriteErr(w, 400, "NO_CHANNEL", "Channel tidak ada")
		return
	}
	_, _ = pool.Exec(r.Context(), `update campaigns set status='sending', updated_at=now() where id=$1`, id)
	targets := resolveAudience(r, audience)
	sent, failed := 0, 0
	for _, t := range targets {
		if t.phone == "" {
			failed++
			continue
		}
		res := a.Sender.Send(chType, chCfg, t.phone, wa.RenderTemplate(tpl, t.vars))
		if res.OK {
			sent++
		} else {
			failed++
		}
		time.Sleep(300 * time.Millisecond)
	}
	stats := map[string]int{"sent": sent, "failed": failed, "total": len(targets)}
	_, _ = pool.Exec(r.Context(), `update campaigns set status='done', stats=$1, updated_at=now() where id=$2`, stats, id)
	middleware.WriteJSON(w, 200, map[string]any{"id": id, "status": "done", "stats": stats})
}

// DELETE /api/v1/campaigns/{id}
func CampaignDelete(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := campaignID(r)
	var status string
	if err := pool.QueryRow(r.Context(), `select status from campaigns where id=$1`, id).Scan(&status); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Campaign tidak ada")
		return
	}
	if status == "sending" {
		middleware.WriteErr(w, 400, "SENDING", "Campaign sedang dikirim")
		return
	}
	_, _ = pool.Exec(r.Context(), `delete from campaigns where id=$1`, id)
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

type target struct {
	phone string
	vars  map[string]string
}

func resolveAudience(r *http.Request, audience map[string]any) []target {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select full_name, company_name, email, phone, source, tags from contacts where phone is not null`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var wantTags []string
	if t, ok := audience["tags"].([]any); ok {
		for _, v := range t {
			if s, ok := v.(string); ok {
				wantTags = append(wantTags, s)
			}
		}
	}
	wantSource, _ := audience["source"].(string)
	var out []target
	for rows.Next() {
		var name, company, email, phone, source *string
		var tags []string
		_ = rows.Scan(&name, &company, &email, &phone, &source, &tags)
		if phone == nil || *phone == "" {
			continue
		}
		if wantSource != "" && (source == nil || *source != wantSource) {
			continue
		}
		if len(wantTags) > 0 {
			set := map[string]bool{}
			for _, t := range tags {
				set[t] = true
			}
			hit := false
			for _, t := range wantTags {
				if set[t] {
					hit = true
				}
			}
			if !hit {
				continue
			}
		}
		out = append(out, target{phone: *phone, vars: wa.ContactVars(strVal(name), strVal(company), strVal(email), *phone)})
	}
	return out
}

func strVal(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
