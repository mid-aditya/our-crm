package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"crm-backend/internal/auth"
	"crm-backend/internal/middleware"
)

// POST /api/v1/auth/login {email, password, company_id?}
func Login(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	var in struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		CompanyID string `json:"company_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || !strings.Contains(in.Email, "@") || in.Password == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "email & password wajib")
		return
	}
	email := strings.ToLower(in.Email)
	rows, err := a.Master.Query(r.Context(), `select company_id from company_user_index where email=$1`, email)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	var companyIDs []string
	for rows.Next() {
		var id string
		_ = rows.Scan(&id)
		companyIDs = append(companyIDs, id)
	}
	rows.Close()
	if len(companyIDs) == 0 {
		middleware.WriteErr(w, 401, "INVALID_CREDENTIALS", "Email atau password salah")
		return
	}
	if in.CompanyID == "" && len(companyIDs) > 1 {
		type item struct {
			CompanyID string `json:"company_id"`
		}
		items := make([]item, len(companyIDs))
		for i, id := range companyIDs {
			items[i] = item{CompanyID: id}
		}
		middleware.WriteJSON(w, 200, map[string]any{"requires_company_selection": true, "companies": items})
		return
	}
	target := in.CompanyID
	if target == "" {
		target = companyIDs[0]
	}
	allowed := false
	for _, id := range companyIDs {
		if id == target {
			allowed = true
		}
	}
	if !allowed {
		middleware.WriteErr(w, 401, "INVALID_CREDENTIALS", "Email atau password salah")
		return
	}
	pool, err := a.TenantPool(r.Context(), target)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	var u struct {
		ID, Email, Hash, RoleID, Status string
	}
	var roleID *string
	err = pool.QueryRow(r.Context(), `select id, email, password_hash, role_id, status from users where email=$1`, email).
		Scan(&u.ID, &u.Email, &u.Hash, &roleID, &u.Status)
	if err != nil || u.Status != "active" || !auth.VerifyPassword(u.Hash, in.Password) {
		middleware.WriteErr(w, 401, "INVALID_CREDENTIALS", "Email atau password salah")
		return
	}
	role := ""
	if roleID != nil {
		role = *roleID
	}
	access, err := auth.SignAccess(a.Cfg.JWTAccessSecret, u.ID, target, role, time.Duration(a.Cfg.JWTAccessTTLMinutes)*time.Minute)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	refresh, err := auth.NewRefreshToken()
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	_, err = pool.Exec(r.Context(), `insert into refresh_tokens (user_id, token_hash, expires_at) values ($1,$2, now() + interval '30 days')`, u.ID, auth.HashRefreshToken(refresh))
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	middleware.WriteJSON(w, 200, map[string]string{"access_token": access, "refresh_token": refresh})
}

// POST /api/v1/auth/refresh {refresh_token, company_id}
func Refresh(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	var in struct {
		RefreshToken string `json:"refresh_token"`
		CompanyID    string `json:"company_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.RefreshToken == "" || in.CompanyID == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "refresh_token & company_id wajib")
		return
	}
	pool, err := a.TenantPool(r.Context(), in.CompanyID)
	if err != nil {
		middleware.WriteErr(w, 401, "INVALID_REFRESH", "Refresh token tidak valid")
		return
	}
	var userID string
	var roleID *string
	err = pool.QueryRow(r.Context(), `select user_id from refresh_tokens where token_hash=$1 and revoked_at is null and expires_at > now()`, auth.HashRefreshToken(in.RefreshToken)).Scan(&userID)
	if err != nil {
		middleware.WriteErr(w, 401, "INVALID_REFRESH", "Refresh token tidak valid")
		return
	}
	_ = roleID
	_, _ = pool.Exec(r.Context(), `update refresh_tokens set revoked_at=now() where token_hash=$1`, auth.HashRefreshToken(in.RefreshToken))
	_ = pool.QueryRow(r.Context(), `select role_id from users where id=$1`, userID).Scan(&roleID)
	role := ""
	if roleID != nil {
		role = *roleID
	}
	access, _ := auth.SignAccess(a.Cfg.JWTAccessSecret, userID, in.CompanyID, role, time.Duration(a.Cfg.JWTAccessTTLMinutes)*time.Minute)
	next, _ := auth.NewRefreshToken()
	_, _ = pool.Exec(r.Context(), `insert into refresh_tokens (user_id, token_hash, expires_at) values ($1,$2, now() + interval '30 days')`, userID, auth.HashRefreshToken(next))
	middleware.WriteJSON(w, 200, map[string]string{"access_token": access, "refresh_token": next})
}

// POST /api/v1/auth/logout {refresh_token, company_id}
func Logout(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	var in struct {
		RefreshToken string `json:"refresh_token"`
		CompanyID    string `json:"company_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err == nil && in.RefreshToken != "" && in.CompanyID != "" {
		if pool, err := a.TenantPool(r.Context(), in.CompanyID); err == nil {
			_, _ = pool.Exec(r.Context(), `update refresh_tokens set revoked_at=now() where token_hash=$1`, auth.HashRefreshToken(in.RefreshToken))
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// POST /api/v1/auth/switch-company {email, password, company_id}
func SwitchCompany(w http.ResponseWriter, r *http.Request) {
	r2 := r.Clone(r.Context())
	// reuse login dengan company wajib
	var in struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		CompanyID string `json:"company_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.CompanyID == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "email, password, company_id wajib")
		return
	}
	_ = r2
	// validasi keanggotaan
	a := middleware.AppFrom(r)
	var n int
	_ = a.Master.QueryRow(r.Context(), `select count(*) from company_user_index where email=$1 and company_id=$2`, strings.ToLower(in.Email), in.CompanyID).Scan(&n)
	if n == 0 {
		middleware.WriteErr(w, 403, "FORBIDDEN", "Email tidak terdaftar di company ini")
		return
	}
	pool, err := a.TenantPool(r.Context(), in.CompanyID)
	if err != nil {
		middleware.WriteErr(w, 500, "INTERNAL_ERROR", "Terjadi kesalahan")
		return
	}
	var id, hash, status string
	var roleID *string
	err = pool.QueryRow(r.Context(), `select id, password_hash, status, role_id from users where email=$1`, strings.ToLower(in.Email)).Scan(&id, &hash, &status, &roleID)
	if err != nil || status != "active" || !auth.VerifyPassword(hash, in.Password) {
		middleware.WriteErr(w, 401, "INVALID_CREDENTIALS", "Email atau password salah")
		return
	}
	role := ""
	if roleID != nil {
		role = *roleID
	}
	access, _ := auth.SignAccess(a.Cfg.JWTAccessSecret, id, in.CompanyID, role, time.Duration(a.Cfg.JWTAccessTTLMinutes)*time.Minute)
	refresh, _ := auth.NewRefreshToken()
	_, _ = pool.Exec(r.Context(), `insert into refresh_tokens (user_id, token_hash, expires_at) values ($1,$2, now() + interval '30 days')`, id, auth.HashRefreshToken(refresh))
	middleware.WriteJSON(w, 200, map[string]string{"access_token": access, "refresh_token": refresh})
}
