package livechat

import "time"

// Session represents a livechat conversation session
type Session struct {
	ID              string     `json:"id"`
	CompanyID       string     `json:"company_id"`
	VisitorID       string     `json:"visitor_id"`
	VisitorName     *string    `json:"visitor_name"`
	VisitorEmail    *string    `json:"visitor_email"`
	AssignedAgentID *string    `json:"assigned_agent_id"`
	Status          string     `json:"status"` // waiting, assigned, resolved
	LastMessage     *string    `json:"last_message"`
	LastMessageAt   *time.Time `json:"last_message_at"`
	WaitingSince    time.Time  `json:"waiting_since"`
	ResolvedAt      *time.Time `json:"resolved_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// Message represents a chat message
type Message struct {
	ID         string    `json:"id"`
	SessionID  string    `json:"session_id"`
	Direction  string    `json:"direction"` // inbound, outbound
	SenderID   *string   `json:"sender_id"`
	SenderName *string   `json:"sender_name"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"created_at"`
}

// Distribution represents the distribution settings for a company
type Distribution struct {
	ID              string    `json:"id"`
	CompanyID       string    `json:"company_id"`
	Mode            string    `json:"mode"` // manual, auto
	RoundRobinIndex int       `json:"round_robin_index"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// SSEEvent represents an event sent to SSE clients
type SSEEvent struct {
	Type    string      `json:"type"` // new_message, session_assigned, queue_update
	Payload interface{} `json:"payload"`
}

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type       string `json:"type"` // visitor_message, agent_message, typing, assigned, ping, pong
	SessionID  string `json:"session_id,omitempty"`
	Body       string `json:"body,omitempty"`
	SenderID   string `json:"sender_id,omitempty"`
	SenderName string `json:"sender_name,omitempty"`
	AgentID    string `json:"agent_id,omitempty"`
}
