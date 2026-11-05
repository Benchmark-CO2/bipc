package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/google/uuid"
)

type SSEHub struct {
	mu      sync.RWMutex
	closed  bool
	clients map[uuid.UUID][]chan []byte // userID -> lista de canais (usuário pode ter várias abas/conexões)
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[uuid.UUID][]chan []byte),
	}
}

func (h *SSEHub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.closed = true

	for userID, conns := range h.clients {
		for _, ch := range conns {
			close(ch)
		}
		delete(h.clients, userID)
	}
}

func (h *SSEHub) Register(userID uuid.UUID) chan []byte {
	ch := make(chan []byte, 10) // buffer pra não travar o sender

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.closed {
		close(ch)
		return ch
	}

	h.clients[userID] = append(h.clients[userID], ch)
	return ch
}

func (h *SSEHub) Unregister(userID uuid.UUID, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns := h.clients[userID]
	for i, c := range conns {
		if c == ch {
			h.clients[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}

	if !h.closed {
		close(ch)
	}
}

// Manda notificação só pra um usuário específico
func (h *SSEHub) SendToUser(userID uuid.UUID, event string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	msg := formatSSE(event, data)
	for _, ch := range h.clients[userID] {
		select {
		case ch <- msg:
		default:
			// canal cheio, cliente lento — descarta ou loga
		}
	}
}

func formatSSE(event string, data []byte) []byte {
	return []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, data))
}

func (app *application) notificationHandler(w http.ResponseWriter, r *http.Request) {
	token := app.readString(r.URL.Query(), "token", "")

	user, err := app.models.Users.GetForToken(data.ScopeAuthentication, token)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.invalidAuthenticationTokenResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := app.sse.Register(user.ID)
	defer app.sse.Unregister(user.ID, ch)

	app.logger.Info("sse connection opened", "user_id", user.ID)

	for {
		select {
		case <-r.Context().Done():
			app.logger.Info("sse connection closed", "user_id", user.ID)
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			w.Write(msg)
			flusher.Flush()
		}
	}
}

func (app *application) sendNotificationHandler(w http.ResponseWriter, r *http.Request) {
	targetUserID, err := app.readUUIDParam(r, "userID")
	if err != nil {
		http.Error(w, "invalid userID", http.StatusBadRequest)
		return
	}

	var input struct {
		Event   string `json:"event"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	payload, _ := json.Marshal(map[string]string{"message": input.Message})
	app.sse.SendToUser(targetUserID, input.Event, payload)

	w.WriteHeader(http.StatusAccepted)
}
