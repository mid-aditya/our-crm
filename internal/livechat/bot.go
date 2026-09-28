package livechat

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// runBotResponder: bot menghandle customer lebih dulu dengan Q&A custom.
// Mendukung pertanyaan beranak: jawaban yang punya anak akan menawarkan opsi
// lanjutan, dan balasan berikutnya dicocokkan dulu ke anak-anak node aktif
// (bot_node_id di sesi) sebelum jatuh ke keyword level atas.
// - cocok keyword & escalate=false → jawab otomatis, sesi tetap di bot.
// - cocok & escalate=true, atau tidak cocok → teruskan ke antrian agent
//   (bot_handled=true, unread+1).
func runBotResponder(pool *pgxpool.Pool, sessionID, body string) {
	if pool == nil || sessionID == "" {
		return
	}
	ctx := context.Background()
	var handled bool
	var nodeID *string
	if err := pool.QueryRow(ctx, `select bot_handled, bot_node_id from livechat_sessions where id=$1`, sessionID).Scan(&handled, &nodeID); err != nil || handled {
		// Sudah di agent / sesi tak ada: naikkan unread saja.
		_, _ = pool.Exec(ctx, `update livechat_sessions set unread_count=unread_count+1, last_inbound_at=now(), updated_at=now() where id=$1`, sessionID)
		return
	}

	lower := strings.ToLower(body)

	// 1. Coba cocokkan ke anak-anak node aktif dulu.
	if nodeID != nil && *nodeID != "" {
		if child, ok := matchBotNode(ctx, pool, lower, nodeID); ok {
			answerBot(ctx, pool, sessionID, child, child.ID)
			return
		}
		// Tidak cocok ke anak: lanjut ke keyword level atas (mis. "agent").
	}

	// 2. Cocokkan ke node level atas.
	if top, ok := matchBotNode(ctx, pool, lower, nil); ok {
		answerBot(ctx, pool, sessionID, top, top.ID)
		return
	}

	// 3. Tidak cocok → teruskan ke agent.
	_, _ = pool.Exec(ctx, `update livechat_sessions set bot_handled=true, unread_count=unread_count+1, last_inbound_at=now(), last_message=$1, last_message_at=now(), updated_at=now() where id=$2`, body, sessionID)
	go broadcastQueueUpdate(ctx, pool, companyIDOf(ctx, pool, sessionID))
}

type botNode struct {
	ID       string
	Answer   string
	Escalate bool
	Children []botChild
}

type botChild struct {
	Question string
	Keywords string
}

// matchBotNode: cocokkan pesan ke node aktif (anak dari parentID, atau level
// atas bila parentID nil). Mengembalikan node + daftar anak aktifnya.
func matchBotNode(ctx context.Context, pool *pgxpool.Pool, lower string, parentID *string) (botNode, bool) {
	var q string
	var args []any
	if parentID == nil {
		q = `select id, keywords, answer, escalate from bot_qa where active=true and parent_id is null order by position, created_at`
	} else {
		q = `select id, keywords, answer, escalate from bot_qa where active=true and parent_id=$1 order by position, created_at`
		args = []any{*parentID}
	}
	r, err := pool.Query(ctx, q, args...)
	if err != nil {
		return botNode{}, false
	}
	defer r.Close()
	for r.Next() {
		var n botNode
		var kw string
		_ = r.Scan(&n.ID, &kw, &n.Answer, &n.Escalate)
		if matchKeywords(lower, kw) {
			n.Children = activeBotChildren(ctx, pool, n.ID)
			return n, true
		}
	}
	return botNode{}, false
}

func activeBotChildren(ctx context.Context, pool *pgxpool.Pool, parentID string) []botChild {
	r, err := pool.Query(ctx, `select question, keywords from bot_qa where active=true and parent_id=$1 order by position, created_at`, parentID)
	if err != nil {
		return nil
	}
	defer r.Close()
	var out []botChild
	for r.Next() {
		var c botChild
		_ = r.Scan(&c.Question, &c.Keywords)
		out = append(out, c)
	}
	return out
}

// sendBotGreeting: sapaan pembuka bot untuk sesi baru — visitor langsung
// terhubung ke bot (bukan menunggu agent). Opsi topik diambil dari Q&A
// level atas yang aktif; balasan berikutnya masuk runBotResponder.
func sendBotGreeting(pool *pgxpool.Pool, sessionID, visitorName string) {
	if pool == nil || sessionID == "" {
		return
	}
	ctx := context.Background()
	name := strings.TrimSpace(visitorName)
	hello := "Halo! Selamat datang di layanan kami. Saya Bot asisten virtual."
	if name != "" {
		hello = "Halo " + name + "! Selamat datang di layanan kami. Saya Bot asisten virtual."
	}
	text := hello + " Silakan langsung ketik pertanyaanmu di bawah ini."
	topics := activeBotChildrenTop(ctx, pool)
	if len(topics) > 0 {
		var opts []string
		for _, c := range topics {
			label := strings.TrimSpace(c.Question)
			if label == "" {
				label = firstKeyword(c.Keywords)
			}
			if label != "" {
				opts = append(opts, "- "+label)
			}
		}
		if len(opts) > 0 {
			text += "\n\nAtau pilih topik:\n" + strings.Join(opts, "\n")
		}
	}
	var msgID string
	_ = pool.QueryRow(ctx, `insert into livechat_messages (session_id, direction, sender_name, body) values ($1,'outbound','Bot',$2) returning id`, sessionID, text).Scan(&msgID)
	_, _ = pool.Exec(ctx, `update livechat_sessions set last_message=$1, last_message_at=now(), updated_at=now() where id=$2`, text, sessionID)
	botName := "Bot"
	TheSSEHub.BroadcastNewMessage("", sessionID, Message{ID: msgID, SessionID: sessionID, Direction: "outbound", SenderName: &botName, Body: text})
	go broadcastQueueUpdate(ctx, pool, companyIDOf(ctx, pool, sessionID))
}

// activeBotChildrenTop: Q&A level atas yang aktif (untuk opsi sapaan).
func activeBotChildrenTop(ctx context.Context, pool *pgxpool.Pool) []botChild {
	r, err := pool.Query(ctx, `select question, keywords from bot_qa where active=true and parent_id is null and coalesce(keywords,'') <> '' order by position, created_at limit 8`)
	if err != nil {
		return nil
	}
	defer r.Close()
	var out []botChild
	for r.Next() {
		var c botChild
		_ = r.Scan(&c.Question, &c.Keywords)
		out = append(out, c)
	}
	return out
}

// answerBot: kirim jawaban; bila escalate → teruskan ke agent,
// bila bukan → sesi tetap di bot dan node aktif dimajukan.
func answerBot(ctx context.Context, pool *pgxpool.Pool, sessionID string, n botNode, nodeID string) {
	text := n.Answer
	if len(n.Children) > 0 {
		var opts []string
		for _, c := range n.Children {
			label := strings.TrimSpace(c.Question)
			if label == "" {
				label = firstKeyword(c.Keywords)
			}
			if label != "" {
				opts = append(opts, "- "+label)
			}
		}
		if len(opts) > 0 {
			text += "\n\nBalas dengan salah satu:\n" + strings.Join(opts, "\n")
		}
	}
	var msgID string
	_ = pool.QueryRow(ctx, `insert into livechat_messages (session_id, direction, sender_name, body) values ($1,'outbound','Bot',$2) returning id`, sessionID, text).Scan(&msgID)
	SendAgentMessageToVisitor(sessionID, text, "", "Bot")
	TheSSEHub.BroadcastNewMessage("", sessionID, Message{ID: msgID, SessionID: sessionID, Direction: "outbound", Body: text})
	if n.Escalate {
		_, _ = pool.Exec(ctx, `update livechat_sessions set bot_handled=true, bot_node_id=null, unread_count=unread_count+1, last_inbound_at=now(), last_message=$1, last_message_at=now(), updated_at=now() where id=$2`, text, sessionID)
		go broadcastQueueUpdate(ctx, pool, companyIDOf(ctx, pool, sessionID))
		return
	}
	_, _ = pool.Exec(ctx, `update livechat_sessions set bot_node_id=$1, last_message=$2, last_message_at=now(), updated_at=now() where id=$3`, nodeID, text, sessionID)
}

func firstKeyword(keywords string) string {
	for _, k := range strings.Split(keywords, ",") {
		if k = strings.TrimSpace(k); k != "" {
			return k
		}
	}
	return ""
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
