package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ---- Operational hours (setup oleh admin) ----

type hourRow struct {
	Day      int     `json:"day_of_week"`
	Open     *string `json:"open_time"`
	Close    *string `json:"close_time"`
	IsClosed bool    `json:"is_closed"`
}

// GET /api/v1/settings/operational-hours (semua user login, untuk badge widget/agent)
func GetOperationalHours(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select day_of_week, open_time::text, close_time::text, is_closed from operational_hours order by day_of_week`)
	if err != nil {
		middleware.WriteJSON(w, 200, []hourRow{})
		return
	}
	defer rows.Close()
	out := []hourRow{}
	for rows.Next() {
		var h hourRow
		_ = rows.Scan(&h.Day, &h.Open, &h.Close, &h.IsClosed)
		out = append(out, h)
	}
	middleware.WriteJSON(w, 200, out)
}

// PUT /api/v1/settings/operational-hours {hours: [{day_of_week, open_time, close_time, is_closed}]}
func PutOperationalHours(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	var in struct {
		Hours []hourRow `json:"hours"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Hours == nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "hours wajib array")
		return
	}
	for _, h := range in.Hours {
		if h.Day < 0 || h.Day > 6 {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "day_of_week 0-6")
			return
		}
		_, _ = pool.Exec(r.Context(), `insert into operational_hours (day_of_week, open_time, close_time, is_closed) values ($1,$2::time,$3::time,$4) on conflict (day_of_week) do update set open_time=excluded.open_time, close_time=excluded.close_time, is_closed=excluded.is_closed`, h.Day, h.Open, h.Close, h.IsClosed)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// IsOpenNow true bila jam operasional sedang buka (zona Asia/Jakarta).
// Bila tabel kosong/belum di-setup → anggap buka (fail-open agar operasional lama tidak mati).
func IsOpenNow(ctx context.Context, pool *pgxpool.Pool) bool {
	return isOpenAt(time.Now(), func(day int) (open, close *string, closed bool, ok bool) {
		var o, c *string
		var cl bool
		err := pool.QueryRow(ctx, `select open_time::text, close_time::text, is_closed from operational_hours where day_of_week=$1`, day).Scan(&o, &c, &cl)
		if err != nil {
			return nil, nil, false, false
		}
		return o, c, cl, true
	})
}

func isOpenAt(now time.Time, query func(day int) (open, close *string, closed bool, ok bool)) bool {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	n := now.In(loc)
	dow := int(n.Weekday())
	open, close, closed, ok := query(dow)
	if !ok || closed || open == nil || close == nil {
		return false
	}
	cur := n.Format("15:04")
	return cur >= *open && cur <= *close
}

// ---- Presence / aux agent ----

// GET /api/v1/livechat/presence (status saya)
func GetMyPresence(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	var status string
	var label *string
	var updated time.Time
	err := pool.QueryRow(r.Context(), `select status, aux_label, updated_at from agent_presence where user_id=$1`, uid).Scan(&status, &label, &updated)
	if err != nil {
		middleware.WriteJSON(w, 200, map[string]any{"status": "offline", "aux_label": nil})
		return
	}
	middleware.WriteJSON(w, 200, map[string]any{"status": status, "aux_label": label, "updated_at": updated})
}

// PUT /api/v1/livechat/presence {status: online|aux|break|offline, aux_label?}
func PutMyPresence(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	var in struct {
		Status   string  `json:"status"`
		AuxLabel *string `json:"aux_label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	switch in.Status {
	case "online", "aux", "break", "offline":
	default:
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status: online|aux|break|offline")
		return
	}
	_, _ = pool.Exec(r.Context(), `insert into agent_presence (user_id, status, aux_label) values ($1,$2,$3) on conflict (user_id) do update set status=excluded.status, aux_label=excluded.aux_label, updated_at=now()`, uid, in.Status, in.AuxLabel)
	middleware.WriteJSON(w, 200, map[string]any{"status": in.Status, "aux_label": in.AuxLabel})
}

// GET /api/v1/livechat/presences (SPV+: lihat status semua agent)
func ListPresences(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select u.id, u.full_name, coalesce(p.status,'offline'), p.aux_label from users u left join agent_presence p on p.user_id=u.id where u.status='active' order by u.full_name`)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat presence")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name, status string
		var label *string
		_ = rows.Scan(&id, &name, &status, &label)
		out = append(out, map[string]any{"user_id": id, "full_name": name, "status": status, "aux_label": label})
	}
	middleware.WriteJSON(w, 200, out)
}

// ---- Leave types & requests ----

// GET /api/v1/leave-types, POST /api/v1/leave-types {name}
func LeaveTypes(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into leave_types (name) values ($1) on conflict (name) do update set active=true returning id`, in.Name).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select id, name, active from leave_types where active=true order by name`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var active bool
		_ = rows.Scan(&id, &name, &active)
		out = append(out, map[string]any{"id": id, "name": name, "active": active})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/leaves (mine; ?all=1 untuk SPV+), POST /api/v1/leaves
func Leaves(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	if r.Method == "POST" {
		var in struct {
			LeaveTypeID string `json:"leave_type_id"`
			StartDate   string `json:"start_date"`
			EndDate     string `json:"end_date"`
			Reason      string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.LeaveTypeID == "" || in.StartDate == "" || in.EndDate == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "leave_type_id, start_date, end_date wajib")
			return
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into leave_requests (user_id, leave_type_id, start_date, end_date, reason) values ($1,$2,$3::date,$4::date,$5) returning id`, uid, in.LeaveTypeID, in.StartDate, in.EndDate, in.Reason).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengajukan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	all := r.URL.Query().Get("all") == "1"
	q := `select lr.id, lr.user_id, u.full_name, lt.name, lr.start_date::text, lr.end_date::text, lr.reason, lr.status, lr.decided_at from leave_requests lr join users u on u.id=lr.user_id left join leave_types lt on lt.id=lr.leave_type_id`
	if all {
		rows, err := pool.Query(r.Context(), q+` order by lr.created_at desc limit 100`)
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat")
			return
		}
		defer rows.Close()
		middleware.WriteJSON(w, 200, scanLeaves(rows))
		return
	}
	rows, err := pool.Query(r.Context(), q+` where lr.user_id=$1 order by lr.created_at desc limit 50`, uid)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat")
		return
	}
	defer rows.Close()
	middleware.WriteJSON(w, 200, scanLeaves(rows))
}

func scanLeaves(rows pgx.Rows) []map[string]any {
	out := []map[string]any{}
	for rows.Next() {
		var id, userID, name, status string
		var leaveName, start, end, reason *string
		var decided *time.Time
		_ = rows.Scan(&id, &userID, &name, &leaveName, &start, &end, &reason, &status, &decided)
		out = append(out, map[string]any{"id": id, "user_id": userID, "full_name": name, "leave_type": leaveName, "start_date": start, "end_date": end, "reason": reason, "status": status, "decided_at": decided})
	}
	return out
}

// LeavesAll = daftar semua pengajuan (SPV+).
func LeavesAll(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	q.Set("all", "1")
	r.URL.RawQuery = q.Encode()
	Leaves(w, r)
}

func ApproveLeave(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	id := leaveID(r)
	var in struct {
		Status string `json:"status"` // approved|rejected
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || (in.Status != "approved" && in.Status != "rejected") {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "status: approved|rejected")
		return
	}
	var out string
	if err := pool.QueryRow(r.Context(), `update leave_requests set status=$1, approver_id=$2, decided_at=now() where id=$3 and status='pending' returning id`, in.Status, uid, id).Scan(&out); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Pengajuan tidak ada / sudah diproses")
		return
	}
	middleware.WriteJSON(w, 200, map[string]string{"id": out})
}

func leaveID(r *http.Request) string {
	p := r.URL.Path
	const marker = "/leaves/"
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

// ---- Attendance ----

// POST /api/v1/attendance/check-in, POST /api/v1/attendance/check-out
func AttendanceCheck(w http.ResponseWriter, r *http.Request, out bool) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	today := time.Now().Format("2006-01-02")
	if !out {
		_, _ = pool.Exec(r.Context(), `insert into attendance (user_id, date, check_in, status) values ($1,$2::date,now(),'present') on conflict (user_id, date) do update set check_in=coalesce(attendance.check_in, now()), status='present'`, uid, today)
	} else {
		_, _ = pool.Exec(r.Context(), `insert into attendance (user_id, date, check_out, status) values ($1,$2::date,now(),'present') on conflict (user_id, date) do update set check_out=now()`, uid, today)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// GET /api/v1/attendance/mine, GET /api/v1/attendance?date=&all=1 (SPV+)
func AttendanceList(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	uid := middleware.Claims(r).UserID
	if r.URL.Query().Get("all") == "1" {
		date := r.URL.Query().Get("date")
		q := `select a.user_id, u.full_name, a.date::text, a.check_in, a.check_out, a.status,
			(select lt.name from leave_requests lr join leave_types lt on lt.id=lr.leave_type_id where lr.user_id=a.user_id and lr.status='approved' and a.date between lr.start_date and lr.end_date limit 1)
			from attendance a join users u on u.id=a.user_id`
		var r2 pgx.Rows
		var err error
		if date != "" {
			r2, err = pool.Query(r.Context(), q+` where a.date=$1::date order by a.check_in nulls last`, date)
		} else {
			r2, err = pool.Query(r.Context(), q+` order by a.date desc limit 100`)
		}
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat")
			return
		}
		defer r2.Close()
		middleware.WriteJSON(w, 200, scanAttendance(r2))
		return
	}
	r2, err := pool.Query(r.Context(), `select user_id, date::text, check_in, check_out, status,
		(select lt.name from leave_requests lr join leave_types lt on lt.id=lr.leave_type_id where lr.user_id=attendance.user_id and lr.status='approved' and attendance.date between lr.start_date and lr.end_date limit 1)
		from attendance where user_id=$1 order by date desc limit 31`, uid)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat")
		return
	}
	defer r2.Close()
	out := []map[string]any{}
	for r2.Next() {
		var uid2, date, status string
		var in, out2 *time.Time
		var leave *string
		_ = r2.Scan(&uid2, &date, &in, &out2, &status, &leave)
		if leave != nil && *leave != "" {
			status = *leave
		}
		out = append(out, map[string]any{"date": date, "check_in": in, "check_out": out2, "status": status, "leave": leave})
	}
	middleware.WriteJSON(w, 200, out)
}

func scanAttendance(r2 pgx.Rows) []map[string]any {
	out := []map[string]any{}
	for r2.Next() {
		var uid, name, date, status string
		var in, out2 *time.Time
		var leave *string
		_ = r2.Scan(&uid, &name, &date, &in, &out2, &status, &leave)
		// Sakit/izin/cuti yang di-approve menutupi hari itu.
		if leave != nil && *leave != "" {
			status = *leave
		}
		out = append(out, map[string]any{"user_id": uid, "full_name": name, "date": date, "check_in": in, "check_out": out2, "status": status, "leave": leave})
	}
	return out
}

// ---- Activity logs ----

// GET /api/v1/activity-logs (butuh activity.read)
func ActivityLogs(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	limit, offset := middleware.Page(r)
	rows, err := pool.Query(r.Context(), `select id, user_id, user_name, role_name, method, path, status_code, ip, created_at from activity_logs order by created_at desc limit $1 offset $2`, limit, offset)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, method, path string
		var uid, uname, rname, ip *string
		var code int
		var created time.Time
		_ = rows.Scan(&id, &uid, &uname, &rname, &method, &path, &code, &ip, &created)
		out = append(out, map[string]any{"id": id, "user_id": uid, "user_name": uname, "role_name": rname, "method": method, "path": path, "status_code": code, "ip": ip, "created_at": created})
	}
	var total int
	_ = pool.QueryRow(r.Context(), `select count(*) from activity_logs`).Scan(&total)
	middleware.WritePage(w, 200, out, middleware.PageMeta(limit, offset, total))
}
