package provision

import (
	"crypto/rand"
	"fmt"
	"net/url"
	"strings"

	cryptoutil "crm-backend/internal/crypto_util"
)

func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func encryptPass(key, pass string) (string, error) {
	return cryptoutil.EncryptSecret(key, pass)
}

func dsn(host string, port int, db, user, pass string) string {
	u := &url.URL{Scheme: "postgres", User: url.UserPassword(user, pass), Host: fmt.Sprintf("%s:%d", host, port), Path: db}
	return u.String()
}

// masterUser/masterPass parse dari master DSN untuk fallback koneksi tenant di lokal.
func masterUser(masterDSN string) string {
	u, err := url.Parse(masterDSN)
	if err != nil || u.User == nil {
		return "root"
	}
	return u.User.Username()
}

func masterPass(masterDSN string) string {
	u, err := url.Parse(masterDSN)
	if err != nil || u.User == nil {
		return "root"
	}
	p, _ := u.User.Password()
	if p == "" {
		return "root"
	}
	return p
}

var _ = strings.ReplaceAll
