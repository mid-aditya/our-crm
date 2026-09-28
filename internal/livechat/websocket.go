package livechat

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"crm-backend/internal/middleware"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development; restrict in production
	},
}

// WebSocketHandler handles WebSocket upgrade for livechat
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	companyID := r.URL.Query().Get("company_id")
	role := r.URL.Query().Get("role")

	if role == "visitor" && (sessionID == "" || companyID == "") {
		http.Error(w, "session_id and company_id required for visitors", http.StatusBadRequest)
		return
	}
	if role == "agent" && companyID == "" {
		http.Error(w, "company_id required for agents", http.StatusBadRequest)
		return
	}
	if role != "visitor" && role != "agent" {
		http.Error(w, "role must be visitor or agent", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("websocket upgrade error: %v", err)
		return
	}

	client := &Client{
		Hub:       TheHub,
		Conn:      conn,
		SessionID: sessionID,
		CompanyID: companyID,
		Role:      role,
		Send:      make(chan []byte, 256),
		Pool:      tenantPoolFor(r.Context(), r, companyID),
	}

	TheHub.Register(client)

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		TheHub.Unregister(c)
		if conn, ok := c.Conn.(*websocket.Conn); ok {
			conn.Close()
		}
	}()

	if c.Role == "agent" {
		// Agents receive all messages from their company's sessions
		return // Agents don't read incoming messages, they just receive broadcasts
	}

	for {
		_, msgBytes, err := c.Conn.(*websocket.Conn).ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket error: %v", err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(msgBytes, &wsMsg); err != nil {
			continue
		}

		switch wsMsg.Type {
		case "visitor_message":
			c.handleVisitorMessage(wsMsg)
		case "typing":
			c.handleTyping(wsMsg)
		case "ping":
			c.sendJSON(WSMessage{Type: "pong"})
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		if conn, ok := c.Conn.(*websocket.Conn); ok {
			conn.Close()
		}
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				c.Conn.(*websocket.Conn).Close()
				return
			}
			if err := c.Conn.(*websocket.Conn).WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.Conn.(*websocket.Conn).WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleVisitorMessage(wsMsg WSMessage) {
	// Simpan ke DB agar agent yang baru membuka sesi tetap melihat history,
	// lalu broadcast ke agent perusahaan.
	if c.Pool != nil && c.SessionID != "" {
		name := wsMsg.SenderName
		if name == "" {
			name = "Guest"
		}
		if _, err := SaveVisitorMessage(context.Background(), c.Pool, c.SessionID, wsMsg.Body, name); err != nil {
			log.Printf("livechat: gagal simpan pesan visitor: %v", err)
		} else {
			_, _ = c.Pool.Exec(context.Background(), `update livechat_sessions set status='waiting', waiting_since=now(), updated_at=now() where id=$1 and status='resolved'`, c.SessionID)
		}
		// Bot menghandle dulu sebelum didistribusi ke agent.
		runBotResponder(c.Pool, c.SessionID, wsMsg.Body)
	}
	notifyMsg, _ := json.Marshal(WSMessage{
		Type:       "visitor_message",
		SessionID:  c.SessionID,
		Body:       wsMsg.Body,
		SenderID:   wsMsg.SenderID,
		SenderName: wsMsg.SenderName,
	})
	TheHub.BroadcastToCompany(c.CompanyID, notifyMsg)
}

// tenantPoolFor resolve pool tenant dari company_id (untuk WS publik tanpa JWT).
func tenantPoolFor(ctx context.Context, r *http.Request, companyID string) *pgxpool.Pool {
	if companyID == "" {
		return nil
	}
	app := middleware.AppFrom(r)
	if app == nil {
		return nil
	}
	pool, err := app.TenantPool(ctx, companyID)
	if err != nil {
		log.Printf("livechat: tenant pool gagal untuk %s: %v", companyID, err)
		return nil
	}
	return pool
}

func (c *Client) handleTyping(wsMsg WSMessage) {
	notifyMsg, _ := json.Marshal(WSMessage{
		Type:       "typing",
		SessionID:  c.SessionID,
		SenderName: wsMsg.SenderName,
	})
	TheHub.BroadcastToCompany(c.CompanyID, notifyMsg)
}

func (c *Client) sendJSON(msg WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.Send <- data:
	default:
	}
}

// NotifySessionAssigned sends assigned notification to visitor
func NotifySessionAssigned(sessionID string, agentID string, agentName string) {
	msg := WSMessage{
		Type:       "assigned",
		AgentID:    agentID,
		SenderName: agentName,
	}
	data, _ := json.Marshal(msg)
	TheHub.BroadcastToSession(sessionID, data)
}

// NotifyAgentOfMessage sends a message to the assigned agent
func NotifyAgentOfMessage(companyID string, sessionID string, msg Message) {
	senderName := ""
	if msg.SenderName != nil {
		senderName = *msg.SenderName
	}
	wsMsg := WSMessage{
		Type:       "visitor_message",
		SessionID:  sessionID,
		Body:       msg.Body,
		SenderName: senderName,
	}
	data, _ := json.Marshal(wsMsg)
	TheHub.BroadcastToCompany(companyID, data)
}

// SendAgentMessageToVisitor sends an agent message to the visitor
func SendAgentMessageToVisitor(sessionID string, body string, agentID string, agentName string) {
	msg := WSMessage{
		Type:       "agent_message",
		SessionID:  sessionID,
		Body:       body,
		SenderID:   agentID,
		SenderName: agentName,
	}
	data, _ := json.Marshal(msg)
	TheHub.BroadcastToSession(sessionID, data)
}
