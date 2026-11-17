package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

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
			out = append(out, map[string]any{"id": id, "name": name, "channel_id": chID, "template": tpl, "audience": audience, "scheduled_at": sched, "status": status, "stats": stats, "created_at": created})
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
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" || in.ChannelID == "" || strings.TrimSpace(in.Template) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name, channel_id, template wajib")
			return
		}
		if _, err := getSenderChannel(r.Context(), pool, in.ChannelID); err != nil {
			middleware.WriteErr(w, 400, "INVALID_CHANNEL", "Channel pengirim tidak ditemukan")
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
		err := pool.QueryRow(r.Context(), `insert into campaigns (name, channel_id, template, audience, scheduled_at, created_by) values ($1,$2,$3,$4,$5,$6) returning id`, strings.TrimSpace(in.Name), in.ChannelID, in.Template, in.Audience, in.ScheduledAt, by).Scan(&id)
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

// GET /api/v1/campaigns/channels — channel yang bisa dipakai untuk blast.
// Menggabungkan sistem channel baru (company_channels/channel_configs) dan
// channel legacy (whatsapp_channels) supaya campaign lama tetap bisa dikirim.
func CampaignChannels(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	companyID := ""
	if c != nil {
		companyID = c.CompanyID
	}
	out := []map[string]any{}
	for _, ch := range listSendChannels(r.Context(), pool, companyID) {
		out = append(out, map[string]any{
			"id": ch.ID, "name": ch.Name, "type": ch.Kind,
			"ready": ch.Ready, "status": ch.Status,
		})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/campaigns/audience — meta audiens untuk filter composer.
func CampaignAudience(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	var total, withPhone int
	_ = pool.QueryRow(r.Context(), `select count(*), count(*) filter (where phone is not null and phone <> '') from contacts where deleted_at is null`).Scan(&total, &withPhone)

	sources := []string{}
	if rows, err := pool.Query(r.Context(), `select distinct source from contacts where deleted_at is null and source is not null and source <> '' order by source`); err == nil {
		for rows.Next() {
			var s string
			if rows.Scan(&s) == nil {
				sources = append(sources, s)
			}
		}
		rows.Close()
	}

	tags := []string{}
	if rows, err := pool.Query(r.Context(), `select distinct tag from contacts, unnest(tags) as tag where deleted_at is null and tag <> '' order by tag`); err == nil {
		for rows.Next() {
			var s string
			if rows.Scan(&s) == nil {
				tags = append(tags, s)
			}
		}
		rows.Close()
	}

	middleware.WriteJSON(w, 200, map[string]any{
		"total": total, "with_phone": withPhone, "sources": sources, "tags": tags,
	})
}

// POST /api/v1/campaigns/preview — pratinjau sebelum campaign disimpan.
func CampaignPreviewDraft(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Template string         `json:"template"`
		Audience map[string]any `json:"audience"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Body tidak valid")
		return
	}
	targets := resolveAudience(r, in.Audience)
	samples := []map[string]any{}
	for i, t := range targets {
		if i >= 5 {
			break
		}
		samples = append(samples, map[string]any{
			"name":     t.vars["nama_lengkap"],
			"phone":    t.phone,
			"vars":     t.vars,
			"rendered": wa.RenderTemplate(in.Template, t.vars),
		})
	}
	middleware.WriteJSON(w, 200, map[string]any{
		"total":        len(targets),
		"samples":      samples,
		"unknown_vars": wa.UnknownVars(in.Template),
	})
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

// POST /api/v1/campaigns/{id}/launch — kirim di background per batch + throttle.
// Respons langsung 202 agar HTTP request tidak menunggu ribuan kontak.
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
	ch, err := getSenderChannel(r.Context(), pool, chID)
	if err != nil {
		middleware.WriteErr(w, 400, "NO_CHANNEL", "Channel pengirim tidak ada")
		return
	}
	if !ch.Ready {
		middleware.WriteErr(w, 400, "CHANNEL_NOT_READY", "Channel belum dikonfigurasi")
		return
	}
	targets := resolveAudience(r, audience)
	stats := map[string]int{"sent": 0, "failed": 0, "total": len(targets)}
	statsJSON, _ := json.Marshal(stats)
	_, _ = pool.Exec(r.Context(), `update campaigns set status='sending', stats=$1, updated_at=now() where id=$2`, statsJSON, id)

	go runCampaign(pool, a.Sender, id, tpl, ch.Kind, ch.Config, targets)

	middleware.WriteJSON(w, 202, map[string]any{"id": id, "status": "sending", "stats": stats})
}

func runCampaign(pool *pgxpool.Pool, sender wa.Sender, id, tpl, kind string, cfg map[string]string, targets []target) {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Hour)
	defer cancel()

	sent, failed := 0, 0
	for i, t := range targets {
		if t.phone == "" {
			failed++
		} else {
			res := sender.Send(kind, cfg, t.phone, wa.RenderTemplate(tpl, t.vars))
			if res.OK {
				sent++
			} else {
				failed++
			}
		}
		if (i+1)%10 == 0 || i == len(targets)-1 {
			saveCampaignStats(ctx, pool, id, sent, failed, len(targets))
		}
		time.Sleep(300 * time.Millisecond)
	}
	saveCampaignStats(ctx, pool, id, sent, failed, len(targets))
	_, _ = pool.Exec(ctx, `update campaigns set status='done', updated_at=now() where id=$1`, id)
}

func saveCampaignStats(ctx context.Context, pool *pgxpool.Pool, id string, sent, failed, total int) {
	stats, _ := json.Marshal(map[string]int{"sent": sent, "failed": failed, "total": total})
	_, _ = pool.Exec(ctx, `update campaigns set stats=$1, updated_at=now() where id=$2`, stats, id)
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

// ---- Pengirim / audiens ----

type sendChannel struct {
	ID     string
	Name   string
	Kind   string // official | unofficial
	Status string
	Ready  bool
	Config map[string]string
}

type target struct {
	phone string
	vars  map[string]string
}

func mapChannelType(typeID string) (string, bool) {
	switch strings.ToLower(typeID) {
	case "whatsapp-official", "official":
		return "official", true
	case "whatsapp-baileys", "unofficial", "gateway":
		return "unofficial", true
	default:
		return "", false
	}
}

func toStringMap(in map[string]any) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		if v == nil {
			continue
		}
		out[k] = fmt.Sprint(v)
	}
	return out
}

// normalizeUnofficial menyelaraskan nama field channel baru ke format sender.
func normalizeUnofficial(cfg map[string]string) {
	if cfg["api_key"] == "" {
		cfg["api_key"] = cfg["auth_key"]
	}
	if cfg["session"] == "" {
		cfg["session"] = cfg["device_name"]
	}
}

func channelReady(kind string, cfg map[string]string) bool {
	if kind == "official" {
		return cfg["phone_number_id"] != "" && cfg["access_token"] != ""
	}
	return strings.TrimSpace(cfg["gateway_url"]) != ""
}

func listSendChannels(ctx context.Context, pool *pgxpool.Pool, companyID string) []sendChannel {
	out := []sendChannel{}

	// Channel sistem baru.
	rows, err := pool.Query(ctx, `
		SELECT cc.id::text, ct.name, cc.channel_type_id, cc.status,
		       COALESCE(cfg.config, '{}'::jsonb)
		FROM company_channels cc
		JOIN channel_types ct ON ct.id = cc.channel_type_id
		LEFT JOIN LATERAL (
			SELECT config FROM channel_configs
			WHERE company_channel_id = cc.id AND is_default = true
			LIMIT 1
		) cfg ON true
		WHERE (cc.company_id = $1 OR cc.company_id IS NULL)
		  AND cc.channel_type_id IN ('whatsapp-official', 'whatsapp-baileys')
		ORDER BY ct.name`, companyID)
	if err == nil {
		for rows.Next() {
			var id, name, typeID, status string
			var raw map[string]any
			if rows.Scan(&id, &name, &typeID, &status, &raw) != nil {
				continue
			}
			kind, ok := mapChannelType(typeID)
			if !ok {
				continue
			}
			cfg := toStringMap(raw)
			if kind == "unofficial" {
				normalizeUnofficial(cfg)
			}
			out = append(out, sendChannel{
				ID: id, Name: name, Kind: kind, Status: status,
				Ready: channelReady(kind, cfg), Config: cfg,
			})
		}
		rows.Close()
	}

	// Channel legacy (dipakai campaign lama / webhook WA).
	rows, err = pool.Query(ctx, `SELECT id::text, name, type, status, config FROM whatsapp_channels ORDER BY created_at`)
	if err == nil {
		for rows.Next() {
			var id, name, typeID, status string
			var raw map[string]any
			if rows.Scan(&id, &name, &typeID, &status, &raw) != nil {
				continue
			}
			kind, ok := mapChannelType(typeID)
			if !ok {
				continue
			}
			cfg := toStringMap(raw)
			if kind == "unofficial" {
				normalizeUnofficial(cfg)
			}
			out = append(out, sendChannel{
				ID: id, Name: name, Kind: kind, Status: status,
				Ready: channelReady(kind, cfg), Config: cfg,
			})
		}
		rows.Close()
	}
	return out
}

func getSenderChannel(ctx context.Context, pool *pgxpool.Pool, id string) (sendChannel, error) {
	// Legacy dulu: campaign lama menyimpan channel_id ke whatsapp_channels.
	var name, typeID, status string
	var raw map[string]any
	err := pool.QueryRow(ctx, `SELECT name, type, status, config FROM whatsapp_channels WHERE id=$1`, id).
		Scan(&name, &typeID, &status, &raw)
	if err == nil {
		kind, ok := mapChannelType(typeID)
		if !ok {
			return sendChannel{}, fmt.Errorf("tipe channel tidak didukung")
		}
		cfg := toStringMap(raw)
		if kind == "unofficial" {
			normalizeUnofficial(cfg)
		}
		return sendChannel{ID: id, Name: name, Kind: kind, Status: status, Ready: channelReady(kind, cfg), Config: cfg}, nil
	}

	// Channel sistem baru.
	var ctName string
	var cfgRaw map[string]any
	err = pool.QueryRow(ctx, `
		SELECT ct.name, cc.channel_type_id, cc.status, COALESCE(cfg.config, '{}'::jsonb)
		FROM company_channels cc
		JOIN channel_types ct ON ct.id = cc.channel_type_id
		LEFT JOIN LATERAL (
			SELECT config FROM channel_configs
			WHERE company_channel_id = cc.id AND is_default = true
			LIMIT 1
		) cfg ON true
		WHERE cc.id = $1`, id).Scan(&ctName, &typeID, &status, &cfgRaw)
	if err != nil {
		return sendChannel{}, fmt.Errorf("channel tidak ditemukan")
	}
	kind, ok := mapChannelType(typeID)
	if !ok {
		return sendChannel{}, fmt.Errorf("tipe channel tidak didukung")
	}
	cfg := toStringMap(cfgRaw)
	if kind == "unofficial" {
		normalizeUnofficial(cfg)
	}
	return sendChannel{ID: id, Name: ctName, Kind: kind, Status: status, Ready: channelReady(kind, cfg), Config: cfg}, nil
}

func resolveAudience(r *http.Request, audience map[string]any) []target {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select full_name, company_name, email, phone, source, tags from contacts where deleted_at is null and phone is not null and phone <> ''`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var wantTags []string
	if t, ok := audience["tags"].([]any); ok {
		for _, v := range t {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				wantTags = append(wantTags, s)
			}
		}
	}
	wantSource, _ := audience["source"].(string)
	wantSource = strings.TrimSpace(wantSource)

	seenPhone := map[string]bool{}
	var out []target
	for rows.Next() {
		var name, company, email, phone, source *string
		var tags []string
		_ = rows.Scan(&name, &company, &email, &phone, &source, &tags)
		if phone == nil || strings.TrimSpace(*phone) == "" {
			continue
		}
		if seenPhone[*phone] {
			continue
		}
		if wantSource != "" && (source == nil || *source != wantSource) {
			continue
		}
		if len(wantTags) > 0 {
			set := map[string]bool{}
			for _, t := range tags {
				set[strings.ToLower(t)] = true
			}
			hit := false
			for _, t := range wantTags {
				if set[strings.ToLower(t)] {
					hit = true
				}
			}
			if !hit {
				continue
			}
		}
		seenPhone[*phone] = true
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
