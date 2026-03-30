package main

import (
	"net/http"
)

func (app *application) logError(r *http.Request, err error) {
	var (
		method = r.Method
		uri    = r.URL.RequestURI()
	)

	app.logger.Error(err.Error(), "method", method, "uri", uri)
}

func (app *application) errorResponse(w http.ResponseWriter, r *http.Request, status int, message any) {
	env := envelope{"error": message}

	err := app.writeJSON(w, status, env, nil)
	if err != nil {
		app.logError(r, err)
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func (app *application) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.logError(r, err)
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "server_error")
	app.errorResponse(w, r, http.StatusInternalServerError, message)
}

func (app *application) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "not_found")
	app.errorResponse(w, r, http.StatusNotFound, message)
}

func (app *application) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessageWithArgs(lang, "method_not_allowed", r.Method)
	app.errorResponse(w, r, http.StatusMethodNotAllowed, message)
}

func (app *application) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.errorResponse(w, r, http.StatusBadRequest, err.Error())
}

func (app *application) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) {
	app.errorResponse(w, r, http.StatusUnprocessableEntity, errors)
}

func (app *application) editConflictResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "edit_conflict")
	app.errorResponse(w, r, http.StatusConflict, message)
}

func (app *application) rateLimitExceededResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "rate_limit_exceeded")
	app.errorResponse(w, r, http.StatusTooManyRequests, message)
}

func (app *application) invalidCredentialsResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "invalid_credentials")
	app.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (app *application) invalidAuthenticationTokenResponse(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("WWW-Authenticate", "Bearer")

	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "invalid_auth_token")
	app.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (app *application) authenticationRequiredResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "authentication_required")
	app.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (app *application) inactiveAccountResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "inactive_account")
	app.errorResponse(w, r, http.StatusForbidden, message)
}

func (app *application) notPermittedResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "not_permitted")
	app.errorResponse(w, r, http.StatusForbidden, message)
}

func (app *application) unprocessableEntityResponse(w http.ResponseWriter, r *http.Request, err error) {
	app.errorResponse(w, r, http.StatusUnprocessableEntity, err.Error())
}

func (app *application) cannotDeleteAdminUserResponse(w http.ResponseWriter, r *http.Request) {
	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "cannot_delete_admin")
	app.errorResponse(w, r, http.StatusForbidden, message)
}
