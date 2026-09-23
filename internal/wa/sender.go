package wa

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Sender mengirim pesan via channel official (Meta Cloud API)
// atau unofficial (gateway Baileys via HTTP).
type Result struct {
	OK         bool
	ExternalID string
	Err        string
}

type sender struct{ client *http.Client }

// Sender pengirim WA (official/unofficial), bisa di-mock di test.
type Sender interface {
	Send(channelType string, cfg map[string]string, to, body string) Result
}

func New() Sender { return &sender{client: &http.Client{Timeout: 20 * time.Second}} }

// cfg: official {phone_number_id, access_token}; unofficial {gateway_url, api_key, session}
func (s *sender) Send(channelType string, cfg map[string]string, to, body string) Result {
	if channelType == "official" {
		return s.official(to, body, cfg)
	}
	return s.unofficial(to, body, cfg)
}

func (s *sender) official(to, body string, cfg map[string]string) Result {
	pid, tok := cfg["phone_number_id"], cfg["access_token"]
	if pid == "" || tok == "" {
		return Result{Err: "config official belum lengkap (phone_number_id/access_token)"}
	}
	payload, _ := json.Marshal(map[string]any{
		"messaging_product": "whatsapp", "to": to, "type": "text", "text": map[string]string{"body": body},
	})
	req, _ := http.NewRequest("POST", "https://graph.facebook.com/v21.0/"+pid+"/messages", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return Result{Err: "gateway tidak terjangkau: " + err.Error()}
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	var data struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.Unmarshal(b, &data)
	if resp.StatusCode >= 300 {
		msg := fmt.Sprintf("HTTP %d", resp.StatusCode)
		if data.Error != nil {
			msg = data.Error.Message
		}
		return Result{Err: msg}
	}
	id := ""
	if len(data.Messages) > 0 {
		id = data.Messages[0].ID
	}
	return Result{OK: true, ExternalID: id}
}

func (s *sender) unofficial(to, body string, cfg map[string]string) Result {
	gw := strings.TrimSuffix(cfg["gateway_url"], "/")
	if gw == "" {
		return Result{Err: "config unofficial belum lengkap (gateway_url)"}
	}
	payload, _ := json.Marshal(map[string]string{"to": to, "message": body, "session": first(cfg["session"], "default")})
	req, _ := http.NewRequest("POST", gw+"/send", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	if cfg["api_key"] != "" {
		req.Header.Set("X-Api-Key", cfg["api_key"])
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return Result{Err: "gateway tidak terjangkau: " + err.Error()}
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	var data map[string]string
	_ = json.Unmarshal(b, &data)
	if resp.StatusCode >= 300 {
		return Result{Err: first(data["error"], fmt.Sprintf("HTTP %d", resp.StatusCode))}
	}
	return Result{OK: true, ExternalID: data["id"]}
}

func first(a, b string) string {
	if a != "" {
		return a
	}
	return b
}
