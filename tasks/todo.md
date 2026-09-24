# Todo: Livechat Feature

## Phase 1: Landing Page + Livechat Widget
- [ ] Landing page `src/routes/+page.svelte` — marketing page with features, CTA
- [ ] Root layout `src/routes/+layout.svelte` — load widget for public routes
- [ ] Widget component `src/lib/livechat/Widget.svelte` — floating button + chat window
- [ ] Widget store `src/lib/livechat/store.svelte.ts` — visitor session, WS connection
- [ ] Widget API `src/lib/livechat/api.ts` — REST client for sessions/messages
- [ ] Customer chat page `src/routes/chat/[id]/+page.svelte` — full-page chat view
- [ ] i18n updates for livechat labels

## Phase 2: Go Backend (WebSocket + REST)
- [ ] `internal/livechat/hub.go` — WebSocket hub, session registry, broadcast
- [ ] `internal/livechat/handlers.go` — REST endpoints (sessions, queue, assign)
- [ ] `internal/livechat/sse.go` — SSE for agent dashboard push
- [ ] `cmd/server/main.go` — register livechat routes
- [ ] Migration: `livechat_sessions` + `livechat_distribution` tables

## Phase 3: Agent Dashboard
- [ ] Dashboard layout `src/routes/dashboard/+layout.svelte` — auth guard
- [ ] Agent store `src/lib/livechat/agent-store.svelte.ts` — SSE subscription, queue state
- [ ] Livechat page `src/routes/dashboard/livechat/+page.svelte` — queue list + chat pane
- [ ] i18n for agent dashboard

## Phase 4: Integration + Polish
- [ ] Connect widget to Go backend (WSS URL from channel config)
- [ ] Distribution toggle (manual / auto round-robin)
- [ ] Agent can take/assign conversations
- [ ] Build passes

## Checkpoint: Complete
- [ ] Landing page visible at `/`
- [ ] Widget button in bottom-right corner
- [ ] Customer can chat in widget
- [ ] Agent sees queue in dashboard
- [ ] Messages flow in real-time
