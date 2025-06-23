package main

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name         string  `json:"name"`
		CEP          string  `json:"cep"`
		State        string  `json:"state"`
		City         string  `json:"city"`
		Neighborhood string  `json:"neighborhood"`
		Street       string  `json:"street"`
		Number       string  `json:"number"`
		Phase        string  `json:"phase"`
		Description  *string `json:"description"`
		ImageURL     *string `json:"image_url"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project := &data.Project{
		UserID:       user.ID,
		Name:         input.Name,
		CEP:          input.CEP,
		State:        strings.ToUpper(input.State),
		City:         input.City,
		Neighborhood: input.Neighborhood,
		Street:       input.Street,
		Number:       input.Number,
		Phase:        input.Phase,
		Description:  input.Description,
		ImageURL:     input.ImageURL,
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.Insert(project)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateProjectName):
			v.AddError("name", "you already have a project with this name")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	headers := make(http.Header)
	headers.Set("Location", fmt.Sprintf("/project/%d", project.ID))

	err = app.writeJSON(w, http.StatusCreated, envelope{"project": project}, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) showProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readIDParam(r, "projectID")

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
	projectID, _ := app.readIDParam(r, "projectID")

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
		ImageURL     *string `json:"image_url"`
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
		project.CEP = *input.CEP
	}

	if input.State != nil {
		project.State = strings.ToUpper(*input.State)
	}

	if input.City != nil {
		project.City = *input.City
	}

	if input.Neighborhood != nil {
		project.Neighborhood = *input.Neighborhood
	}

	if input.Street != nil {
		project.Street = *input.Street
	}

	if input.Number != nil {
		project.Number = *input.Number
	}

	if input.Phase != nil {
		project.Phase = *input.Phase
	}

	if input.Description != nil {
		project.Description = input.Description
	}

	if input.ImageURL != nil {
		project.ImageURL = input.ImageURL
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.Update(project)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateProjectName):
			v.AddError("name", "you already have a project with this name")
			app.failedValidationResponse(w, r, v.Errors)
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
	projectID, _ := app.readIDParam(r, "projectID")

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
	input.Filters.SortSafelist = []string{"id",
		"created_at",
		"updated_at",
		"name",
		"state",
		"city",
		"phase",
		"-id",
		"-created_at",
		"-updated_at",
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
