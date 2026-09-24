package livechat

import (
	"encoding/json"
	"sync"
)

// SSEClient represents an SSE connection for a company
type SSEClient struct {
	CompanyID string
	Channel   chan []byte
}

// SSEHub manages Server-Sent Events connections
type SSEHub struct {
	mu      sync.RWMutex
	clients map[string][]chan []byte // companyID -> channels
}

// NewSSEHub creates a new SSE hub
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[string][]chan []byte),
	}
}

// AddClient registers a new SSE client for a company
func (h *SSEHub) AddClient(companyID string) chan []byte {
	h.mu.Lock()
	defer h.mu.Unlock()
	ch := make(chan []byte, 256)
	h.clients[companyID] = append(h.clients[companyID], ch)
	return ch
}

// RemoveClient unregisters an SSE client
func (h *SSEHub) RemoveClient(companyID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.clients[companyID]; ok {
		for i, c := range clients {
			if c == ch {
				h.clients[companyID] = append(clients[:i], clients[i+1:]...)
				close(ch)
				break
			}
		}
		if len(h.clients[companyID]) == 0 {
			delete(h.clients, companyID)
		}
	}
}

// Broadcast sends an event to all SSE clients of a company
func (h *SSEHub) Broadcast(companyID string, event SSEEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if clients, ok := h.clients[companyID]; ok {
		for _, ch := range clients {
			select {
			case ch <- data:
			default:
			}
		}
	}
}

// BroadcastNewMessage notifies agents of a new message
func (h *SSEHub) BroadcastNewMessage(companyID string, sessionID string, msg Message) {
	h.Broadcast(companyID, SSEEvent{
		Type: "new_message",
		Payload: map[string]interface{}{
			"session_id": sessionID,
			"message":    msg,
		},
	})
}

// BroadcastSessionAssigned notifies agents that a session was assigned
func (h *SSEHub) BroadcastSessionAssigned(companyID string, sessionID string, agentID string) {
	h.Broadcast(companyID, SSEEvent{
		Type: "session_assigned",
		Payload: map[string]interface{}{
			"session_id": sessionID,
			"agent_id":   agentID,
		},
	})
}

// BroadcastQueueUpdate notifies agents of queue changes
func (h *SSEHub) BroadcastQueueUpdate(companyID string, queue []Session) {
	h.Broadcast(companyID, SSEEvent{
		Type:    "queue_update",
		Payload: queue,
	})
}
