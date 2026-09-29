package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"crm-backend/internal/middleware"
)

// Sales pipeline: sales_stages + deals + deal_moves.
// Scope: agent = deal milik sendiri; spv = milik sendiri + tim (supervisor);
// admin/developer/owner = semua.

// GET /api/v1/sales-stages, POST /api/v1/sales-stages {name, probability?}
func SalesStages(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Name        string `json:"name"`
			Probability int    `json:"probability"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		if in.Probability < 0 {
			in.Probability = 0
		}
		if in.Probability > 100 {
			in.Probability = 100
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into sales_stages (name, probability, position) values ($1,$2,(select coalesce(max(position),-1)+1 from sales_stages)) returning id`, strings.TrimSpace(in.Name), in.Probability).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan tahap")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select id, name, probability, position, is_won, is_lost, active from sales_stages where active=true order by position`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var prob, pos int
		var won, lost, active bool
		_ = rows.Scan(&id, &name, &prob, &pos, &won, &lost, &active)
		out = append(out, map[string]any{"id": id, "name": name, "probability": prob, "position": pos, "is_won": won, "is_lost": lost, "active": active})
	}
	middleware.WriteJSON(w, 200, out)
}

// PATCH /api/v1/sales-stages/{id} {name?, probability?, active?, position?}
// DELETE /api/v1/sales-stages/{id} (soft: active=false)
func SalesStageDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := lastPathSegment(r.URL.Path, "/sales-stages/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID tidak valid")
		return
	}
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `update sales_stages set active=false where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if v, ok := raw["name"].(string); ok && strings.TrimSpace(v) != "" {
		_, _ = pool.Exec(r.Context(), `update sales_stages set name=$1 where id=$2`, strings.TrimSpace(v), id)
	}
	if v, ok := raw["probability"].(float64); ok {
		p := int(v)
		if p < 0 {
			p = 0
		}
		if p > 100 {
			p = 100
		}
		_, _ = pool.Exec(r.Context(), `update sales_stages set probability=$1 where id=$2`, p, id)
	}
	if v, ok := raw["active"].(bool); ok {
		_, _ = pool.Exec(r.Context(), `update sales_stages set active=$1 where id=$2`, v, id)
	}
	if v, ok := raw["position"].(float64); ok {
		_, _ = pool.Exec(r.Context(), `update sales_stages set position=$1 where id=$2`, int(v), id)
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// ownerScope: agent → owner=me; spv → me + tim; lain → semua.
// (Diterapkan di handler Deals)

// GET /api/v1/deals?stage=&owner=me, POST /api/v1/deals
func Deals(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	role := ""
	uid := ""
	if c != nil {
		uid = c.UserID
		_ = pool.QueryRow(r.Context(), `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&role)
		if role == "" {
			role = c.Role
		}
	}
	lower := strings.ToLower(role)
	scope := ""
	args := []any{}
	if lower == "agent" {
		scope = ` where (d.owner_id=$1 or d.owner_id is null)`
		args = append(args, uid)
	} else if lower == "spv" {
		scope = ` where (d.owner_id=$1 or d.owner_id is null or exists (select 1 from users u where u.id=d.owner_id and u.supervisor_id=$1))`
		args = append(args, uid)
	}
	if r.Method == "POST" {
		var in struct {
			Title         string  `json:"title"`
			ContactID     string  `json:"contact_id"`
			Value         float64 `json:"value"`
			StageID       string  `json:"stage_id"`
			OwnerID       string  `json:"owner_id"`
			ExpectedClose string  `json:"expected_close"`
			Notes         string  `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Title) == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "title wajib")
			return
		}
		if in.Value < 0 {
			in.Value = 0
		}
		stageID := in.StageID
		if stageID == "" {
			_ = pool.QueryRow(r.Context(), `select id from sales_stages where active=true order by position limit 1`).Scan(&stageID)
		}
		owner := in.OwnerID
		if owner == "" || lower == "agent" {
			owner = uid
		}
		var contactID, expClose *string
		if in.ContactID != "" {
			contactID = &in.ContactID
		}
		if in.ExpectedClose != "" {
			expClose = &in.ExpectedClose
		}
		number := fmt.Sprintf("D-%d-%d", time.Now().Year(), time.Now().Unix()%1000000)
		var id string
		if err := pool.QueryRow(r.Context(), `insert into deals (number, title, contact_id, value, stage_id, owner_id, expected_close, notes) values ($1,$2,$3,$4,$5,$6,$7::date,$8) returning id`, number, strings.TrimSpace(in.Title), contactID, in.Value, nullStr(stageID), nullStr(owner), expClose, in.Notes).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal menyimpan deal")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id, "number": number})
		return
	}
	// GET
	stage := r.URL.Query().Get("stage")
	extra := ""
	if stage != "" {
		extra = fmt.Sprintf(` and d.stage_id=$%d`, len(args)+1)
		args = append(args, stage)
	}
	limit, offset := middleware.Page(r)
	q := `select d.id, d.number, d.title, d.contact_id, c.full_name, d.value, d.stage_id, s.name, s.probability, s.is_won, s.is_lost, d.owner_id, u.full_name, d.expected_close::text, d.notes, d.lost_reason, d.created_at from deals d left join contacts c on c.id=d.contact_id left join sales_stages s on s.id=d.stage_id left join users u on u.id=d.owner_id` + scope + extra + fmt.Sprintf(` order by d.updated_at desc limit $%d offset $%d`, len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	rows, err := pool.Query(r.Context(), q, args...)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, number, title string
		var contactID, contactName, stageID, stageName, ownerID, ownerName, expClose, notes, lost *string
		var value float64
		var prob int
		var won, lost2 bool
		var created time.Time
		_ = rows.Scan(&id, &number, &title, &contactID, &contactName, &value, &stageID, &stageName, &prob, &won, &lost2, &ownerID, &ownerName, &expClose, &notes, &lost, &created)
		out = append(out, map[string]any{
			"id": id, "number": number, "title": title, "contact_id": contactID, "contact_name": contactName,
			"value": value, "stage_id": stageID, "stage_name": stageName, "probability": prob,
			"is_won": won, "is_lost": lost2,
			"owner_id": ownerID, "owner_name": ownerName, "expected_close": expClose,
			"notes": notes, "lost_reason": lost, "created_at": created,
		})
	}
	middleware.WriteJSON(w, 200, out)
}

func lastPathSegment(p, marker string) string {
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

// GET /api/v1/deals/{id}, PATCH /api/v1/deals/{id}, DELETE /api/v1/deals/{id}
func DealDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := lastPathSegment(r.URL.Path, "/deals/")
	if id == "" {
		middleware.WriteErr(w, 400, "INVALID_ID", "ID tidak valid")
		return
	}
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from deals where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	if r.Method == "GET" {
		var d struct {
			ID, Number, Title         string
			ContactID, StageID, Owner *string
			Value                    float64
			ExpClose, Notes, Lost    *string
			Created                  time.Time
		}
		err := pool.QueryRow(r.Context(), `select id, number, title, contact_id, value, stage_id, owner_id, expected_close::text, notes, lost_reason, created_at from deals where id=$1`, id).
			Scan(&d.ID, &d.Number, &d.Title, &d.ContactID, &d.Value, &d.StageID, &d.Owner, &d.ExpClose, &d.Notes, &d.Lost, &d.Created)
		if err != nil {
			middleware.WriteErr(w, 404, "NOT_FOUND", "Deal tidak ada")
			return
		}
		mrows, _ := pool.Query(r.Context(), `select m.id, m.from_stage_id, m.to_stage_id, sf.name, st.name, u.full_name, m.created_at from deal_moves m left join sales_stages sf on sf.id=m.from_stage_id left join sales_stages st on st.id=m.to_stage_id left join users u on u.id=m.moved_by where m.deal_id=$1 order by m.created_at`, id)
		moves := []map[string]any{}
		if mrows != nil {
			defer mrows.Close()
			for mrows.Next() {
				var mid string
				var fromID, toID, ff, tt, bb *string
				var created time.Time
				_ = mrows.Scan(&mid, &fromID, &toID, &ff, &tt, &bb, &created)
				moves = append(moves, map[string]any{"id": mid, "from": ff, "to": tt, "by": bb, "created_at": created})
			}
		}
		middleware.WriteJSON(w, 200, map[string]any{"data": map[string]any{
			"id": d.ID, "number": d.Number, "title": d.Title, "contact_id": d.ContactID, "value": d.Value,
			"stage_id": d.StageID, "owner_id": d.Owner, "expected_close": d.ExpClose,
			"notes": d.Notes, "lost_reason": d.Lost, "created_at": d.Created,
		}, "meta": map[string]any{"moves": moves}})
		return
	}
	// PATCH
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	setClauses := ""
	args := []any{}
	i := 1
	if v, ok := raw["title"].(string); ok && strings.TrimSpace(v) != "" {
		setClauses += fmt.Sprintf("title=$%d,", i)
		args = append(args, strings.TrimSpace(v))
		i++
	}
	if v, ok := raw["value"].(float64); ok && v >= 0 {
		setClauses += fmt.Sprintf("value=$%d,", i)
		args = append(args, v)
		i++
	}
	if v, ok := raw["owner_id"].(string); ok {
		if v == "" {
			setClauses += "owner_id=null,"
		} else {
			setClauses += fmt.Sprintf("owner_id=$%d,", i)
			args = append(args, v)
			i++
		}
	}
	if v, ok := raw["contact_id"].(string); ok {
		if v == "" {
			setClauses += "contact_id=null,"
		} else {
			setClauses += fmt.Sprintf("contact_id=$%d,", i)
			args = append(args, v)
			i++
		}
	}
	if v, ok := raw["expected_close"].(string); ok {
		if v == "" {
			setClauses += "expected_close=null,"
		} else {
			setClauses += fmt.Sprintf("expected_close=$%d::date,", i)
			args = append(args, v)
			i++
		}
	}
	if v, ok := raw["notes"].(string); ok {
		setClauses += fmt.Sprintf("notes=$%d,", i)
		args = append(args, v)
		i++
	}
	if v, ok := raw["lost_reason"].(string); ok {
		setClauses += fmt.Sprintf("lost_reason=$%d,", i)
		args = append(args, v)
		i++
	}
	c := middleware.Claims(r)
	mover := ""
	if c != nil {
		mover = c.UserID
	}
	if v, ok := raw["stage_id"].(string); ok && v != "" {
		var from *string
		_ = pool.QueryRow(r.Context(), `select stage_id from deals where id=$1`, id).Scan(&from)
		setClauses += fmt.Sprintf("stage_id=$%d,", i)
		args = append(args, v)
		i++
		_, _ = pool.Exec(r.Context(), `insert into deal_moves (deal_id, from_stage_id, to_stage_id, moved_by) values ($1,$2,$3,$4)`, id, from, v, nullStr(mover))
	}
	if setClauses == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	setClauses += "updated_at=now()"
	args = append(args, id)
	var outID string
	if err := pool.QueryRow(r.Context(), fmt.Sprintf(`update deals set %s where id=$%d returning id`, setClauses, i), args...).Scan(&outID); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Deal tidak ada")
		return
	}
	middleware.WriteJSON(w, 200, map[string]string{"id": outID})
}

// GET /api/v1/sales-summary — ringkasan pipeline per tahap + total.
func SalesSummary(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	rows, err := pool.Query(r.Context(), `select s.id, s.name, s.probability, s.is_won, s.is_lost, count(d.id), coalesce(sum(d.value),0) from sales_stages s left join deals d on d.stage_id=s.id where s.active=true group by s.id, s.name, s.probability, s.is_won, s.is_lost order by (select min(position) from sales_stages x where x.id=s.id)`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var prob int
		var won, lost bool
		var cnt int
		var total float64
		_ = rows.Scan(&id, &name, &prob, &won, &lost, &cnt, &total)
		out = append(out, map[string]any{"stage_id": id, "stage": name, "probability": prob, "is_won": won, "is_lost": lost, "count": cnt, "value": total})
	}
	middleware.WriteJSON(w, 200, out)
}
