# Build frontend SvelteKit (SPA) lalu sajikan lewat Caddy bersama reverse proxy API.
# Build context harus root repo: docker build -f deploy/web.Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
# Hanya package.json: package-lock.json di repo dibuat di Windows dan memuat
# entri platform yang salah (esbuild aix/ppc64), sehingga "npm ci" gagal di
# Linux. Tanpa lock, npm me-resolve dependensi yang cocok untuk linux/x64.
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/build /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
