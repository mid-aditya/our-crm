package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"crm-backend/internal/middleware"
)

// ListAdminCompanies returns all companies (platform admin only)
func AdminCompanies(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)

	args := []interface{}{}
	where := ""
	if status := r.URL.Query().Get("status"); status != "" {
		where += fmt.Sprintf(" AND c.status = $%d", len(args)+1)
		args = append(args, status)
	}
	if search := r.URL.Query().Get("search"); search != "" {
		where += fmt.Sprintf(" AND (c.name ILIKE $%d OR c.slug ILIKE $%d)", len(args)+1, len(args)+2)
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	offset := 0
	if p := r.URL.Query().Get("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			offset = (n - 1) * limit
		}
	}

	query := fmt.Sprintf(`
		SELECT c.id, c.name, c.slug, c.status, c.plan_id,
			   (SELECT COUNT(*) FROM company_user_index cui WHERE cui.company_id = c.id) as user_count,
			   c.created_at, c.updated_at
		FROM companies c
		WHERE 1=1%s
		ORDER BY c.created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := a.Master.Query(r.Context(), query, args...)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal mengambil companies: "+err.Error())
		return
	}
	defer rows.Close()

	companies := []map[string]interface{}{}
	for rows.Next() {
		var id, name, slug, status string
		var planID *string
		var userCount int
		var createdAt, updatedAt time.Time
		rows.Scan(&id, &name, &slug, &status, &planID, &userCount, &createdAt, &updatedAt)
		companies = append(companies, map[string]interface{}{
			"id": id, "name": name, "slug": slug, "status": status,
			"plan_id": planID, "user_count": userCount,
			"created_at": createdAt, "updated_at": updatedAt,
		})
	}

	var total int
	countQuery := `SELECT COUNT(*) FROM companies WHERE 1=1` + where
	countArgs := args[:len(args)-2]
	a.Master.QueryRow(r.Context(), countQuery, countArgs...).Scan(&total)

	middleware.WritePage(w, 200, companies, middleware.PageMeta(limit, offset, total))
}

// CreateAdminCompany creates a new company (platform admin)
func CreateAdminCompany(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)

	var in struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" || in.Slug == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name & slug wajib")
		return
	}

	companyID := generateUUID()
	dbName := "crm_" + in.Slug

	_, err := a.Master.Exec(r.Context(), `
		INSERT INTO companies (id, name, slug, status, db_host, db_port, db_name, db_user, db_pass_encrypted)
		VALUES ($1, $2, $3, 'active', 'localhost', 5432, $4, 'postgres', '')
		ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, status='active'
		RETURNING id`,
		companyID, in.Name, in.Slug, dbName)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal membuat company: "+err.Error())
		return
	}

	middleware.WriteJSON(w, 201, map[string]string{
		"id": companyID, "name": in.Name, "slug": in.Slug, "status": "active",
	})
}

// GetAdminCompany returns a single company
func GetAdminCompany(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	id := extractPathID(r.URL.Path, "/api/v1/admin/companies/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "company id required")
		return
	}

	var name, slug, status string
	var planID *string
	var createdAt, updatedAt time.Time
	err := a.Master.QueryRow(r.Context(), `
		SELECT name, slug, status, plan_id, created_at, updated_at
		FROM companies WHERE id=$1`, id).
		Scan(&name, &slug, &status, &planID, &createdAt, &updatedAt)
	if err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Company tidak ditemukan")
		return
	}

	var userCount int
	a.Master.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM company_user_index WHERE company_id=$1`, id).Scan(&userCount)

	middleware.WriteOK(w, map[string]interface{}{
		"id": id, "name": name, "slug": slug, "status": status,
		"plan_id": planID, "user_count": userCount,
		"created_at": createdAt, "updated_at": updatedAt,
	})
}

// UpdateAdminCompany updates a company
func UpdateAdminCompany(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	id := extractPathID(r.URL.Path, "/api/v1/admin/companies/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "company id required")
		return
	}

	var in struct {
		Name   string `json:"name"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "INVALID_REQUEST", "Invalid body")
		return
	}

	if in.Name != "" {
		_, err := a.Master.Exec(r.Context(),
			`UPDATE companies SET name=$2, updated_at=now() WHERE id=$1`, id, in.Name)
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal update company")
			return
		}
	}

	if in.Status != "" {
		_, err := a.Master.Exec(r.Context(),
			`UPDATE companies SET status=$2, updated_at=now() WHERE id=$1`, id, in.Status)
		if err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal update status company")
			return
		}
	}

	middleware.WriteOK(w, map[string]string{"status": "ok"})
}

// DeleteAdminCompany cancels a company
func DeleteAdminCompany(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	id := extractPathID(r.URL.Path, "/api/v1/admin/companies/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "company id required")
		return
	}

	_, err := a.Master.Exec(r.Context(),
		`UPDATE companies SET status='cancelled', updated_at=now() WHERE id=$1`, id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal hapus company")
		return
	}

	middleware.WriteOK(w, map[string]string{"status": "cancelled"})
}

// --- Helpers ---

func extractPathID(path, prefix string) string {
	if len(path) <= len(prefix) {
		return ""
	}
	return path[len(prefix):]
}

func generateUUID() string {
	return fmt.Sprintf("00000000-0000-0000-0000-%012x", time.Now().UnixNano()%1e12)
}

func uuidParam(id string) interface{} {
	return id
}
