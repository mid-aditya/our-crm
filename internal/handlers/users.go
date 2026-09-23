package handlers

import (
	"encoding/json"
	"net/http"

	"crm-backend/internal/auth"
	"crm-backend/internal/middleware"
)

// GET /api/v1/users, POST /api/v1/users/invite, PATCH /api/v1/users/{id}/role
func Users(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	switch r.Method {
	case "GET":
		rows, err := pool.Query(r.Context(), `select id, email, full_name, role_id, status from users order by created_at limit 100`)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, email, name, status string
			var role *string
			_ = rows.Scan(&id, &email, &name, &role, &status)
			out = append(out, map[string]any{"id": id, "email": email, "full_name": name, "role_id": role, "status": status})
		}
		middleware.WriteJSON(w, 200, out)
	case "POST": // invite
		var in struct {
			Email    string `json:"email"`
			FullName string `json:"full_name"`
			RoleID   string `json:"role_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Email == "" || in.FullName == "" || in.RoleID == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "email, full_name, role_id wajib")
			return
		}
		hash, _ := auth.HashPassword("invited-" + in.Email)
		var id string
		err := pool.QueryRow(r.Context(), `insert into users (email, full_name, role_id, status, password_hash) values ($1,$2,$3,'invited',$4) returning id`, in.Email, in.FullName, in.RoleID, hash).Scan(&id)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
	default:
		middleware.WriteErr(w, 405, "METHOD_NOT_ALLOWED", "Metode tidak didukung")
	}
}

func UserRole(w http.ResponseWriter, r *http.Request) {
	// PATCH /api/v1/users/{id}/role
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
		RoleID string `json:"role_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.RoleID == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "role_id wajib")
		return
	}
	var outID string
	if err := pool.QueryRow(r.Context(), `update users set role_id=$1, updated_at=now() where id=$2 returning id`, in.RoleID, id).Scan(&outID); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "User tidak ada")
		return
	}
	middleware.WriteJSON(w, 200, map[string]string{"id": outID})
}

// GET /api/v1/roles, PUT /api/v1/roles/{id}/permissions
func Roles(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "GET" {
		rrows, err := pool.Query(r.Context(), `select id, name, is_system_role from roles`)
		if err != nil {
			middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
			return
		}
		defer rrows.Close()
		out := []map[string]any{}
		for rrows.Next() {
			var id, name string
			var sys bool
			_ = rrows.Scan(&id, &name, &sys)
			prows, _ := pool.Query(r.Context(), `select p.key from role_permissions rp join permissions p on p.id=rp.permission_id where rp.role_id=$1`, id)
			perms := []string{}
			if prows != nil {
				for prows.Next() {
					var k string
					_ = prows.Scan(&k)
					perms = append(perms, k)
				}
				prows.Close()
			}
			out = append(out, map[string]any{"id": id, "name": name, "is_system_role": sys, "permissions": perms})
		}
		middleware.WriteJSON(w, 200, out)
		return
	}
	// PUT /roles/{id}/permissions {permission_keys: []}
	p := r.URL.Path
	const marker = "/roles/"
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
		Keys []string `json:"permission_keys"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Keys == nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "permission_keys wajib array")
		return
	}
	var name string
	var sys bool
	if err := pool.QueryRow(r.Context(), `select name, is_system_role from roles where id=$1`, id).Scan(&name, &sys); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Role tidak ada")
		return
	}
	if sys && name == "Owner" {
		middleware.WriteErr(w, 400, "PROTECTED_ROLE", "Role Owner tidak bisa diubah")
		return
	}
	_, _ = pool.Exec(r.Context(), `delete from role_permissions where role_id=$1`, id)
	for _, k := range in.Keys {
		var pid string
		if err := pool.QueryRow(r.Context(), `select id from permissions where key=$1`, k).Scan(&pid); err == nil {
			_, _ = pool.Exec(r.Context(), `insert into role_permissions (role_id, permission_id) values ($1,$2) on conflict do nothing`, id, pid)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}
