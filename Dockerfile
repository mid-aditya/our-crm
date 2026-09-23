# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /crm-backend ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /crm-backend /app/crm-backend
COPY --from=build /app/migrations /app/migrations
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["/app/crm-backend"]
