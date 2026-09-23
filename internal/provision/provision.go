package provision

import (
	"context"
	"embed"
	"fmt"
	"strings"

	"crm-backend/internal/auth"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed tenant_0001.sql
var tenantMigration string

// Permission tetap CRM-only.
var defaultPerms = [][3]string{
	{"contacts.create", "Buat kontak", "contacts"}, {"contacts.read", "Lihat kontak", "contacts"},
	{"contacts.update", "Ubah kontak", "contacts"}, {"contacts.delete", "Hapus kontak", "contacts"},
	{"deals.create", "Buat deal", "deals"}, {"deals.read", "Lihat deal", "deals"},
	{"deals.update", "Ubah deal", "deals"}, {"deals.delete", "Hapus deal", "deals"},
	{"activities.create", "Buat aktivitas", "activities"}, {"activities.read", "Lihat aktivitas", "activities"},
	{"activities.update", "Ubah aktivitas", "activities"}, {"activities.delete", "Hapus aktivitas", "activities"},
	{"conversations.read", "Lihat percakapan", "conversations"}, {"conversations.reply", "Balas percakapan", "conversations"},
	{"conversations.assign", "Assign & resolve percakapan", "conversations"}, {"conversations.manage_channels", "Kelola channel WhatsApp", "conversations"},
	{"campaigns.create", "Buat campaign blasting", "campaigns"}, {"campaigns.read", "Lihat campaign", "campaigns"},
	{"campaigns.launch", "Luncurkan blasting", "campaigns"}, {"campaigns.delete", "Hapus campaign", "campaigns"},
	{"tickets.create", "Buat tiket", "tickets"}, {"tickets.read", "Lihat tiket", "tickets"},
	{"tickets.update", "Ubah & balas tiket", "tickets"}, {"tickets.delete", "Hapus tiket", "tickets"},
	{"reports.view", "Lihat laporan", "reports"}, {"reports.export", "Export laporan", "reports"},
	{"settings.manage_roles", "Kelola role & permission", "settings"}, {"settings.manage_billing", "Kelola billing", "settings"},
}

var memberPerms = []string{
	"contacts.create", "contacts.read", "contacts.update",
	"deals.create", "deals.read", "deals.update",
	"activities.create", "activities.read", "activities.update",
	"conversations.read", "conversations.reply", "campaigns.read",
	"tickets.create", "tickets.read", "tickets.update", "reports.view",
}

var _ = embed.FS{}

// SignupInput dari POST /api/v1/signup.
type SignupInput struct {
	CompanyName string
	Slug        string
	OwnerName   string
	OwnerEmail  string
	Password    string
}

// Provision: buat DB tenant + migrasi + seed + aktifkan. Sinkron (lokal).
// Gagal di tengah -> rollback (drop DB) + status failed.
func Provision(ctx context.Context, master *pgxpool.Pool, masterDSN, tenantCredKey, adminHost string, adminPort int, in SignupInput) (companyID string, err error) {
	dbName := "crm_tenant_" + strings.ReplaceAll(newID()[0:16], "-", "")

	// Lokal: pakai kredensial master untuk koneksi tenant (perusahaan berbagi
	// server PG yang sama). Di prod: buat role least-privilege per tenant
	// (CREATE ROLE + GRANT) lalu simpan kredensialnya.
	storeUser := masterUser(masterDSN)
	storePass := masterPass(masterDSN)

	var enc string
	// enkripsi disimpan di master
	enc, err = encryptPass(tenantCredKey, storePass)
	if err != nil {
		return "", err
	}
	err = insertCompany(ctx, master, in, adminHost, adminPort, dbName, storeUser, enc, &companyID)
	if err != nil {
		return "", err
	}
	fail := func(e error) (string, error) {
		_, _ = master.Exec(ctx, `update companies set status='failed', updated_at=now() where id=$1`, companyID)
		admin, _ := pgx.Connect(ctx, masterDSN)
		if admin != nil {
			_, _ = admin.Exec(ctx, `drop database if exists "`+dbName+`"`)
			admin.Close(ctx)
		}
		return "", e
	}
	admin, err := pgx.Connect(ctx, masterDSN)
	if err != nil {
		return fail(err)
	}
	defer admin.Close(ctx)
	if _, err := admin.Exec(ctx, `create database "`+dbName+`"`); err != nil {
		return fail(fmt.Errorf("create db: %w", err))
	}
	// NOTE: user least-privilege per tenant hanya untuk prod (lihat atas).
	tenantDSN := dsn(adminHost, adminPort, dbName, storeUser, storePass)
	tpool, err := pgxpool.New(ctx, tenantDSN)
	if err != nil {
		return fail(err)
	}
	defer tpool.Close()
	if _, err := tpool.Exec(ctx, tenantMigration); err != nil {
		return fail(fmt.Errorf("migrate: %w", err))
	}
	ownerID, err := seedTenant(ctx, tpool, in)
	if err != nil {
		return fail(fmt.Errorf("seed: %w", err))
	}
	_ = ownerID
	_, _ = master.Exec(ctx, `insert into company_user_index (email, company_id) values ($1,$2) on conflict do nothing`, in.OwnerEmail, companyID)
	_, _ = master.Exec(ctx, `update companies set status='active', updated_at=now() where id=$1`, companyID)
	return companyID, nil
}

func seedTenant(ctx context.Context, tpool *pgxpool.Pool, in SignupInput) (string, error) {
	permIDs := map[string]string{}
	for _, p := range defaultPerms {
		var id string
		err := tpool.QueryRow(ctx, `insert into permissions ("key", description, module) values ($1,$2,$3) on conflict ("key") do update set description=excluded.description returning id`, p[0], p[1], p[2]).Scan(&id)
		if err != nil {
			_ = tpool.QueryRow(ctx, `select id from permissions where "key"=$1`, p[0]).Scan(&id)
		}
		permIDs[p[0]] = id
	}
	mkRole := func(name string, sys bool, keys []string) (string, error) {
		var id string
		if err := tpool.QueryRow(ctx, `insert into roles (name, is_system_role) values ($1,$2) returning id`, name, sys).Scan(&id); err != nil {
			return "", err
		}
		for _, k := range keys {
			if pid, ok := permIDs[k]; ok && pid != "" {
				_, _ = tpool.Exec(ctx, `insert into role_permissions (role_id, permission_id) values ($1,$2) on conflict do nothing`, id, pid)
			}
		}
		return id, nil
	}
	allKeys := make([]string, 0, len(defaultPerms))
	for _, p := range defaultPerms {
		allKeys = append(allKeys, p[0])
	}
	adminKeys := []string{}
	for _, k := range allKeys {
		if k != "settings.manage_billing" {
			adminKeys = append(adminKeys, k)
		}
	}
	ownerRole, err := mkRole("Owner", true, allKeys)
	if err != nil {
		return "", err
	}
	if _, err := mkRole("Admin", true, adminKeys); err != nil {
		return "", err
	}
	if _, err := mkRole("Member", false, memberPerms); err != nil {
		return "", err
	}
	stages := [][4]any{{"Chat Masuk", 0, false, false}, {"Tertarik", 1, false, false}, {"Ditawar", 2, false, false}, {"Deal", 3, true, false}, {"Batal", 4, false, true}}
	// deal_stages: kolom (name, order_index, is_won_stage, is_lost_stage)
	for _, s := range stages {
		_, _ = tpool.Exec(ctx, `insert into deal_stages (name, order_index, is_won_stage, is_lost_stage) values ($1,$2,$3,$4)`, s[0], s[1], s[2], s[3])
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return "", err
	}
	var ownerID string
	err = tpool.QueryRow(ctx, `insert into users (email, password_hash, full_name, role_id, status) values ($1,$2,$3,$4,'active') returning id`, in.OwnerEmail, hash, in.OwnerName, ownerRole).Scan(&ownerID)
	return ownerID, err
}

func insertCompany(ctx context.Context, master *pgxpool.Pool, in SignupInput, host string, port int, dbName, dbUser, enc string, out *string) error {
	return master.QueryRow(ctx, `insert into companies (name, slug, status, db_host, db_port, db_name, db_user, db_pass_encrypted) values ($1,$2,'provisioning',$3,$4,$5,$6,$7) returning id`,
		in.CompanyName, in.Slug, host, port, dbName, dbUser, enc).Scan(out)
}
