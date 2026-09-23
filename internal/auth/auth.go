package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/argon2"
)

// Password hashing argon2id (bukan bcrypt) — sesuai standar proyek.
type argonParams struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLen     uint32
	keyLen      uint32
}

var params = argonParams{memory: 64 * 1024, iterations: 3, parallelism: 2, saltLen: 16, keyLen: 32}

func HashPassword(password string) (string, error) {
	salt := make([]byte, params.saltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, params.iterations, params.memory, params.parallelism, params.keyLen)
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)
	return "$argon2id$v=19$m=" + u32str(params.memory) + ",t=" + u32str(params.iterations) + ",p=" + u8str(params.parallelism) + "$" + b64Salt + "$" + b64Hash, nil
}

func VerifyPassword(encodedHash, password string) bool {
	parts := strings.Split(encodedHash, "$")
	// ["", "argon2id", "v=19", "m=65536,t=3,p=4", salt, hash]
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	memory, iterations, parallelism := parseParams(parts[3])
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// parseParams baca "m=65536,t=3,p=4" dari PHC (fallback ke default aman).
func parseParams(s string) (memory, iterations uint32, parallelism uint8) {
	memory, iterations, parallelism = params.memory, params.iterations, params.parallelism
	for _, kv := range strings.Split(s, ",") {
		k, v, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		var n uint32
		for _, ch := range v {
			if ch < '0' || ch > '9' {
				n = 0
				break
			}
			n = n*10 + uint32(ch-'0')
		}
		switch k {
		case "m":
			if n > 0 {
				memory = n
			}
		case "t":
			if n > 0 {
				iterations = n
			}
		case "p":
			if n > 0 && n < 256 {
				parallelism = uint8(n)
			}
		}
	}
	return memory, iterations, parallelism
}

func u32str(v uint32) string {
	if v == 0 {
		return "0"
	}
	var b [10]byte
	i := len(b)
	for v > 0 {
		i--
		b[i] = byte('0' + v%10)
		v /= 10
	}
	return string(b[i:])
}

func u8str(v uint8) string { return u32str(uint32(v)) }

// JWT access token: user_id, company_id, role_id, exp pendek.
type AccessClaims struct {
	UserID    string `json:"user_id"`
	CompanyID string `json:"company_id"`
	RoleID    string `json:"role_id"`
	jwt.RegisteredClaims
}

func SignAccess(secret, userID, companyID, roleID string, ttl time.Duration) (string, error) {
	now := time.Now()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, AccessClaims{
		UserID: userID, CompanyID: companyID, RoleID: roleID,
		RegisteredClaims: jwt.RegisteredClaims{IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(ttl))},
	})
	return tok.SignedString([]byte(secret))
}

func ParseAccess(secret, token string) (*AccessClaims, error) {
	tok, err := jwt.ParseWithClaims(token, &AccessClaims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("metode token tak dikenal")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := tok.Claims.(*AccessClaims)
	if !ok || !tok.Valid {
		return nil, errors.New("token tidak valid")
	}
	return c, nil
}

func NewRefreshToken() (string, error) {
	b := make([]byte, 48)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func HashRefreshToken(t string) string {
	sum := sha256.Sum256([]byte(t))
	return base64.RawStdEncoding.EncodeToString(sum[:])
}
