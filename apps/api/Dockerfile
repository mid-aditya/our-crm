FROM node:20-alpine AS build
WORKDIR /app
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN npm install -w apps/api --no-audit --no-fund || true
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/server.js"]
