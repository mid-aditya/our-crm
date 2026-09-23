package auth

import "testing"

func TestPasswordRoundtrip(t *testing.T) {
	h, err := HashPassword("password123")
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyPassword(h, "password123") {
		t.Fatal("password benar ditolak")
	}
	if VerifyPassword(h, "salah") {
		t.Fatal("password salah diterima")
	}
	if VerifyPassword("bukan-hash", "x") {
		t.Fatal("hash rusak diterima")
	}
}

func TestRefreshHashKonsisten(t *testing.T) {
	if HashRefreshToken("abc") != HashRefreshToken("abc") {
		t.Fatal("hash tidak konsisten")
	}
	if len(HashRefreshToken("abc")) == 0 {
		t.Fatal("hash kosong")
	}
}
