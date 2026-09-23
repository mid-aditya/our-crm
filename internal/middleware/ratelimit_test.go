package middleware

import "testing"
import "time"

func TestRateLimiter(t *testing.T) {
	l := NewRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !l.Allow("1.2.3.4") {
			t.Fatalf("percobaan %d ditolak padahal dalam limit", i+1)
		}
	}
	if l.Allow("1.2.3.4") {
		t.Fatal("percobaan ke-4 harus ditolak")
	}
	if !l.Allow("5.6.7.8") {
		t.Fatal("IP lain harus diizinkan")
	}
	// window kedaluwarsa -> reset
	fast := NewRateLimiter(1, 10*time.Millisecond)
	if !fast.Allow("x") {
		t.Fatal("pertama harus lolos")
	}
	if fast.Allow("x") {
		t.Fatal("kedua harus ditolak")
	}
	time.Sleep(15 * time.Millisecond)
	if !fast.Allow("x") {
		t.Fatal("setelah window harus lolos lagi")
	}
}
