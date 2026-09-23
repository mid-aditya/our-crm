package crypto_util

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strings"
)

// AES-256-GCM untuk kredensial DB tenant di master DB.
// Format: base64(iv).base64(ciphertext).base64(tag)
func key32(s string) []byte {
	if b, err := hex.DecodeString(s); err == nil && len(b) == 32 {
		return b
	}
	out := make([]byte, 32)
	copy(out, []byte(s))
	return out
}

func EncryptSecret(key, plain string) (string, error) {
	block, err := aes.NewCipher(key32(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(iv); err != nil {
		return "", err
	}
	ct := gcm.Seal(nil, iv, []byte(plain), nil)
	// GCM Seal appends tag; split untuk format simpan
	tagStart := len(ct) - gcm.Overhead()
	return base64.StdEncoding.EncodeToString(iv) + "." +
		base64.StdEncoding.EncodeToString(ct[:tagStart]) + "." +
		base64.StdEncoding.EncodeToString(ct[tagStart:]), nil
}

func DecryptSecret(key, payload string) (string, error) {
	parts := strings.Split(payload, ".")
	if len(parts) != 3 {
		return "", errors.New("invalid encrypted payload")
	}
	iv, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", err
	}
	ct, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	tag, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key32(key))
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	pt, err := gcm.Open(nil, iv, append(ct, tag...), nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
