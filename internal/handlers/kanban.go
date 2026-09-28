package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"crm-backend/internal/middleware"
)

// ---- Boards ----

// GET /api/v1/kanban/boards, POST /api/v1/kanban/boards {name}
func KanbanBoards(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		c := middleware.Claims(r)
		var by *string
		if c != nil {
			by = &c.UserID
		}
		var id string
		if err := pool.QueryRow(r.Context(), `insert into kanban_boards (name, created_by) values ($1,$2) returning id`, in.Name, by).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal membuat board")
			return
		}
		// Kolom default ala Trello.
		for i, n := range []string{"To Do", "In Progress", "Done"} {
			_, _ = pool.Exec(r.Context(), `insert into kanban_columns (board_id, name, position) values ($1,$2,$3)`, id, n, i)
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	rows, err := pool.Query(r.Context(), `select b.id, b.name, (select count(*) from kanban_columns c where c.board_id=b.id) as cols, (select count(*) from kanban_cards k join kanban_columns c on c.id=k.column_id where c.board_id=b.id) as cards, b.updated_at from kanban_boards b order by b.created_at desc`)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, name string
		var cols, cards int
		var updated time.Time
		_ = rows.Scan(&id, &name, &cols, &cards, &updated)
		out = append(out, map[string]any{"id": id, "name": name, "columns": cols, "cards": cards, "updated_at": updated})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/kanban/boards/{id} (board + kolom + kartu), PATCH {name}, DELETE
func KanbanBoardDetail(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := kanbanID(r, "/kanban/boards/")
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from kanban_boards where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	if r.Method == "PATCH" {
		var in struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		_, _ = pool.Exec(r.Context(), `update kanban_boards set name=$1, updated_at=now() where id=$2`, in.Name, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var name string
	if err := pool.QueryRow(r.Context(), `select name from kanban_boards where id=$1`, id).Scan(&name); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Board tidak ada")
		return
	}
	crows, err := pool.Query(r.Context(), `select id, name, position from kanban_columns where board_id=$1 order by position`, id)
	if err != nil {
		middleware.WriteErr(w, 500, "DB_ERROR", "Gagal memuat kolom")
		return
	}
	defer crows.Close()
	cols := []map[string]any{}
	for crows.Next() {
		var cid, cname string
		var pos int
		_ = crows.Scan(&cid, &cname, &pos)
		krows, _ := pool.Query(r.Context(), `select k.id, k.title, k.description, k.assignee_id, u.full_name, k.position, k.updated_at from kanban_cards k left join users u on u.id=k.assignee_id where k.column_id=$1 order by k.position, k.created_at`, cid)
		cards := []map[string]any{}
		if krows != nil {
			for krows.Next() {
				var kid, title string
				var desc, assignee, aname *string
				var kpos int
				var updated time.Time
				_ = krows.Scan(&kid, &title, &desc, &assignee, &aname, &kpos, &updated)
				cards = append(cards, map[string]any{"id": kid, "title": title, "description": desc, "assignee_id": assignee, "assignee_name": aname, "position": kpos, "updated_at": updated})
			}
			krows.Close()
		}
		cols = append(cols, map[string]any{"id": cid, "name": cname, "position": pos, "cards": cards})
	}
	middleware.WriteJSON(w, 200, map[string]any{"id": id, "name": name, "columns": cols})
}

// POST /api/v1/kanban/boards/{id}/columns {name}, PATCH/DELETE /api/v1/kanban/columns/{id}
func KanbanColumns(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		boardID := kanbanID(r, "/kanban/boards/")
		var in struct {
			Name string `json:"name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
			return
		}
		var pos int
		_ = pool.QueryRow(r.Context(), `select coalesce(max(position),-1)+1 from kanban_columns where board_id=$1`, boardID).Scan(&pos)
		var id string
		if err := pool.QueryRow(r.Context(), `insert into kanban_columns (board_id, name, position) values ($1,$2,$3) returning id`, boardID, in.Name, pos).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal membuat kolom")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	id := kanbanID(r, "/kanban/columns/")
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from kanban_columns where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var in struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "name wajib")
		return
	}
	_, _ = pool.Exec(r.Context(), `update kanban_columns set name=$1 where id=$2`, in.Name, id)
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// POST /api/v1/kanban/cards {column_id, title, description?, assignee_id?}
// PATCH /api/v1/kanban/cards/{id}, DELETE /api/v1/kanban/cards/{id}
func KanbanCards(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	if r.Method == "POST" {
		var in struct {
			ColumnID    string  `json:"column_id"`
			Title       string  `json:"title"`
			Description *string `json:"description"`
			AssigneeID  *string `json:"assignee_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ColumnID == "" || in.Title == "" {
			middleware.WriteErr(w, 400, "VALIDATION_ERROR", "column_id & title wajib")
			return
		}
		var pos int
		_ = pool.QueryRow(r.Context(), `select coalesce(max(position),-1)+1 from kanban_cards where column_id=$1`, in.ColumnID).Scan(&pos)
		var id string
		if err := pool.QueryRow(r.Context(), `insert into kanban_cards (column_id, title, description, assignee_id, position) values ($1,$2,$3,$4,$5) returning id`, in.ColumnID, in.Title, in.Description, in.AssigneeID, pos).Scan(&id); err != nil {
			middleware.WriteErr(w, 500, "DB_ERROR", "Gagal membuat kartu")
			return
		}
		middleware.WriteJSON(w, 201, map[string]string{"id": id})
		return
	}
	id := kanbanID(r, "/kanban/cards/")
	if r.Method == "DELETE" {
		_, _ = pool.Exec(r.Context(), `delete from kanban_cards where id=$1`, id)
		middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
		return
	}
	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "Payload tidak valid")
		return
	}
	if t, ok := raw["title"].(string); ok && t != "" {
		_, _ = pool.Exec(r.Context(), `update kanban_cards set title=$1, updated_at=now() where id=$2`, t, id)
	}
	if d, ok := raw["description"].(string); ok {
		_, _ = pool.Exec(r.Context(), `update kanban_cards set description=$1, updated_at=now() where id=$2`, d, id)
	}
	if a, ok := raw["assignee_id"]; ok {
		if s, ok := a.(string); ok && s != "" {
			_, _ = pool.Exec(r.Context(), `update kanban_cards set assignee_id=$1, updated_at=now() where id=$2`, s, id)
		} else {
			_, _ = pool.Exec(r.Context(), `update kanban_cards set assignee_id=null, updated_at=now() where id=$1`, id)
		}
	}
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// POST /api/v1/kanban/cards/{id}/move {to_column_id, position?} — tercatat di moves + activity log.
func KanbanMove(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	id := kanbanID(r, "/kanban/cards/")
	var in struct {
		ToColumnID string `json:"to_column_id"`
		Position   *int   `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ToColumnID == "" {
		middleware.WriteErr(w, 400, "VALIDATION_ERROR", "to_column_id wajib")
		return
	}
	var fromID string
	if err := pool.QueryRow(r.Context(), `select column_id from kanban_cards where id=$1`, id).Scan(&fromID); err != nil {
		middleware.WriteErr(w, 404, "NOT_FOUND", "Kartu tidak ada")
		return
	}
	pos := 0
	if in.Position != nil {
		pos = *in.Position
	} else {
		_ = pool.QueryRow(r.Context(), `select coalesce(max(position),-1)+1 from kanban_cards where column_id=$1`, in.ToColumnID).Scan(&pos)
	}
	_, _ = pool.Exec(r.Context(), `update kanban_cards set column_id=$1, position=$2, updated_at=now() where id=$3`, in.ToColumnID, pos, id)
	var by *string
	if c != nil {
		by = &c.UserID
	}
	_, _ = pool.Exec(r.Context(), `insert into kanban_card_moves (card_id, from_column_id, to_column_id, moved_by) values ($1,$2,$3,$4)`, id, fromID, in.ToColumnID, by)
	middleware.WriteJSON(w, 200, map[string]bool{"ok": true})
}

// GET /api/v1/kanban/cards/{id}/moves — riwayat perpindahan task.
func KanbanMoves(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	id := kanbanID(r, "/kanban/cards/")
	rows, err := pool.Query(r.Context(), `select m.id, fc.name, tc.name, u.full_name, m.created_at from kanban_card_moves m left join kanban_columns fc on fc.id=m.from_column_id left join kanban_columns tc on tc.id=m.to_column_id left join users u on u.id=m.moved_by where m.card_id=$1 order by m.created_at desc limit 50`, id)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var mid string
		var from, to, by *string
		var created time.Time
		_ = rows.Scan(&mid, &from, &to, &by, &created)
		out = append(out, map[string]any{"id": mid, "from": from, "to": to, "moved_by": by, "created_at": created})
	}
	middleware.WriteJSON(w, 200, out)
}

// GET /api/v1/kanban/my-cards — kartu yang di-assign ke saya lintas board.
func KanbanMyCards(w http.ResponseWriter, r *http.Request) {
	pool := middleware.Tenant(r)
	c := middleware.Claims(r)
	uid := ""
	if c != nil {
		uid = c.UserID
	}
	rows, err := pool.Query(r.Context(), `select k.id, k.title, k.description, b.id, b.name, c.id, c.name, k.updated_at from kanban_cards k join kanban_columns c on c.id=k.column_id join kanban_boards b on b.id=c.board_id where k.assignee_id=$1 order by k.updated_at desc limit 50`, uid)
	if err != nil {
		middleware.WriteJSON(w, 200, []map[string]any{})
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, title, bid, bname, cid, cname string
		var desc *string
		var updated time.Time
		_ = rows.Scan(&id, &title, &desc, &bid, &bname, &cid, &cname, &updated)
		out = append(out, map[string]any{"id": id, "title": title, "description": desc, "board_id": bid, "board_name": bname, "column_id": cid, "column_name": cname, "updated_at": updated})
	}
	middleware.WriteJSON(w, 200, out)
}

func kanbanID(r *http.Request, marker string) string {
	p := r.URL.Path
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
