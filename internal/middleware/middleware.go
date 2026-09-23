package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"crm-backend/internal/app"
	"crm-backend/internal/auth"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ctxKey string

const (
	ctxClaims ctxKey = "claims"
	ctxTenant ctxKey = "tenant"
	ctxApp    ctxKey = "app"
)

func WithApp(a *app.App, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxApp, a)))
	})
}

func AppFrom(r *http.Request) *app.App { return r.Context().Value(ctxApp).(*app.App) }

type apiErr struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func WriteErr(w http.ResponseWriter, status int, code, msg string) {
	var e apiErr
	e.Error.Code = code
	e.Error.Message = msg
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(e)
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"data": v})
}

func WriteOK(w http.ResponseWriter, v any) { WriteJSON(w, 200, v) }

// WritePage envelope list + meta pagination: {"data": [...], "meta": {...}}.
func WritePage(w http.ResponseWriter, status int, v any, meta any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"data": v, "meta": meta})
}

// Authenticate verifikasi JWT access token.
func Authenticate(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		tok := strings.TrimPrefix(h, "Bearer ")
		if h == "" || tok == h {
			WriteErr(w, 401, "UNAUTHENTICATED", "Token tidak valid")
			return
		}
		c, err := auth.ParseAccess(secret, tok)
		if err != nil {
			WriteErr(w, 401, "UNAUTHENTICATED", "Token tidak valid")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxClaims, c)))
	})
}

func Claims(r *http.Request) *auth.AccessClaims {
	c, _ := r.Context().Value(ctxClaims).(*auth.AccessClaims)
	return c
}

// TenantResolver: company_id HANYA dari JWT terverifikasi.
func TenantResolver(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := Claims(r)
		if c == nil || c.CompanyID == "" {
			WriteErr(w, 401, "TENANT_MISSING", "company_id tidak ada di token")
			return
		}
		a := AppFrom(r)
		pool, err := a.TenantPool(r.Context(), c.CompanyID)
		if err != nil {
			if se, ok := err.(*app.StatusError); ok {
				WriteErr(w, se.Code, "COMPANY_NOT_ACTIVE", se.Msg)
				return
			}
			WriteErr(w, 500, "TENANT_ERROR", "Gagal resolve tenant")
			return
		}
		ctx := context.WithValue(r.Context(), ctxTenant, pool)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func Tenant(r *http.Request) *pgxpool.Pool {
	p, _ := r.Context().Value(ctxTenant).(*pgxpool.Pool)
	return p
}

// RBACGuard cek permission user dari tenant DB.
func RBACGuard(perm string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := Claims(r)
		pool := Tenant(r)
		if c == nil || pool == nil {
			WriteErr(w, 401, "UNAUTHENTICATED", "Login dulu")
			return
		}
		var roleID *string
		var status string
		err := pool.QueryRow(r.Context(), `select role_id, status from users where id=$1`, c.UserID).Scan(&roleID, &status)
		if err != nil || status != "active" || roleID == nil {
			WriteErr(w, 403, "FORBIDDEN", "User tidak aktif")
			return
		}
		var n int
		err = pool.QueryRow(r.Context(), `select count(*) from role_permissions rp join permissions p on p.id=rp.permission_id where rp.role_id=$1 and p.key=$2`, *roleID, perm).Scan(&n)
		if err != nil || n == 0 {
			WriteErr(w, 403, "FORBIDDEN", "Perlu permission "+perm)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// CORS ketat (whitelist, bukan wildcard).
func CORS(origins string, next http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, o := range strings.Split(origins, ",") {
		allowed[strings.TrimSpace(o)] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		o := r.Header.Get("Origin")
		if allowed[o] {
			w.Header().Set("Access-Control-Allow-Origin", o)
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Company-Id")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		}
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
