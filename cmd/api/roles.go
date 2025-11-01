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

	if data.ValidateRole(v, role); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Roles.Insert(role)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			v.AddError("params", "projectID: does not exist or is invalid")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("name", "already exists for this project")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicatePermissionID):
			v.AddError("permissions_ids", "contain duplicate IDs")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions_ids", "contain invalid IDs")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users_ids", "contain invalid IDs")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserRole):
			v.AddError("users_ids", "contain duplicate IDs")
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
		v.AddError("url", "role does not belong to the specified project")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if role.IsProtected {
		v := validator.New()
		v.AddError("role", "cannot be modified")
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

	if data.ValidateRole(v, role); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Roles.Update(role)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("name", "already exists for this project")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicatePermissionID):
			v.AddError("permissions_ids", "contain duplicate IDs")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions_ids", "contain invalid IDs")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users_ids", "contain invalid IDs")
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
		v.AddError("url", "role does not belong to the specified project")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if role.IsProtected {
		v := validator.New()
		v.AddError("role", "cannot be deleted")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Roles.Delete(roleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "role successfully deleted"}, nil)
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
