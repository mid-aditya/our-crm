package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"crm-backend/internal/middleware"
)

// MenuKeys adalah daftar menu yang bisa di-grant per role (href tanpa slash awal).
var MenuKeys = []string{
	"dashboard", "livechat", "conversations", "sales", "companies", "campaigns",
	"tickets", "contacts", "reports", "settings", "attendance", "kanban",
	"organization", "productivity",
}

// DefaultRoleMenus: agent operasional dasar, spv + laporan & tiket & org.
var DefaultRoleMenus = map[string][]string{
	"agent": {"dashboard", "livechat", "conversations", "sales", "kanban", "contacts", "attendance"},
	"spv":   {"dashboard", "livechat", "conversations", "sales", "kanban", "contacts", "attendance", "reports", "tickets", "organization", "productivity"},
}

// GET /api/v1/menu-grants -> menu milik saya (untuk sidebar).
// Respons: {"role": "agent"|"admin"|..., "menus": [...]}.
// Developer & Admin selalu dapat semua menu; Agent/SPV mengikuti role_menu_grants.
func MyMenus(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	claims := middleware.Claims(r)

	roleName := ""
	if claims != nil {
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id = u.role_id where u.id=$1`, claims.UserID).Scan(&roleName)
	}
	// Role JWT demo juga membawa label ("agent"/"admin"); fallback bila join gagal.
	roleLabel := ""
	if claims != nil {
		if m, ok := claimsExtraRole(r); ok {
			roleLabel = m
		}
	}
	lower := roleName
	if lower == "" {
		lower = roleLabel
	}
	lower = strings.ToLower(lower)
	switch lower {
	case "agent", "spv":
		middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": queryRoleMenus(r.Context(), pool, lower)})
		return
	default:
		middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": MenuKeys})
		return
	}
}

// queryRoleMenus: baca grant per role; bila kosong (tenant lama) pakai default.
func queryRoleMenus(ctx context.Context, pool *pgxpool.Pool, role string) []string {
	rows, err := pool.Query(ctx, `select menu_key from role_menu_grants where role_key=$1`, role)
	if err != nil {
		return append([]string{}, DefaultRoleMenus[role]...)
	}
	defer rows.Close()
	menus := []string{}
	for rows.Next() {
		var k string
		_ = rows.Scan(&k)
		menus = append(menus, k)
	}
	if len(menus) == 0 {
		return append([]string{}, DefaultRoleMenus[role]...)
	}
	return menus
}

// GET /api/v1/roles/{role}/menus, PUT /api/v1/roles/{role}/menus {menus: []}
// (admin/developer: atur akses sidebar per role agent/spv).
func RoleMenus(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	role := roleFromPath(r.URL.Path)
	if role != "agent" && role != "spv" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "role harus agent/spv")
		return
	}

	if r.Method == "GET" {
		middleware.WriteJSON(w, 200, map[string]any{"menus": queryRoleMenus(r.Context(), pool, role)})
		return
	}

	// PUT
	var in struct {
		Menus []string `json:"menus"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Menus == nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "menus wajib array")
		return
	}
	allowed := map[string]bool{}
	for _, k := range MenuKeys {
		allowed[k] = true
	}
	_, _ = pool.Exec(r.Context(), `create table if not exists role_menu_grants (role_key text not null, menu_key text not null, granted_at timestamptz not null default now(), primary key (role_key, menu_key))`)
	_, _ = pool.Exec(r.Context(), `delete from role_menu_grants where role_key=$1`, role)
	for _, k := range in.Menus {
		if allowed[k] {
			_, _ = pool.Exec(r.Context(), `insert into role_menu_grants (role_key, menu_key) values ($1,$2) on conflict do nothing`, role, k)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

func roleFromPath(p string) string {
	const marker = "/roles/"
	i := indexOf(p, marker)
	if i < 0 {
		return ""
	}
	rest := p[i+len(marker):]
	id := rest
	for j, ch := range rest {
		if ch == '/' {
			id = rest[:j]
			break
		}
	}
	return strings.ToLower(id)
}

// claimsExtraRole membaca label role dari JWT bila ada (demo-login menyertakan "role").
func claimsExtraRole(r *http.Request) (string, bool) {
	c := middleware.Claims(r)
	if c == nil {
		return "", false
	}
	return c.Role, c.Role != ""
}
