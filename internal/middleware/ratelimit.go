package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// RateLimiter token-bucket per key (IP, atau IP+email untuk login).
// In-memory, cocok untuk single-instance lokal; di prod multi-replica
// pindahkan ke Redis.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	max     int
	window  time.Duration
}

type bucket struct {
	n     int
	reset time.Time
}

func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{buckets: make(map[string]*bucket), max: max, window: window}
}

func (l *RateLimiter) Allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.buckets[key]
	if !ok || now.After(b.reset) {
		l.buckets[key] = &bucket{n: 1, reset: now.Add(l.window)}
		return true
	}
	b.n++
	return b.n <= l.max
}

// Limit middleware umum per IP.
func (l *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if ip == "" {
			ip = r.RemoteAddr
		}
		if !l.Allow(ip) {
			WriteErr(w, 429, "RATE_LIMITED", "Terlalu banyak permintaan, coba lagi nanti")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (l *RateLimiter) Size() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.buckets)
}
