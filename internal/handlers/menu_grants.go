package handlers

import (
	"encoding/json"
	"net/http"

	"crm-backend/internal/middleware"
)

// MenuKeys adalah daftar menu yang bisa di-grant ke agent (href tanpa slash awal).
var MenuKeys = []string{
	"dashboard", "conversations", "companies", "campaigns",
	"tickets", "contacts", "reports", "settings", "attendance", "kanban",
}

// GET /api/v1/menu-grants -> menu milik saya (untuk sidebar agent).
// Respons: {"role": "agent"|"admin"|..., "menus": [...]}.
// Developer & Admin selalu dapat semua menu; Agent hanya yang di-grant.
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
	switch lower {
	case "Agent", "agent":
		// lanjut ke grants
	case "SPV", "Spv", "spv":
		// SPV setingkat di atas agent: full menu operasional kecuali settings sensitif.
		menus := []string{}
		for _, k := range MenuKeys {
			if k != "settings" {
				menus = append(menus, k)
			}
		}
		middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": menus})
		return
	default:
		middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": MenuKeys})
		return
	}

	rows, err := pool.Query(r.Context(), `select menu_key from menu_grants where user_id=$1`, claims.UserID)
	if err != nil {
		// tabel belum ada di tenant lama → anggap kosong
		middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": []string{}})
		return
	}
	defer rows.Close()
	menus := []string{}
	for rows.Next() {
		var k string
		_ = rows.Scan(&k)
		menus = append(menus, k)
	}
	middleware.WriteJSON(w, 200, map[string]any{"role": lower, "menus": menus})
}

// GET /api/v1/users/{id}/menus, PUT /api/v1/users/{id}/menus {menus: []}
// (admin/developer: approve menu untuk agent).
func UserMenus(w http.ResponseWriter, r *http.Request) {
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

	if r.Method == "GET" {
		rows, err := pool.Query(r.Context(), `select menu_key from menu_grants where user_id=$1`, id)
		if err != nil {
			middleware.WriteJSON(w, 200, map[string]any{"menus": []string{}})
			return
		}
		defer rows.Close()
		menus := []string{}
		for rows.Next() {
			var k string
			_ = rows.Scan(&k)
			menus = append(menus, k)
		}
		middleware.WriteJSON(w, 200, map[string]any{"menus": menus})
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
	_, _ = pool.Exec(r.Context(), `create table if not exists menu_grants (user_id uuid not null, menu_key text not null, granted_at timestamptz not null default now(), primary key (user_id, menu_key))`)
	_, _ = pool.Exec(r.Context(), `delete from menu_grants where user_id=$1`, id)
	for _, k := range in.Menus {
		if allowed[k] {
			_, _ = pool.Exec(r.Context(), `insert into menu_grants (user_id, menu_key) values ($1,$2) on conflict do nothing`, id, k)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// claimsExtraRole membaca label role dari JWT bila ada (demo-login menyertakan "role").
func claimsExtraRole(r *http.Request) (string, bool) {
	c := middleware.Claims(r)
	if c == nil {
		return "", false
	}
	return c.Role, c.Role != ""
}
