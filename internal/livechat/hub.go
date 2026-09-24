package livechat

import (
	"sync"
	"time"
)

// Client represents a WebSocket client connection
type Client struct {
	Hub       *Hub
	Conn      interface{} // *websocket.Conn, interface{} to avoid import cycle
	SessionID string
	CompanyID string
	Role      string // visitor, agent
	Send      chan []byte
}

// Hub manages WebSocket connections for livechat
type Hub struct {
	mu         sync.RWMutex
	clients    map[string]map[*Client]bool // sessionID -> clients (for visitor)
	agents     map[string]map[*Client]bool // companyID -> agent clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan *broadcastMsg
}

type broadcastMsg struct {
	targetType string // "session", "company"
	targetID   string
	msg        []byte
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]bool),
		agents:     make(map[string]map[*Client]bool),
		register:   make(chan *Client, 256),
		unregister: make(chan *Client, 256),
		broadcast:  make(chan *broadcastMsg, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if client.Role == "agent" {
				if h.agents[client.CompanyID] == nil {
					h.agents[client.CompanyID] = make(map[*Client]bool)
				}
				h.agents[client.CompanyID][client] = true
			} else {
				if h.clients[client.SessionID] == nil {
					h.clients[client.SessionID] = make(map[*Client]bool)
				}
				h.clients[client.SessionID][client] = true
			}
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if client.Role == "agent" {
				if clients, ok := h.agents[client.CompanyID]; ok {
					delete(clients, client)
					if len(clients) == 0 {
						delete(h.agents, client.CompanyID)
					}
				}
			} else {
				if clients, ok := h.clients[client.SessionID]; ok {
					delete(clients, client)
					if len(clients) == 0 {
						delete(h.clients, client.SessionID)
					}
				}
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.mu.RLock()
			switch msg.targetType {
			case "session":
				if clients, ok := h.clients[msg.targetID]; ok {
					for client := range clients {
						select {
						case client.Send <- msg.msg:
						default:
							h.mu.RUnlock()
							h.mu.Lock()
							delete(h.clients[msg.targetID], client)
							h.mu.Unlock()
							h.mu.RLock()
						}
					}
				}
			case "company":
				if agents, ok := h.agents[msg.targetID]; ok {
					for agent := range agents {
						select {
						case agent.Send <- msg.msg:
						default:
							h.mu.RUnlock()
							h.mu.Lock()
							delete(h.agents[msg.targetID], agent)
							h.mu.Unlock()
							h.mu.RLock()
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register adds a client to the hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// BroadcastToSession sends a message to all clients in a session (visitor)
func (h *Hub) BroadcastToSession(sessionID string, msg []byte) {
	h.broadcast <- &broadcastMsg{targetType: "session", targetID: sessionID, msg: msg}
}

// BroadcastToCompany sends a message to all agents in a company
func (h *Hub) BroadcastToCompany(companyID string, msg []byte) {
	h.broadcast <- &broadcastMsg{targetType: "company", targetID: companyID, msg: msg}
}

// GetOnlineAgents returns count of connected agents for a company
func (h *Hub) GetOnlineAgentCount(companyID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if agents, ok := h.agents[companyID]; ok {
		return len(agents)
	}
	return 0
}

// pingLoop sends periodic pings to keep connections alive
func (h *Hub) StartPingLoop() {
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for range ticker.C {
			h.mu.RLock()
			pingMsg := []byte(`{"type":"ping"}`)
			for _, agents := range h.agents {
				for agent := range agents {
					select {
					case agent.Send <- pingMsg:
					default:
					}
				}
			}
			h.mu.RUnlock()
		}
	}()
}

// TheHub and TheSSEHub are exported for use by handlers and websocket
var TheHub *Hub
var TheSSEHub *SSEHub

func init() {
	TheHub = NewHub()
	go TheHub.Run()
	TheSSEHub = NewSSEHub()
}
