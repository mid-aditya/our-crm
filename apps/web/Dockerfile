FROM node:20-alpine AS build
WORKDIR /app
COPY apps/web/package.json ./apps/web/
RUN npm install -w apps/web --no-audit --no-fund || true
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/apps/web/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
