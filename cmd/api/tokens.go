package main

import (
	"errors"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

func (app *application) createAuthenticationTokenHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	data.ValidateEmail(v, input.Email, lang)
	data.ValidatePasswordPlaintext(v, input.Password, lang)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmail(input.Email)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.invalidCredentialsResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	match, err := user.Password.Matches(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if !match {
		app.invalidCredentialsResponse(w, r)
		return
	}

	var ip string

	if strings.ContainsRune(r.RemoteAddr, ':') {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	} else {
		ip = r.RemoteAddr
	}

	token, err := app.models.Tokens.New(user.ID, 24*time.Hour, data.ScopeAuthentication, &ip)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"authentication_token": token, "user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) createPasswordResetTokenHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateEmail(v, input.Email, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmail(input.Email)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			message := app.localizer.GetLocalizedMessage(lang, "no_matching_email")
			v.AddError("email", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if !user.Activated {
		message := app.localizer.GetLocalizedMessage(lang, "user_account_not_activated")
		v.AddError("email", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	token, err := app.models.Tokens.New(user.ID, 1*time.Hour, data.ScopePasswordReset, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.background(func() {
		data := map[string]any{
			"passwordResetToken": token.Plaintext,
			"url":                app.config.url,
		}

		err := app.mailer.Send(user.Email, "token_password_reset.gohtml", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	message := app.localizer.GetLocalizedMessage(lang, "password_reset_email_sent")
	env := envelope{"message": message}

	err = app.writeJSON(w, http.StatusAccepted, env, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) createActivationTokenHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateEmail(v, input.Email, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmail(input.Email)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			message := app.localizer.GetLocalizedMessage(lang, "no_matching_email")
			v.AddError("email", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if user.Activated {
		message := app.localizer.GetLocalizedMessage(lang, "user_already_activated")
		v.AddError("email", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	token, err := app.models.Tokens.New(user.ID, 3*24*time.Hour, data.ScopeActivation, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.background(func() {
		data := map[string]any{
			"activationToken": token.Plaintext,
			"url":             app.config.url,
		}

		err := app.mailer.Send(user.Email, "token_activation.gohtml", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	message := app.localizer.GetLocalizedMessage(lang, "activation_email_sent")
	env := envelope{"message": message}

	err = app.writeJSON(w, http.StatusAccepted, env, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) createAPIKeyHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	err := app.models.Tokens.DeleteAllForUser(data.ScopeAPIKey, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	token, err := app.models.Tokens.New(user.ID, 100*365*24*time.Hour, data.ScopeAPIKey, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"api_key": token.Plaintext}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
