package main

import (
	"context"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/i18n"
)

type contextKey string

const userContextKey = contextKey("user")
const languageContextKey = contextKey("language")

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

func (app *application) contextSetLanguage(r *http.Request, lang i18n.Language) *http.Request {
	ctx := context.WithValue(r.Context(), languageContextKey, lang)
	return r.WithContext(ctx)
}

func (app *application) contextGetLanguage(r *http.Request) i18n.Language {
	lang, ok := r.Context().Value(languageContextKey).(i18n.Language)
	if !ok {
		return i18n.English
	}

	return lang
}
