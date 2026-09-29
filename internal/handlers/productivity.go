package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
)

// Productivity: target bulanan per user + scoreboard realisasi.
// Guard: team.manage (SPV/Admin/Developer).

// GET /api/v1/productivity/targets?period=YYYY-MM
// PUT /api/v1/productivity/targets {user_id, period, chats_target?, tickets_target?, deals_target?, deals_value_target?}
func ProductivityTargets(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "PUT" {
		var in struct {
			UserID          string  `json:"user_id"`
			Period          string  `json:"period"`
			ChatsTarget     int     `json:"chats_target"`
			TicketsTarget   int     `json:"tickets_target"`
			DealsTarget     int     `json:"deals_target"`
			DealsValueTarget float64 `json:"deals_value_target"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.UserID == "" || len(in.Period) != 7 {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "user_id & period (YYYY-MM) wajib")
			return
		}
		if in.ChatsTarget < 0 {
			in.ChatsTarget = 0
		}
		if in.TicketsTarget < 0 {
			in.TicketsTarget = 0
		}
		if in.DealsTarget < 0 {
			in.DealsTarget = 0
		}
		if in.DealsValueTarget < 0 {
			in.DealsValueTarget = 0
		}
		_, err := pool.Exec(r.Context(), `insert into productivity_targets (user_id, period, chats_target, tickets_target, deals_target, deals_value_target) values ($1,$2,$3,$4,$5,$6) on conflict (user_id, period) do update set chats_target=$3, tickets_target=$4, deals_target=$5, deals_value_target=$6, updated_at=now()`,
			in.UserID, in.Period, in.ChatsTarget, in.TicketsTarget, in.DealsTarget, in.DealsValueTarget)
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan target")
			return
		}
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	period := r.URL.Query().Get("period")
	if len(period) != 7 {
		period = time.Now().Format("2006-01")
	}
	rows, err := pool.Query(r.Context(), `select u.id, u.full_name, coalesce(r.name,''), coalesce(t.chats_target,0), coalesce(t.tickets_target,0), coalesce(t.deals_target,0), coalesce(t.deals_value_target,0) from users u left join roles r on r.id=u.role_id left join productivity_targets t on t.user_id=u.id and t.period=$1 where u.status='active' order by u.full_name`, period)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, role string
		var ct, tt, dt int
		var dvt float64
		_ = rows.Scan(&id, &name, &role, &ct, &tt, &dt, &dvt)
		out = append(out, map[string]any{"user_id": id, "full_name": name, "role": role, "period": period, "chats_target": ct, "tickets_target": tt, "deals_target": dt, "deals_value_target": dvt})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/productivity/scoreboard?period=YYYY-MM
func ProductivityScoreboard(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	period := r.URL.Query().Get("period")
	if len(period) != 7 {
		period = time.Now().Format("2006-01")
	}
	rows, err := pool.Query(r.Context(), `
		select u.id, u.full_name, coalesce(r.name,''),
			coalesce(t.chats_target,0), coalesce(t.tickets_target,0), coalesce(t.deals_target,0), coalesce(t.deals_value_target,0),
			(select count(*) from livechat_sessions ls where ls.assigned_agent_id=u.id and to_char(ls.created_at,'YYYY-MM')=$1),
			(select count(*) from livechat_sessions ls where ls.assigned_agent_id=u.id and ls.status='resolved' and to_char(coalesce(ls.resolved_at,ls.updated_at),'YYYY-MM')=$1),
			(select count(*) from tickets tk where tk.assignee_id=u.id and tk.status in ('resolved','closed') and to_char(coalesce(tk.resolved_at,tk.updated_at),'YYYY-MM')=$1),
			(select count(*) from deals d join sales_stages s on s.id=d.stage_id where d.owner_id=u.id and s.is_won=true and to_char(d.updated_at,'YYYY-MM')=$1),
			coalesce((select sum(d.value) from deals d join sales_stages s on s.id=d.stage_id where d.owner_id=u.id and s.is_won=true and to_char(d.updated_at,'YYYY-MM')=$1),0),
			(select count(distinct a.date) from attendance a where a.user_id=u.id and to_char(a.date,'YYYY-MM')=$1 and a.check_in is not null)
		from users u
		left join roles r on r.id=u.role_id
		left join productivity_targets t on t.user_id=u.id and t.period=$1
		where u.status='active'
		order by u.full_name`, period)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, role string
		var ct, tt, dt int
		var dvt float64
		var chats, chatsDone, ticketsDone, dealsWon int
		var dealsValue float64
		var present int
		if serr := rows.Scan(&id, &name, &role, &ct, &tt, &dt, &dvt, &chats, &chatsDone, &ticketsDone, &dealsWon, &dealsValue, &present); serr != nil {
			log.Printf("scoreboard scan err: %v", serr)
			continue
		}
		out = append(out, map[string]any{
			"user_id": id, "full_name": name, "role": role, "period": period,
			"chats_target": ct, "tickets_target": tt, "deals_target": dt, "deals_value_target": dvt,
			"chats": chats, "chats_done": chatsDone, "tickets_done": ticketsDone,
			"deals_won": dealsWon, "deals_value": dealsValue, "present_days": present,
		})
	}
	middleware.WriteJSON(w, 200, out)
}
