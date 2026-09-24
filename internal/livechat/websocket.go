package livechat

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
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
	// Save message to DB (handled by caller or DB layer)
	// Broadcast to assigned agent via hub
	notifyMsg, _ := json.Marshal(WSMessage{
		Type:       "visitor_message",
		SessionID:  c.SessionID,
		Body:       wsMsg.Body,
		SenderName: wsMsg.SenderName,
	})
	TheHub.BroadcastToCompany(c.CompanyID, notifyMsg)
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
