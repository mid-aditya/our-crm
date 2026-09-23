package middleware

import (
	"net/http"
	"strconv"
)

// Page parsing ?limit=&offset=. Default 20, maksimal 100.
func Page(r *http.Request) (limit, offset int) {
	limit, offset = 20, 0
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 100 {
		limit = 100
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return limit, offset
}

// PageMeta format meta pagination konsisten.
func PageMeta(limit, offset, total int) map[string]int {
	return map[string]int{"limit": limit, "offset": offset, "total": total}
}
