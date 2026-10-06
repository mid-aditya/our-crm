package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"crm-backend/internal/middleware"
)

// Tim: kapasitas max chat, channel yang di-handle, unit organisasi, timesheet.
// Guard: team.manage. Scope tulis SPV: hanya tim sendiri (tak bisa ubah admin/developer/owner).

// GET /api/v1/team/members — ringkas + presence + kapasitas + channel.
func TeamMembers(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	uid, role := "", ""
	if c != nil {
		uid = c.UserID
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&role)
		if role == "" {
			role = c.Role
		}
	}
	q := `select u.id, u.email, u.full_name, coalesce(r.name,''), u.status, coalesce(u.max_chats,10), u.supervisor_id, s.full_name, coalesce(ap.status,'offline'), u.org_unit_id, o.name from users u left join roles r on r.id=u.role_id left join users s on s.id=u.supervisor_id left join agent_presence ap on ap.user_id=u.id left join org_units o on o.id=u.org_unit_id`
	var args []any
	if strings.ToLower(role) == "spv" {
		q += ` where (u.id=$1 or u.supervisor_id=$1) order by u.full_name`
		args = append(args, uid)
	} else {
		q += ` order by u.full_name`
	}
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, email, name, roleName, status string
		var maxChats int
		var supID, supName, presence, orgID, orgName *string
		_ = rows.Scan(&id, &email, &name, &roleName, &status, &maxChats, &supID, &supName, &presence, &orgID, &orgName)
		var chs []string
		if crows, err := pool.Query(r.Context(), `select channel_type_id from agent_channels where user_id=$1 order by channel_type_id`, id); err == nil {
			for crows.Next() {
				var ch string
				_ = crows.Scan(&ch)
				chs = append(chs, ch)
			}
			crows.Close()
		}
		if chs == nil {
			chs = []string{}
		}
		out = append(out, map[string]any{
			"id": id, "email": email, "full_name": name, "role": roleName, "status": status,
			"max_chats": maxChats, "supervisor_id": supID, "supervisor_name": supName, "presence": presence,
			"org_unit_id": orgID, "org_unit_name": orgName, "channels": chs,
		})
	}
	middleware.WriteJSON(w, 200, out)
}

// PUT /api/v1/team/members/{id} {max_chats?, channels?[], org_unit_id?}
func TeamMemberUpdate(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	id := lastPathSegment(r.URL.Path, "/team/members/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID tidak valid")
		return
	}
	if c != nil {
		var role string
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, c.UserID).Scan(&role)
		if role == "" {
			role = c.Role
		}
		if strings.ToLower(role) == "spv" {
			// SPV tak boleh ubah admin/developer/owner, dan hanya tim sendiri.
			var targetRole, sup string
			_ = pool.QueryRow(r.Context(), `select coalesce(r.name,''), coalesce(u.supervisor_id::text,'') from users u left join roles r on r.id=u.role_id where u.id=$1`, id).Scan(&targetRole, &sup)
			tl := strings.ToLower(targetRole)
			if tl == "developer" || tl == "admin" || tl == "owner" {
				middleware.WriteErr(w, 403, "FORBIDDEN", "Di luar kewenangan")
				return
			}
			if id != c.UserID && sup != c.UserID {
				middleware.WriteErr(w, 403, "FORBIDDEN", "Hanya tim sendiri")
				return
			}
		}
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["max_chats"].(float64); ok {
		m := int(v)
		if m < 1 {
			m = 1
		}
		if m > 100 {
			m = 100
		}
		_, _ = pool.Exec(r.Context(), `update users set max_chats=$1, updated_at=now() where id=$2`, m, id)
	}
	if v, ok := raw["channels"].([]any); ok {
		chs := []string{}
		for _, o := range v {
			if s, ok := o.(string); ok && s != "" {
				chs = append(chs, s)
			}
		}
		_, _ = pool.Exec(r.Context(), `delete from agent_channels where user_id=$1`, id)
		for _, ch := range chs {
			_, _ = pool.Exec(r.Context(), `insert into agent_channels (user_id, channel_type_id) values ($1,$2) on conflict do nothing`, id, ch)
		}
	}
	if v, ok := raw["org_unit_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" {
			_, _ = pool.Exec(r.Context(), `update users set org_unit_id=$1, updated_at=now() where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update users set org_unit_id=null, updated_at=now() where id=$1`, id)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// GET /api/v1/org-units, POST /api/v1/org-units {name, unit_type, parent_id?}
func OrgUnits(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Name     string `json:"name"`
			UnitType string `json:"unit_type"`
			ParentID string `json:"parent_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		ut := in.UnitType
		if ut != "regional" && ut != "branch" && ut != "kiosk" {
			ut = "branch"
		}
		var parent *string
		if in.ParentID != "" {
			parent = &in.ParentID
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into org_units (name, unit_type, parent_id) values ($1,$2,$3) returning id`, strings.TrimSpace(in.Name), ut, parent).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan unit")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select o.id, o.name, o.unit_type, o.parent_id, p.name, o.head_id, u.full_name, (select count(*) from users x where x.org_unit_id=o.id and x.status='active') from org_units o left join org_units p on p.id=o.parent_id left join users u on u.id=o.head_id order by o.unit_type, o.name`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, utype string
		var parentID, parentName, headID, headName *string
		var members int
		_ = rows.Scan(&id, &name, &utype, &parentID, &parentName, &headID, &headName, &members)
		out = append(out, map[string]any{"id": id, "name": name, "unit_type": utype, "parent_id": parentID, "parent_name": parentName, "head_id": headID, "head_name": headName, "members": members})
	}
	middleware.WriteJSON(w, 200, out)
}

// PATCH /api/v1/org-units/{id} {name?, unit_type?, parent_id?, head_id?}
// DELETE /api/v1/org-units/{id} (cascade ke anak via FK)
func OrgUnitDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := lastPathSegment(r.URL.Path, "/org-units/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID tidak valid")
		return
	}
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from org_units where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["name"].(string); ok && strings.TrimSpace(v) != "" {
		_, _ = pool.Exec(r.Context(), `update org_units set name=$1 where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["unit_type"].(string); ok && (v == "regional" || v == "branch" || v == "kiosk") {
		_, _ = pool.Exec(r.Context(), `update org_units set unit_type=$1 where id=$2`, v, id)
	}
	if v, ok := raw["parent_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" && s != id {
			_, _ = pool.Exec(r.Context(), `update org_units set parent_id=$1 where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update org_units set parent_id=null where id=$1`, id)
		}
	}
	if v, ok := raw["head_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" {
			_, _ = pool.Exec(r.Context(), `update org_units set head_id=$1 where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update org_units set head_id=null where id=$1`, id)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// GET /api/v1/timesheets?month=YYYY-MM (milik sendiri)
// POST /api/v1/timesheets {date, project, hours, overtime_hours?, description?}
func Timesheets(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	uid := ""
	if c != nil {
		uid = c.UserID
	}
	if r.Method == "POST" {
		var in struct {
			Date          string  `json:"date"`
			Project       string  `json:"project"`
			Hours         float64 `json:"hours"`
			OvertimeHours float64 `json:"overtime_hours"`
			Description   string  `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || len(in.Date) != 10 {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "date (YYYY-MM-DD) wajib")
			return
		}
		if in.Hours < 0 {
			in.Hours = 0
		}
		if in.Hours > 24 {
			in.Hours = 24
		}
		if in.OvertimeHours < 0 {
			in.OvertimeHours = 0
		}
		if in.OvertimeHours > 12 {
			in.OvertimeHours = 12
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into timesheets (user_id, date, project, hours, overtime_hours, description) values ($1,$2::date,$3,$4,$5,$6) returning id`, uid, in.Date, strings.TrimSpace(in.Project), in.Hours, in.OvertimeHours, in.Description).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan timesheet")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	month := r.URL.Query().Get("month")
	if len(month) != 7 {
		month = ""
	}
	q := `select t.id, t.date::text, t.project, t.hours, t.overtime_hours, t.description, t.status, u.full_name, t.decided_at from timesheets t join users u on u.id=t.user_id where t.user_id=$1`
	args := []any{uid}
	if month != "" {
		q += ` and to_char(t.date,'YYYY-MM')=$2 order by t.date desc`
		args = append(args, month)
	} else {
		q += ` order by t.date desc limit 60`
	}
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	middleware.WriteJSON(w, 200, scanTimesheets(rows))
}

// GET /api/v1/timesheets/team?month= (leave.manage; spv = tim sendiri)
// POST /api/v1/timesheets/{id}/approve|reject { } (leave.manage)
func TimesheetsTeam(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	uid, role := "", ""
	if c != nil {
		uid = c.UserID
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&role)
		if role == "" {
			role = c.Role
		}
	}
	month := r.URL.Query().Get("month")
	if len(month) != 7 {
		month = ""
	}
	q := `select t.id, t.date::text, t.project, t.hours, t.overtime_hours, t.description, t.status, u.full_name, t.decided_at from timesheets t join users u on u.id=t.user_id`
	var args []any
	nextParam := 1
	if strings.ToLower(role) == "spv" {
		q += ` where (t.user_id=$1 or exists (select 1 from users x where x.id=t.user_id and x.supervisor_id=$1))`
		args = append(args, uid)
		nextParam = 2
	} else {
		q += ` where 1=1`
	}
	if month != "" {
		q += ` and to_char(t.date,'YYYY-MM')=$` + fmt.Sprintf("%d", nextParam) + ` order by t.date desc`
		args = append(args, month)
	} else {
		q += ` order by t.date desc limit 100`
	}
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	middleware.WriteJSON(w, 200, scanTimesheets(rows))
}

func scanTimesheets(rows interface {
	Next() bool
	Scan(...any) error
}) []map[string]any {
	out := []map[string]any{}
	for rows.Next() {
		var id, date, project, desc, status, name string
		var hours, ot float64
		var decided *string
		_ = rows.Scan(&id, &date, &project, &hours, &ot, &desc, &status, &name, &decided)
		out = append(out, map[string]any{"id": id, "date": date, "project": project, "hours": hours, "overtime_hours": ot, "description": desc, "status": status, "user_name": name, "decided_at": decided})
	}
	return out
}

// POST /api/v1/timesheets/{id}/approve|reject (leave.manage; spv = tim sendiri)
func TimesheetDecide(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	p := r.URL.Path
	approve := strings.HasSuffix(p, "/approve")
	marker := "/timesheets/"
	i := indexOf(p, marker)
	rest := p[i+len(marker):]
	id := rest
	for j, ch := range rest {
		if ch == '/' {
			id = rest[:j]
			break
		}
	}
	status := "rejected"
	if approve {
		status = "approved"
	}
	if c != nil {
		var role string
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, c.UserID).Scan(&role)
		if role == "" {
			role = c.Role
		}
		if strings.ToLower(role) == "spv" {
			var n int
			_ = pool.QueryRow(r.Context(), `select count(*) from timesheets t join users u on u.id=t.user_id where t.id=$1 and (t.user_id=$2 or u.supervisor_id=$2)`, id, c.UserID).Scan(&n)
			if n == 0 {
				middleware.WriteErr(w, 403, "FORBIDDEN", "Hanya tim sendiri")
				return
			}
		}
	}
	_, _ = pool.Exec(r.Context(), `update timesheets set status=$1, approver_id=$2, decided_at=now() where id=$3`, status, c.UserID, id)
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}
