package main

import (
	"errors"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

func (app *application) createRoleHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	var input struct {
		Name           string      `json:"name"`
		Description    *string     `json:"description"`
		Simulation     *bool       `json:"simulation"`
		PermissionsIDs []int32     `json:"permissions_ids"`
		UsersIDs       []uuid.UUID `json:"users_ids"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	role := &data.RoleWithUsersPermissions{
		Role: data.Role{
			ProjectID:   projectID,
			Name:        input.Name,
			Description: input.Description,
			Simulation:  input.Simulation == nil || *input.Simulation,
			IsProtected: false,
		},
		PermissionsIDs: input.PermissionsIDs,
		UsersIDs:       input.UsersIDs,
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateRole(v, role, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	roleID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	role.ID = roleID

	err = app.models.Roles.Insert(role)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_project_id_param")
			v.AddError("params", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRoleName):
			message := app.localizer.GetLocalizedMessage(lang, "role_name_already_exists")
			v.AddError("name", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicatePermissionID):
			message := app.localizer.GetLocalizedMessage(lang, "duplicate_permission_ids")
			v.AddError("permissions_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_permission_ids")
			v.AddError("permissions_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_user_ids")
			v.AddError("users_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserRole):
			message := app.localizer.GetLocalizedMessage(lang, "duplicate_user_ids")
			v.AddError("users_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"role": role}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateRoleHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	roleID, err := app.readUUIDParam(r, "roleID")
	if err != nil {
		v := validator.New()
		v.AddError("url", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	role, err := app.models.Roles.GetByID(roleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if role.ProjectID != projectID {
		v := validator.New()
		lang := app.contextGetLanguage(r)
		message := app.localizer.GetLocalizedMessage(lang, "role_not_in_project")
		v.AddError("url", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if role.IsProtected {
		v := validator.New()
		lang := app.contextGetLanguage(r)
		message := app.localizer.GetLocalizedMessage(lang, "role_cannot_be_modified")
		v.AddError("role", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	var input struct {
		Name           *string     `json:"name"`
		Description    *string     `json:"description"`
		Simulation     *bool       `json:"simulation"`
		PermissionsIDs []int32     `json:"permissions_ids"`
		UsersIDs       []uuid.UUID `json:"users_ids"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name != nil {
		role.Name = *input.Name
	}

	if input.Description != nil {
		role.Description = input.Description
	}

	if input.Simulation != nil {
		role.Simulation = *input.Simulation
	}

	if input.PermissionsIDs != nil {
		role.PermissionsIDs = input.PermissionsIDs
	}

	if input.UsersIDs != nil {
		role.UsersIDs = input.UsersIDs
	}

	v := validator.New()
	lang := app.contextGetLanguage(r)

	if data.ValidateRole(v, role, lang); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Roles.Update(role)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateRoleName):
			message := app.localizer.GetLocalizedMessage(lang, "role_name_already_exists")
			v.AddError("name", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicatePermissionID):
			message := app.localizer.GetLocalizedMessage(lang, "duplicate_permission_ids")
			v.AddError("permissions_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_permission_ids")
			v.AddError("permissions_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			message := app.localizer.GetLocalizedMessage(lang, "invalid_user_ids")
			v.AddError("users_ids", message)
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"role": role}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteRoleHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	roleID, err := app.readUUIDParam(r, "roleID")
	if err != nil {
		v := validator.New()
		v.AddError("url", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	role, err := app.models.Roles.GetByID(roleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if role.ProjectID != projectID {
		v := validator.New()
		lang := app.contextGetLanguage(r)
		message := app.localizer.GetLocalizedMessage(lang, "role_not_in_project")
		v.AddError("url", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if role.IsProtected {
		v := validator.New()
		lang := app.contextGetLanguage(r)
		message := app.localizer.GetLocalizedMessage(lang, "role_cannot_be_deleted")
		v.AddError("role", message)
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Roles.Delete(roleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "role_deleted_success")
	err = app.writeJSON(w, http.StatusOK, envelope{"message": message}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listCollaboratorsHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	collaborators, err := app.models.Roles.Collaborators(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"data": collaborators}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listUserPermissionsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)
	projectID, _ := app.readUUIDParam(r, "projectID")

	permissions, err := app.models.Roles.GetPermissionsForUser(user.ID, projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"permissions": permissions}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) transferOwnershipHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	var input struct {
		NewOwnerID uuid.UUID `json:"new_owner_id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.models.Roles.TransferOwnership(projectID, input.NewOwnerID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	lang := app.contextGetLanguage(r)
	message := app.localizer.GetLocalizedMessage(lang, "ownership_transferred_success")
	err = app.writeJSON(w, http.StatusOK, envelope{"message": message}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
