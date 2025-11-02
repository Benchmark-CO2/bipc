package main

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name         string  `json:"name"`
		CEP          *string `json:"cep"`
		State        string  `json:"state"`
		City         string  `json:"city"`
		Neighborhood *string `json:"neighborhood"`
		Street       *string `json:"street"`
		Number       *string `json:"number"`
		Phase        string  `json:"phase"`
		Description  *string `json:"description"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project := &data.Project{
		Name:         input.Name,
		CEP:          input.CEP,
		State:        strings.ToUpper(input.State),
		City:         input.City,
		Neighborhood: input.Neighborhood,
		Street:       input.Street,
		Number:       input.Number,
		Phase:        input.Phase,
		Description:  input.Description,
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.Insert(project, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			v.AddError("projects(id)", "the provided projectID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users(id)", "the provided userID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserProject):
			v.AddError("users_projects", "user is already associated with the project")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("roles(name)", "you already have a role with this name")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions(id)", "the provided permissionID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidRoleID):
			v.AddError("roles(id)", "the provided roleID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRolePermission):
			v.AddError("roles_permissions", "role already has permission associated")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserRole):
			v.AddError("users_roles", "user already has role associated")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	headers := make(http.Header)
	headers.Set("Location", fmt.Sprintf("/project/%s", project.ID))

	err = app.writeJSON(w, http.StatusCreated, envelope{"project": project}, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) showProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	project, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) updateProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	projectWithUnits, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	project := &projectWithUnits.Project

	var input struct {
		Name         *string `json:"name"`
		CEP          *string `json:"cep"`
		State        *string `json:"state"`
		City         *string `json:"city"`
		Neighborhood *string `json:"neighborhood"`
		Street       *string `json:"street"`
		Number       *string `json:"number"`
		Phase        *string `json:"phase"`
		Description  *string `json:"description"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name != nil {
		project.Name = *input.Name
	}

	if input.CEP != nil {
		project.CEP = input.CEP
	}

	if input.State != nil {
		project.State = strings.ToUpper(*input.State)
	}

	if input.City != nil {
		project.City = *input.City
	}

	if input.Neighborhood != nil {
		project.Neighborhood = input.Neighborhood
	}

	if input.Street != nil {
		project.Street = input.Street
	}

	if input.Number != nil {
		project.Number = input.Number
	}

	if input.Phase != nil {
		project.Phase = *input.Phase
	}

	if input.Description != nil {
		project.Description = input.Description
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.Update(project)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	err := app.models.Projects.Delete(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "project successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listProjectsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name string `json:"name"`
		data.Filters
	}

	v := validator.New()

	qs := r.URL.Query()

	input.Name = app.readString(qs, "name", "")

	input.Filters.Page = app.readInt(qs, "page", 1, v)
	input.Filters.PageSize = app.readInt(qs, "page_size", 10, v)
	input.Filters.Sort = app.readString(qs, "sort", "-id")
	input.Filters.SortSafelist = []string{
		"id",
		"created_at",
		"name",
		"state",
		"city",
		"phase",
		"-id",
		"-created_at",
		"-name",
		"-state",
		"-city",
		"-phase",
	}

	if data.ValidateFilters(v, input.Filters); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	projects, metadata, err := app.models.Projects.GetAll(input.Name, input.Filters, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"projects": projects, "metadata": metadata}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) inviteUserHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	projectID, _ := app.readUUIDParam(r, "projectID")

	var input struct {
		Email string `json:"email"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateEmail(v, input.Email); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user_invited, err := app.models.Users.GetByEmail(input.Email)
	if err != nil && !errors.Is(err, data.ErrRecordNotFound) {
		app.serverErrorResponse(w, r, err)
		return
	}

	if user_invited != nil {
		isMember, err := app.models.Projects.IsUserInProject(user_invited.ID, projectID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		if isMember {
			v.AddError("email", "this user is already a member of the project")
			app.failedValidationResponse(w, r, v.Errors)
			return
		}
	}

	invitation := &data.Invitation{
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		InviterID: user.ID,
		ProjectID: projectID,
		Email:     input.Email,
	}

	err = app.models.Invitations.Insert(invitation)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicatePendingInvitation):
			v.AddError("email", "a pending invitation already exists for this email in this project")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.background(func() {
		project, err := app.models.Projects.GetByID(projectID)
		if err != nil {
			app.logger.Error(err.Error())
			return
		}

		data := map[string]any{
			"projectName": project.Name,
			"inviterName": user.Name,
			"url":         app.config.url,
		}

		err = app.mailer.Send(input.Email, "invitation.gohtml", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "invitation sent successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) removeUserHandler(w http.ResponseWriter, r *http.Request) {

	projectID, _ := app.readUUIDParam(r, "projectID")

	var input struct {
		UserID uuid.UUID `json:"user_id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	permissions, err := app.models.Roles.GetPermissionsForUser(input.UserID, projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if permissions.Include("*:*") {
		v := validator.New()
		v.AddError("user_id", "cannot remove a user with full permissions from the project")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.RemoveUser(projectID, input.UserID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "user successfully removed from project"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
