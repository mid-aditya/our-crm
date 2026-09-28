package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"

	"github.com/jackc/pgx/v5/pgxpool"
)

// userStats ringkasan aktivitas satu user.
func userStats(ctx context.Context, pool *pgxpool.Pool, userID string) map[string]any {
	var assigned, resolved, sent, tOpen, tDone, replies int
	_ = pool.QueryRow(ctx, `select count(*) from livechat_sessions where assigned_agent_id=$1`, userID).Scan(&assigned)
	_ = pool.QueryRow(ctx, `select count(*) from livechat_sessions where assigned_agent_id=$1 and status='resolved'`, userID).Scan(&resolved)
	_ = pool.QueryRow(ctx, `select count(*) from livechat_messages m join livechat_sessions s on s.id=m.session_id where s.assigned_agent_id=$1 and m.direction='outbound'`, userID).Scan(&sent)
	_ = pool.QueryRow(ctx, `select count(*) from tickets where assignee_id=$1 and status in ('open','pending')`, userID).Scan(&tOpen)
	_ = pool.QueryRow(ctx, `select count(*) from tickets where assignee_id=$1 and status in ('resolved','closed')`, userID).Scan(&tDone)
	_ = pool.QueryRow(ctx, `select count(*) from ticket_replies where author_id=$1`, userID).Scan(&replies)
	return map[string]any{
		"assigned_chats": assigned, "resolved_chats": resolved, "messages_sent": sent,
		"tickets_open": tOpen, "tickets_done": tDone, "ticket_replies": replies,
	}
}

// GET /api/v1/dashboard/summary
// Agent: ringkasan aktivitas sendiri.
// SPV: ringkasan agent di bawah naungannya (supervisor_id = saya).
// Admin/Developer: ringkasan semua user operasional.
func DashboardSummary(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	claims := middleware.Claims(r)
	uid := claims.UserID

	role, level := "", 0
	_ = pool.QueryRow(r.Context(), `select r.name, coalesce(r.level,0) from users u join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&role, &level)
	if role == "" && claims.Role != "" {
		role = claims.Role
		switch role {
		case "admin":
			level = 80
		case "spv":
			level = 50
		default:
			level = 10
		}
	}

	var ids []struct {
		ID, Name, Role string
	}
	if level >= 80 {
		// Admin/developer: semua user aktif non-developer? tampilkan semua kecuali system? tampilkan semua.
		rows, err := pool.Query(r.Context(), `select u.id, u.full_name, coalesce(r.name,'') from users u left join roles r on r.id=u.role_id where u.status='active' order by u.full_name`)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var e struct {
					ID, Name, Role string
				}
				_ = rows.Scan(&e.ID, &e.Name, &e.Role)
				ids = append(ids, e)
			}
		}
	} else if level >= 50 {
		// SPV: agent di bawah naungannya + dirinya sendiri.
		rows, err := pool.Query(r.Context(), `select u.id, u.full_name, coalesce(r.name,'') from users u left join roles r on r.id=u.role_id where u.status='active' and (u.id=$1 or u.supervisor_id=$1) order by u.full_name`, uid)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var e struct {
					ID, Name, Role string
				}
				_ = rows.Scan(&e.ID, &e.Name, &e.Role)
				ids = append(ids, e)
			}
		}
	} else {
		// Agent: dirinya sendiri.
		var name, rname string
		_ = pool.QueryRow(r.Context(), `select u.full_name, coalesce(r.name,'') from users u left join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&name, &rname)
		if name == "" {
			name = uid
		}
		ids = append(ids, struct {
			ID, Name, Role string
		}{uid, name, rname})
	}

	members := []map[string]any{}
	totals := map[string]int{"assigned_chats": 0, "resolved_chats": 0, "messages_sent": 0, "tickets_open": 0, "tickets_done": 0, "ticket_replies": 0}
	for _, e := range ids {
		st := userStats(r.Context(), pool, e.ID)
		for k, v := range totals {
			if n, ok := st[k].(int); ok {
				totals[k] = v + n
			} else if n64, ok := st[k].(int64); ok {
				totals[k] = v + int(n64)
			}
		}
		members = append(members, map[string]any{"user_id": e.ID, "full_name": e.Name, "role": e.Role, "stats": st})
	}

	// Aktivitas terbaru dalam naungan: 10 log terakhir (bila tabel ada).
	recent := []map[string]any{}
	memberIDs := make([]string, 0, len(ids))
	for _, e := range ids {
		memberIDs = append(memberIDs, e.ID)
	}
	if len(memberIDs) > 0 {
		rows, err := pool.Query(r.Context(), `select user_name, role_name, method, path, status_code, created_at from activity_logs where user_id = any($1::uuid[]) order by created_at desc limit 10`, memberIDs)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var uname, rname, method, path *string
				var code int
				var created time.Time
				_ = rows.Scan(&uname, &rname, &method, &path, &code, &created)
				m, p := "", ""
				if method != nil {
					m = *method
				}
				if path != nil {
					p = *path
				}
				un, rn := "", ""
				if uname != nil {
					un = *uname
				}
				if rname != nil {
					rn = *rname
				}
				recent = append(recent, map[string]any{"user_name": un, "role_name": rn, "method": m, "path": p, "status_code": code, "created_at": created})
			}
		}
	}

	tot := map[string]any{}
	for k, v := range totals {
		tot[k] = v
	}
	middleware.WriteJSON(w, 200, map[string]any{
		"scope_role": role, "scope_level": level,
		"totals": tot, "members": members, "recent": recent,
	})
}

// PUT /api/v1/users/{id}/supervisor {supervisor_id|null} (team.manage)
func UserSupervisor(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	p := r.URL.Path
	const marker = "/users/"
	i := indexOf(p, marker)
	rest := p[i+len(marker):]
	id := rest
	for j, ch := range rest {
		if ch == '/' {
			id = rest[:j]
			break
		}
	}
	var in struct {
		SupervisorID *string `json:"supervisor_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if in.SupervisorID == nil || *in.SupervisorID == "" {
		_, _ = pool.Exec(r.Context(), `update users set supervisor_id=null, updated_at=now() where id=$1`, id)
	} else {
		if *in.SupervisorID == id {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "supervisor tidak boleh diri sendiri")
			return
		}
		var n int
		_ = pool.QueryRow(r.Context(), `select count(*) from users where id=$1`, *in.SupervisorID).Scan(&n)
		if n == 0 {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Supervisor tidak ada")
			return
		}
		_, _ = pool.Exec(r.Context(), `update users set supervisor_id=$1, updated_at=now() where id=$2`, *in.SupervisorID, id)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}
