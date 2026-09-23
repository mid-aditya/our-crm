package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"

	"crm-backend/internal/middleware"
	"crm-backend/internal/provision"
)

// POST /api/v1/signup {company_name, slug, owner_name, owner_email, password}
// Sinkron di lokal: buat DB + migrasi + seed, return 201 + company_id.
func Signup(w http.ResponseWriter, r *http.Request) {
	a := middleware.AppFrom(r)
	var in struct {
		CompanyName string `json:"company_name"`
		Slug        string `json:"slug"`
		OwnerName   string `json:"owner_name"`
		OwnerEmail  string `json:"owner_email"`
		Password    string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	slugRe := regexp.MustCompile(`^[a-z0-9-]{2,}$`)
	if len(in.CompanyName) < 2 || !slugRe.MatchString(in.Slug) || len(in.OwnerName) < 2 || len(in.Password) < 8 || !validEmail(in.OwnerEmail) {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "company_name, slug, owner_name, owner_email valid & password min 8 wajib")
		return
	}
	host, port := "127.0.0.1", 5432
	if u, err := url.Parse(a.Cfg.MasterDSN); err == nil {
		if u.Hostname() != "" {
			host = u.Hostname()
		}
		if p := u.Port(); p != "" {
			var n int
			for _, ch := range p {
				n = n*10 + int(ch-'0')
			}
			if n > 0 {
				port = n
			}
		}
	}
	id, err := provision.Provision(r.Context(), a.Master, a.Cfg.MasterDSN, a.Cfg.TenantCredKey, host, port, provision.SignupInput{
		CompanyName: in.CompanyName, Slug: in.Slug, OwnerName: in.OwnerName, OwnerEmail: in.OwnerEmail, Password: in.Password,
	})
	if err != nil {
		middleware.WriteErr(w, 500, "PROVISION_FAILED", "Gagal menyiapkan akun: "+err.Error())
		return
	}
	middleware.WriteJSON(w, 201, map[string]string{"company_id": id, "status": "active"})
}

func validEmail(e string) bool {
	at := -1
	dot := -1
	for i, ch := range e {
		if ch == '@' {
			at = i
		}
		if ch == '.' {
			dot = i
		}
	}
	return at > 0 && dot > at+1 && dot < len(e)-1
}
