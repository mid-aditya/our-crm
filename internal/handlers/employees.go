package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"crm-backend/internal/middleware"
)

// Employee & organization: departments + profil karyawan.
// Guard: team.manage (SPV/Admin/Developer). Scope: spv = diri + tim.

// GET /api/v1/departments, POST /api/v1/departments {name, head_id?}
func Departments(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Name   string `json:"name"`
			HeadID string `json:"head_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		var id string
		var head *string
		if in.HeadID != "" {
			head = &in.HeadID
		}
		if err := pool.QueryRow(r.Context(), `insert into departments (name, head_id) values ($1,$2) returning id`, strings.TrimSpace(in.Name), head).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan departemen")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select d.id, d.name, d.head_id, u.full_name, (select count(*) from users x where x.department_id=d.id and x.status='active') from departments d left join users u on u.id=d.head_id order by d.name`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var headID, headName *string
		var members int
		_ = rows.Scan(&id, &name, &headID, &headName, &members)
		out = append(out, map[string]any{"id": id, "name": name, "head_id": headID, "head_name": headName, "members": members})
	}
	middleware.WriteJSON(w, 200, out)
}

// PATCH /api/v1/departments/{id} {name?, head_id?}, DELETE /api/v1/departments/{id}
func DepartmentDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := lastPathSegment(r.URL.Path, "/departments/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID tidak valid")
		return
	}
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from departments where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["name"].(string); ok && strings.TrimSpace(v) != "" {
		_, _ = pool.Exec(r.Context(), `update departments set name=$1 where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["head_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" {
			_, _ = pool.Exec(r.Context(), `update departments set head_id=$1 where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update departments set head_id=null where id=$1`, id)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// GET /api/v1/employees — daftar karyawan (scope per role).
func Employees(w http.ResponseWriter, r *http.Request) {
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
	q := `select u.id, u.email, u.full_name, coalesce(r.name,''), u.status, u.supervisor_id, s.full_name, u.nik, u.position, u.department_id, d.name, u.join_date::text, u.phone from users u left join roles r on r.id=u.role_id left join users s on s.id=u.supervisor_id left join departments d on d.id=u.department_id`
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
		var supID, supName, nik, pos, deptID, deptName, joinDate, phone *string
		_ = rows.Scan(&id, &email, &name, &roleName, &status, &supID, &supName, &nik, &pos, &deptID, &deptName, &joinDate, &phone)
		out = append(out, map[string]any{
			"id": id, "email": email, "full_name": name, "role": roleName, "status": status,
			"supervisor_id": supID, "supervisor_name": supName, "nik": nik, "position": pos,
			"department_id": deptID, "department_name": deptName, "join_date": joinDate, "phone": phone,
		})
	}
	middleware.WriteJSON(w, 200, out)
}

// PATCH /api/v1/employees/{id} {nik?, position?, department_id?, join_date?, phone?, supervisor_id?}
// SPV hanya boleh ubah diri sendiri / tim langsung.
func EmployeeDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	id := lastPathSegment(r.URL.Path, "/employees/")
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
		if strings.ToLower(role) == "spv" && id != c.UserID {
			var n int
			_ = pool.QueryRow(r.Context(), `select count(*) from users where id=$1 and supervisor_id=$2`, id, c.UserID).Scan(&n)
			if n == 0 {
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
	if v, ok := raw["nik"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update users set nik=$1, updated_at=now() where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["position"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update users set position=$1, updated_at=now() where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["phone"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update users set phone=$1, updated_at=now() where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["join_date"].(string); ok {
		if strings.TrimSpace(v) == "" {
			_, _ = pool.Exec(r.Context(), `update users set join_date=null, updated_at=now() where id=$1`, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update users set join_date=$1::date, updated_at=now() where id=$2`, strings.TrimSpace(v), id)
		}
	}
	if v, ok := raw["department_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" {
			_, _ = pool.Exec(r.Context(), `update users set department_id=$1, updated_at=now() where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update users set department_id=null, updated_at=now() where id=$1`, id)
		}
	}
	if v, ok := raw["supervisor_id"]; ok {
		if s, isStr := v.(string); isStr && s != "" && s != id {
			_, _ = pool.Exec(r.Context(), `update users set supervisor_id=$1, updated_at=now() where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update users set supervisor_id=null, updated_at=now() where id=$1`, id)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}
