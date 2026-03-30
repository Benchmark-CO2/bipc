package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

func (app *application) registerUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string     `json:"name"`
		Email      string     `json:"email"`
		Password   string     `json:"password"`
		Type       string     `json:"type"`
		Cnpj       *string    `json:"cnpj"`
		CreaCau    *string    `json:"crea_cau"`
		Birthdate  *time.Time `json:"birthdate"`
		City       *string    `json:"city"`
		Activity   *string    `json:"activity"`
		Enterprise *string    `json:"enterprise"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := &data.User{
		Name:       input.Name,
		Email:      input.Email,
		Activated:  false,
		Type:       input.Type,
		Cnpj:       input.Cnpj,
		CreaCau:    input.CreaCau,
		Birthdate:  input.Birthdate,
		City:       input.City,
		Activity:   input.Activity,
		Enterprise: input.Enterprise,
	}

	err = user.Password.Set(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateUser(v, user, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Users.Insert(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateEmail):
			message := app.localizer.GetLocalizedMessage(lang, "duplicate_email")
			v.AddError("email", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
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
			"userID":          user.ID,
			"url":             app.config.url,
		}

		err = app.mailer.Send(user.Email, "user_welcome.gohtml", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	err = app.writeJSON(w, http.StatusAccepted, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateUserHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name       *string    `json:"name"`
		Email      *string    `json:"email"`
		Password   *string    `json:"password"`
		Type       *string    `json:"type"`
		Cnpj       *string    `json:"cnpj"`
		CreaCau    *string    `json:"crea_cau"`
		Birthdate  *time.Time `json:"birthdate"`
		City       *string    `json:"city"`
		Activity   *string    `json:"activity"`
		Enterprise *string    `json:"enterprise"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name != nil {
		user.Name = *input.Name
	}

	if input.Email != nil {
		user.Email = *input.Email
		user.Activated = false
	}

	if input.Password != nil {
		err = user.Password.Set(*input.Password)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	if input.Type != nil {
		user.Type = *input.Type
	}

	if input.Cnpj != nil {
		user.Cnpj = input.Cnpj
	}

	if input.CreaCau != nil {
		user.CreaCau = input.CreaCau
	}

	if input.Birthdate != nil {
		user.Birthdate = input.Birthdate
	}

	if input.City != nil {
		user.City = input.City
	}

	if input.Activity != nil {
		user.Activity = input.Activity
	}

	if input.Enterprise != nil {
		user.Enterprise = input.Enterprise
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateUser(v, user, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateEmail):
			message := app.localizer.GetLocalizedMessage(lang, "duplicate_email")
			v.AddError("email", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) activateUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TokenPlaintext string `json:"token"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateTokenPlaintext(v, input.TokenPlaintext, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetForToken(data.ScopeActivation, input.TokenPlaintext)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_activation_token")
			v.AddError("token", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user.Activated = true

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.Tokens.DeleteAllForUser(data.ScopeActivation, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateUserPasswordHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Password       string `json:"password"`
		TokenPlaintext string `json:"token"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	data.ValidatePasswordPlaintext(v, input.Password, lang)
	data.ValidateTokenPlaintext(v, input.TokenPlaintext, lang)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetForToken(data.ScopePasswordReset, input.TokenPlaintext)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			message := app.localizer.GetLocalizedMessage(lang, "missing_password_reset_token")
			v.AddError("token", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = user.Password.Set(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.Tokens.DeleteAllForUser(data.ScopePasswordReset, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	message := app.localizer.GetLocalizedMessage(lang, "password_reset_success")
	env := envelope{"message": message}

	err = app.writeJSON(w, http.StatusOK, env, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) userCollaboratorsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	users, err := app.models.Users.Collaborators(user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"users": users}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

func (app *application) pendingInvitationsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	invitations, err := app.models.Invitations.GetPendingByEmail(user.Email)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"invitations": invitations}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

func (app *application) replyInvitationHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	invitationID, err := app.readUUIDParam(r, "invitationID")
	if err != nil {
		v := validator.New()
		v.AddError("url", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	var input struct {
		Status string `json:"status"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateStatus(v, input.Status, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	invitation, err := app.models.Invitations.GetByID(invitationID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			message := app.localizer.GetLocalizedMessage(lang, "invitation_not_found")
			v.AddError("invitation", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.Invitations.Reply(invitation, input.Status, user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			message := app.localizer.GetLocalizedMessage(lang, "no_pending_invitation")
			v.AddError("invitation", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	message := app.localizer.GetLocalizedMessage(lang, "invitation_replied_success")
	err = app.writeJSON(w, http.StatusOK, envelope{"message": message}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	isAdmin, err := app.models.Roles.IsUserAdminInAnyProject(user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if isAdmin {
		app.cannotDeleteAdminUserResponse(w, r)
		return
	}

	err = app.models.Users.Delete(user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "user_deleted_success")
	err = app.writeJSON(w, http.StatusOK, envelope{"message": message}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
