package config

import (
	"fmt"
	"os"
)

// Config dibaca dari environment. Fail fast kalau secret kosong.
type Config struct {
	Port                   string
	MasterDSN              string
	RedisURL               string
	JWTAccessSecret        string
	JWTRefreshSecret       string
	JWTAccessTTLMinutes    int
	TenantCredKey          string // 32 byte untuk AES-256-GCM (hex 64 char atau string)
	TenantPoolMaxConns     int32
	TenantConnCacheTTLSec  int
	CORSOrigins            string
}

func mustGet(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("env %s wajib diisi", key))
	}
	return v
}

func Load() Config {
	return Config{
		Port:                  envOr("API_PORT", "3001"),
		MasterDSN:             mustGet("MASTER_DSN"),
		RedisURL:              envOr("REDIS_URL", ""),
		JWTAccessSecret:       mustGet("JWT_ACCESS_SECRET"),
		JWTRefreshSecret:      mustGet("JWT_REFRESH_SECRET"),
		JWTAccessTTLMinutes:   15,
		TenantCredKey:         mustGet("TENANT_CRED_KEY"),
		TenantPoolMaxConns:    5,
		TenantConnCacheTTLSec: 300,
		CORSOrigins:           envOr("CORS_ORIGINS", "http://localhost:5173"),
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
