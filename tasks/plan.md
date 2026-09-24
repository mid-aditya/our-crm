# Plan: Livechat Feature

## Overview
Add a livechat widget to the landing page, real-time WebSocket chat, and agent dashboard for distributing incoming chats.

## Architecture Decisions

| Decision | Rationale |
|---|---|
| WebSocket on port 8080 | Separate from main API (3001), simpler deployment |
| `livechat_sessions` table | Tracks visitor info, current agent, status |
| `livechat_distribution` table | Round-robin state per company |
| Visitor ID in localStorage | No login needed for customers |
| SSE for agent dashboard | Simpler than WebSocket for agent UI; backend pushes to agent |
| Root layout shows widget for public routes | Conditional on auth state |

## API Contract

### REST (Go backend, port 8080)
- `POST /api/sessions` → `{ visitor_id, visitor_name? }` → `{ session_id, ws_url }`
- `GET /api/queue?company_id=` → `[{ session_id, visitor_name, waiting_since, last_message }]`
- `GET /api/sessions/{id}/messages` → `[{ id, direction, body, created_at }]`
- `POST /api/sessions/{id}/assign` → `{ agent_id }` → `{ ok }`
- `POST /api/sessions/{id}/messages` → `{ body, direction }` → `{ id }`
- `POST /api/distribution` → `{ mode: 'auto'|'manual', auto_round_robin?: bool }`

### WebSocket (Go backend, port 8080)
- URL: `ws://localhost:8080/ws?session_id=&company_id=`
- Messages: `{ type: 'visitor_message', body }`, `{ type: 'agent_message', body }`, `{ type: 'typing', role }`, `{ type: 'assigned', agent_id }`

### Frontend Routes
- `/` — Landing page with livechat widget
- `/dashboard/livechat` — Agent queue + chat interface

## Phase 1: Landing Page + Livechat Widget (Frontend)
- `src/routes/+page.svelte` — Full landing page (features, CTA, footer)
- `src/routes/+layout.svelte` — Load livechat widget on public routes
- `src/lib/livechat/Widget.svelte` — Floating button + chat window
- `src/lib/livechat/store.svelte.ts` — Visitor session state, WS connection
- `src/lib/livechat/api.ts` — REST client for sessions/messages

## Phase 2: Go Backend (WebSocket + REST)
- `cmd/server/livechat.go` — WebSocket hub, session management
- `cmd/server/agent.go` — Agent endpoints, SSE for dashboard
- `cmd/server/main.go` — Register WS routes + REST endpoints
- `migrations/` — Add `livechat_sessions`, `livechat_distribution` tables

## Phase 3: Agent Dashboard (Frontend)
- `src/routes/dashboard/` — Layout with auth guard
- `src/routes/dashboard/livechat/+page.svelte` — Queue list + chat pane
- `src/lib/livechat/agent-store.ts` — Agent state, SSE subscription

## Phase 4: Customer Chat View (Frontend)
- Customer sees chat window embedded in widget
- `/chat/{session_id}` for full-page chat (optional deep-link)

## Checkpoints
- [ ] Landing page renders with widget button visible
- [ ] Widget opens chat window on click
- [ ] Agent dashboard shows queue
- [ ] Messages flow visitor → agent → visitor in real-time
