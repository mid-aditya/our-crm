# Deploy ke VPS Ubuntu (Docker)

Panduan menaikkan project ini ke VPS dengan **Docker Compose**:

```
Internet
   │  80/443 (HTTPS otomatis)
   ▼
Caddy  ──►  /            → frontend statis (web/build)
   │        /api/*, /ws/* → backend Go :3001
   ▼
backend Go ──► PostgreSQL (container, hanya jaringan internal)
```

| Komponen | Image / build | Port |
|---|---|---|
| `web` | `deploy/web.Dockerfile` (Node build → Caddy) | `127.0.0.1:8080` |
| `backend` | `Dockerfile` (Go 1.26) | 3001 (internal) |
| `db` | `postgres:16-alpine` | 5432 (internal) |

File terkait: `docker-compose.yml`, `deploy/Caddyfile`, `deploy/web.Dockerfile`,
`deploy/nginx-our-crm.conf`, `deploy/migrate.sh`, `deploy/deploy.sh`,
`deploy/backup.sh`, `.env.production.example`.

> **Punya Nginx di host?** Konfigurasi default memang untuk kasus itu: Caddy
> hanya listen di `127.0.0.1:8080`, sedangkan Nginx host yang memegang 80/443
> dan meneruskan domain CRM ke Caddy. Lihat bagian
> [Nginx sudah memakai 80/443](#nginx-sudah-memakai-80443). Kalau VPS kosong
> tanpa Nginx, ubah `ports` service `web` menjadi `80:80` dan `443:443`, lalu
> ganti alamat situs di `deploy/Caddyfile` dari `:80` menjadi `{$DOMAIN}`.

---

## 1. Persiapan

### Domain
Buat **A record** `codeit.id` (atau FQDN yang dipakai, mis. `crm.codeit.id`)
mengarah ke IP VPS. Tunggu propagasi DNS:

```bash
dig +short codeit.id
```

HTTPS otomatis (Let's Encrypt) **butuh FQDN**, bukan IP. Kalau belum punya
domain, set `DOMAIN=:80` di `.env.production` dan akses lewat `http://IP`.

### VPS
- Ubuntu 22.04/24.04, minimal 2 vCPU / 2 GB RAM / 20 GB disk.
- Port `22`, `80`, `443` terbuka.

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker          # atau logout/login ulang
docker compose version
```

Firewall (kalau pakai UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

---

## 2. Ambil kode

```bash
sudo mkdir -p /opt/our-crm && sudo chown "$USER":"$USER" /opt/our-crm
git clone git@github.com:mid-aditya/our-crm.git /opt/our-crm
cd /opt/our-crm
git checkout dev        # sesuaikan branch yang mau dipakai
```

> Clone via SSH butuh deploy key di server. Alternatif: pakai URL HTTPS +
> personal access token.

---

## 3. Konfigurasi environment

```bash
cp .env.production.example .env.production
```

Isi `.env.production`:

```bash
# Domain FQDN (atau ":80" kalau tanpa domain)
DOMAIN=codeit.id

# Password Postgres — huruf/angka saja agar aman di URL DSN
POSTGRES_USER=crm
POSTGRES_PASSWORD=PasswordKuat123

# Generate 3 secret berikut:
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
TENANT_CRED_KEY=$(openssl rand -hex 32)

CORS_ORIGINS=https://codeit.id
```

Cara cepat mengisi otomatis:

```bash
sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -hex 32)|" .env.production
sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 32)|" .env.production
sed -i "s|^TENANT_CRED_KEY=.*|TENANT_CRED_KEY=$(openssl rand -hex 32)|" .env.production
chmod 600 .env.production
```

> `TENANT_CRED_KEY` harus tepat **64 karakter hex**. Kalau diubah setelah ada
> data tenant, kredensial DB tenant lama tidak bisa didekripsi.

---

## 4. Jalankan database + migrasi (sekali di awal)

```bash
docker compose --env-file .env.production up -d db
bash deploy/migrate.sh
```

`migrate.sh` membuat database `crm_master` bila belum ada, lalu menerapkan
migrasi dengan urutan yang benar (`master_0001.sql` lebih dulu, lalu file
bertanggal). Migrasi **tidak** dijalankan otomatis oleh aplikasi.

Cek hasilnya:

```bash
docker compose --env-file .env.production exec db \
  psql -U crm -d crm_master -c "\dt" | head
```

---

## 5. Build & jalankan semua service

```bash
bash deploy/deploy.sh
```

Atau manual:

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f backend
```

Tunggu Caddy menerbitkan sertifikat (±30 detik setelah DNS benar).

---

## 6. Verifikasi

```bash
curl -I https://codeit.id                     # 200, frontend
curl https://codeit.id/api/v1/health          # {"data":{"status":"ok"}}
curl -I https://codeit.id/login               # 200 (SPA fallback)
```

Lalu buka `https://codeit.id/signup` untuk membuat company + admin pertama.
Company baru otomatis dibuatkan database tenant (user Postgres harus punya
privilege `CREATEDB`; user default container adalah superuser, jadi aman).

---

## 6b. Nginx sudah memakai 80/443

Kalau VPS sudah menjalankan Nginx untuk situs/subdomain lain, **jangan**
matikan Nginx. Caddy sudah dikonfigurasi internal di `127.0.0.1:8080`.

1. Pastikan container jalan:

   ```bash
   docker compose --env-file .env.production up -d --build
   curl http://127.0.0.1:8080/api/v1/health
   ```

2. Pasang server block Nginx (ganti `codeit.id` bila perlu):

   ```bash
   cd /opt/our-crm
   sudo cp deploy/nginx-our-crm.conf /etc/nginx/sites-available/our-crm
   sudo nano /etc/nginx/sites-available/our-crm     # sesuaikan server_name
   sudo ln -s /etc/nginx/sites-available/our-crm /etc/nginx/sites-enabled/our-crm
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. Terbitkan sertifikat HTTPS:

   ```bash
   sudo certbot --nginx -d codeit.id
   ```

   Certbot akan menambahkan blok 443 + redirect HTTP→HTTPS secara otomatis.
   Pastikan A record `codeit.id` sudah mengarah ke IP VPS.

4. Verifikasi:

   ```bash
   curl https://codeit.id/api/v1/health
   ```

Catatan:

- Jangan menambahkan `ports: 80:80` / `443:443` pada service `web` selama
  Nginx masih memakai port tersebut.
- Kalau `nginx -t` error `duplicate map`, hapus blok `map $http_upgrade ...`
  di `deploy/nginx-our-crm.conf` (sudah ada di konfigurasi Nginx lain).
- WebSocket dan SSE butuh header `Upgrade`/`Connection` serta
  `proxy_buffering off` — semuanya sudah ada di file contoh.

---

## 7. Update / redeploy

```bash
cd /opt/our-crm
git pull
# Kalau ada migrasi baru, jalankan dulu:
bash deploy/migrate.sh
bash deploy/deploy.sh
```

Build frontend & backend dilakukan ulang di dalam Docker, jadi server tidak
perlu Node/Go terpasang.

---

## 8. Backup & restore

Backup (master + semua tenant) ke `backups/`:

```bash
bash deploy/backup.sh
```

Jadwalkan cron harian, mis. `crontab -e`:

```cron
0 2 * * * cd /opt/our-crm && bash deploy/backup.sh >> /var/log/our-crm-backup.log 2>&1
```

Restore satu database:

```bash
docker compose --env-file .env.production exec -T db \
  pg_restore -U crm -d crm_master --clean --if-exists < backups/crm_master-YYYYmmdd-HHMMSS.dump
```

Simpan backup di luar VPS (S3/rsync) agar aman.

---

## 9. Keamanan — wajib dibaca sebelum publik

1. **Login demo = backdoor admin tanpa password.** Endpoint
   `POST /api/v1/auth/demo-login` menerbitkan JWT untuk company demo tanpa
   kredensial. `deploy/Caddyfile` sudah memblokirnya (404). Kalau butuh mode
   demo di server, hapus blok `@demologin` — tapi jangan untuk produksi.
   Setelah signup company asli, company demo juga bisa dihapus:
   ```sql
   DELETE FROM companies WHERE slug = 'demo';
   ```
2. **WebSocket agent belum terautentikasi.** `GET /ws/livechat?role=agent&company_id=...`
   tidak memeriksa JWT, dan `company_id` dikembalikan oleh endpoint publik
   pembuatan sesi livechat. Artinya siapa pun yang tahu `company_id` bisa
   menyadap semua chat company tersebut. **Perbaiki sebelum dipakai publik**
   (kirim token di query/header, verifikasi di `internal/livechat/websocket.go`).
3. `CheckOrigin` WebSocket masih `return true` (`internal/livechat/websocket.go`).
   Batasi ke domain produksi.
4. Postgres tidak diekspos ke host (sudah benar). Jangan tambahkan
   `ports: 5432:5432`.
5. Jangan commit `.env.production`; file itu sudah di-`.gitignore`.
6. Endpoint `/api/v1/signup` terbuka (rate limit 10/menit). Kalau tidak ingin
   publik bisa daftar, blokir di Caddy atau tambahkan invite-only.
7. Aktifkan update keamanan OS: `sudo apt install unattended-upgrades`.

---

## 10. Troubleshooting

| Gejala | Cek |
|---|---|
| Sertifikat HTTPS gagal | DNS A record belum mengarah ke IP; port 80/443 tertutup; `docker compose logs web` |
| `502` di `/api` | Backend mati: `docker compose logs backend`; cek `MASTER_DSN` |
| Backend restart-loop | Secret kosong / `TENANT_CRED_KEY` bukan 64 hex; lihat log |
| Login gagal, user tidak ada | Migrasi `20260925000000_users.sql` belum jalan |
| SPA 404 saat refresh | Pastikan request non-API ditangani `try_files ... /index.html` (sudah ada di Caddyfile) |
| WebSocket gagal | Caddy sudah proxy `/ws/*`; pastikan tidak ada proxy lain di depan yang memutus upgrade |
| Data hilang setelah `down` | Jangan pakai `docker compose down -v`; itu menghapus volume `pgdata` |

Perintah harian:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f --tail=100
docker compose --env-file .env.production restart backend
docker compose --env-file .env.production exec db psql -U crm -d crm_master
```
