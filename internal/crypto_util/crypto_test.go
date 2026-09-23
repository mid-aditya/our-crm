package crypto_util

import "testing"

func TestEncryptRoundtrip(t *testing.T) {
	key := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	enc, err := EncryptSecret(key, "s3cr3t")
	if err != nil {
		t.Fatal(err)
	}
	dec, err := DecryptSecret(key, enc)
	if err != nil {
		t.Fatal(err)
	}
	if dec != "s3cr3t" {
		t.Fatalf("got %q", dec)
	}
	if _, err := DecryptSecret(key, "rusak"); err == nil {
		t.Fatal("payload rusak harus ditolak")
	}
}
