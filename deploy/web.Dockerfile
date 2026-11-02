# Build frontend SvelteKit (SPA) lalu sajikan lewat Caddy bersama reverse proxy API.
# Build context harus root repo: docker build -f deploy/web.Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/build /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
