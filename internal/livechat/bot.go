package livechat

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// runBotResponder: bot menghandle customer lebih dulu dengan Q&A custom.
// - cocok keyword & escalate=false → jawab otomatis, sesi tetap di bot.
// - cocok & escalate=true, atau tidak cocok → teruskan ke antrian agent
//   (bot_handled=true, unread+1).
func runBotResponder(pool *pgxpool.Pool, sessionID, body string) {
	if pool == nil || sessionID == "" {
		return
	}
	ctx := context.Background()
	var handled bool
	if err := pool.QueryRow(ctx, `select bot_handled from livechat_sessions where id=$1`, sessionID).Scan(&handled); err != nil || handled {
		// Sudah di agent / sesi tak ada: naikkan unread saja.
		_, _ = pool.Exec(ctx, `update livechat_sessions set unread_count=unread_count+1, last_inbound_at=now(), updated_at=now() where id=$1`, sessionID)
		return
	}

	lower := strings.ToLower(body)
	rows, err := pool.Query(ctx, `select keywords, answer, escalate from bot_qa where active=true order by position, created_at`)
	matched := false
	escalate := true
	answer := ""
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var kw, ans string
			var esc bool
			_ = rows.Scan(&kw, &ans, &esc)
			if matchKeywords(lower, kw) {
				matched = true
				escalate = esc
				answer = ans
				break
			}
		}
	}

	if matched && !escalate {
		// Jawab sebagai Bot, sesi tetap di bot (bot_handled=false), unread tidak naik.
		var msgID string
		_ = pool.QueryRow(ctx, `insert into livechat_messages (session_id, direction, sender_name, body) values ($1,'outbound','Bot',$2) returning id`, sessionID, answer).Scan(&msgID)
		_, _ = pool.Exec(ctx, `update livechat_sessions set last_message=$1, last_message_at=now(), updated_at=now() where id=$2`, answer, sessionID)
		SendAgentMessageToVisitor(sessionID, answer, "", "Bot")
		TheSSEHub.BroadcastNewMessage("", sessionID, Message{ID: msgID, SessionID: sessionID, Direction: "outbound", Body: answer})
		return
	}

	// Teruskan ke agent.
	if matched && answer != "" {
		var msgID string
		_ = pool.QueryRow(ctx, `insert into livechat_messages (session_id, direction, sender_name, body) values ($1,'outbound','Bot',$2) returning id`, sessionID, answer).Scan(&msgID)
		SendAgentMessageToVisitor(sessionID, answer, "", "Bot")
	}
	_, _ = pool.Exec(ctx, `update livechat_sessions set bot_handled=true, unread_count=unread_count+1, last_inbound_at=now(), last_message=$1, last_message_at=now(), updated_at=now() where id=$2`, body, sessionID)
	go broadcastQueueUpdate(ctx, pool, companyIDOf(ctx, pool, sessionID))
}

func matchKeywords(lower, keywords string) bool {
	for _, k := range strings.Split(keywords, ",") {
		k = strings.TrimSpace(strings.ToLower(k))
		if k != "" && strings.Contains(lower, k) {
			return true
		}
	}
	return false
}

func companyIDOf(ctx context.Context, pool *pgxpool.Pool, sessionID string) string {
	var c *string
	_ = pool.QueryRow(ctx, `select company_id from livechat_sessions where id=$1`, sessionID).Scan(&c)
	if c == nil {
		return ""
	}
	return *c
}
