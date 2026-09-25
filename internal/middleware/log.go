package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"
)

var Logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

// RequestLog catat method, path, status, latensi per request.
func RequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		Logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"latency_ms", time.Since(start).Milliseconds(),
			"ip", r.RemoteAddr,
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// Flush teruskan ke writer asli agar SSE (http.Flusher) tidak rusak.
// Tanpa ini SSEHandler selalu 500 SSE_NOT_SUPPORTED.
func (s *statusRecorder) Flush() {
	if f, ok := s.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// ActivityLogger mencatat semua kegiatan mutasi user (developer..agent) ke
// activity_logs tenant. GET/SSE/WS/health dilewati agar tidak banjir.
func ActivityLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodOptions || r.Method == http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}
		p := r.URL.Path
		if p == "/ws/livechat" || p == "/health" || p == "/api/v1/health" || contains(p, "/sse") {
			next.ServeHTTP(w, r)
			return
		}
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)

		c := Claims(r)
		if c == nil {
			return
		}
		pool := Tenant(r)
		if pool == nil {
			return
		}
		uid, uname, rname, ip, code, method, path := c.UserID, "", "", r.RemoteAddr, rec.status, r.Method, p
		if h := r.Header.Get("X-Forwarded-For"); h != "" {
			ip = h
		}
		go func() {
			ctx := context.Background()
			_, _ = pool.Exec(ctx, `create table if not exists activity_logs (id uuid primary key default gen_random_uuid(), user_id uuid, user_name text, role_name text, method text not null, path text not null, status_code int not null default 0, ip text, created_at timestamptz not null default now())`)
			_ = pool.QueryRow(ctx, `select full_name from users where id=$1`, uid).Scan(&uname)
			_ = pool.QueryRow(ctx, `select r.name from users u join roles r on r.id=u.role_id where u.id=$1`, uid).Scan(&rname)
			_, _ = pool.Exec(ctx, `insert into activity_logs (user_id, user_name, role_name, method, path, status_code, ip) values ($1,$2,$3,$4,$5,$6,$7)`, uid, nullIfEmpty(uname), nullIfEmpty(rname), method, path, code, nullIfEmpty(ip))
		}()
	})
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
