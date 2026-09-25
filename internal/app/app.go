package app

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"crm-backend/internal/config"
	cryptoutil "crm-backend/internal/crypto_util"
	"crm-backend/internal/db"
	"crm-backend/internal/wa"

	"github.com/jackc/pgx/v5/pgxpool"
)

// App menyimpan dependency global backend.
type App struct {
	Cfg     config.Config
	Master  *pgxpool.Pool
	Tenants *db.TenantPools
	Sender  wa.Sender
}

func New(cfg config.Config) (*App, error) {
	ctx := context.Background()
	master, err := pgxpool.New(ctx, cfg.MasterDSN)
	if err != nil {
		return nil, fmt.Errorf("master db: %w", err)
	}
	if err := master.Ping(ctx); err != nil {
		return nil, fmt.Errorf("master ping: %w", err)
	}
	return &App{Cfg: cfg, Master: master, Tenants: db.NewTenantPools(50), Sender: wa.New()}, nil
}

type CompanyConn struct {
	ID     string
	Status string
	DSN    string
}

// LookupCompany baca info koneksi tenant dari master DB.
func (a *App) LookupCompany(ctx context.Context, companyID string) (CompanyConn, error) {
	var c CompanyConn
	var host string
	var port int
	var dbName, dbUser, enc string
	err := a.Master.QueryRow(ctx, `select id, status, db_host, db_port, db_name, db_user, db_pass_encrypted from companies where id=$1`, companyID).
		Scan(&c.ID, &c.Status, &host, &port, &dbName, &dbUser, &enc)
	if err != nil {
		return c, err
	}

	// ponytail: graceful fallback for demo company — if db_name is crm_master
	// (the shared master DB) and no encrypted password, use master DSN directly.
	// This avoids DecryptSecret crash on empty encrypted password.
	if dbName == "crm_master" && enc == "" {
		c.DSN = a.Cfg.MasterDSN
		return c, nil
	}

	pass, err := cryptoutil.DecryptSecret(a.Cfg.TenantCredKey, enc)
	if err != nil {
		return c, fmt.Errorf("decrypt: %w", err)
	}
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(dbUser, pass),
		Host:   fmt.Sprintf("%s:%d", host, port),
		Path:   dbName,
	}
	c.DSN = u.String()
	return c, nil
}

// TenantPool ambil/buat pool pgx per company (LRU di db.TenantPools).
func (a *App) TenantPool(ctx context.Context, companyID string) (*pgxpool.Pool, error) {
	conn, err := a.LookupCompany(ctx, companyID)
	if err != nil {
		return nil, err
	}
	if conn.Status != "active" {
		return nil, &StatusError{Code: 403, Msg: "company " + conn.Status}
	}
	return a.Tenants.Get(ctx, companyID, conn.DSN, time.Now().UnixNano())
}

type StatusError struct {
	Code int
	Msg  string
}

func (e *StatusError) Error() string { return e.Msg }
