package main

import (
	"context"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
)

type contextKey string

const (
	userContextKey   = contextKey("user")
	sourceContextKey = contextKey("source")

	SourceAPI    = "api"
	SourcePlugin = "plugin"
)

func (app *application) contextSetUser(r *http.Request, user *data.User) *http.Request {
	ctx := context.WithValue(r.Context(), userContextKey, user)
	return r.WithContext(ctx)
}

func (app *application) contextGetUser(r *http.Request) *data.User {
	user, ok := r.Context().Value(userContextKey).(*data.User)
	if !ok {
		panic("missing user value in request context")
	}

	return user
}

func (app *application) contextSetSource(r *http.Request, source string) *http.Request {
	ctx := context.WithValue(r.Context(), sourceContextKey, source)
	return r.WithContext(ctx)
}

func (app *application) contextGetSource(r *http.Request) string {
	source, ok := r.Context().Value(sourceContextKey).(string)
	if !ok {
		return SourceAPI
	}
	return source
}
