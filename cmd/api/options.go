package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

func (app *application) createOptionHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	roleID, err := app.readUUIDParam(r, "roleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		Name   string `json:"name"`
		Active bool   `json:"active"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	option := &data.Option{
		UnitID: unitID,
		RoleID:  roleID,
		Name:    input.Name,
		Active:  input.Active,
	}

	v := validator.New()

	if data.ValidateOption(v, option); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	optionID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	option.ID = optionID

	err = app.models.Options.Insert(option)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidUnitID),
			errors.Is(err, data.ErrUnitIsNotTower),
			errors.Is(err, data.ErrInvalidRoleID),
			errors.Is(err, data.ErrOptionHasOutdatedModules):
			app.unprocessableEntityResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	headers := make(http.Header)
	headers.Set("Location", fmt.Sprintf("/v1/tower-options/%s", option.ID))

	err = app.writeJSON(w, http.StatusCreated, envelope{"option": option}, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) readOptionHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	option, err := app.models.Options.GetByID(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"option": option}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listOptionsHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	roleID, err := app.readUUIDParam(r, "roleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	options, err := app.models.Options.GetAllByRole(unitID, roleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"options": options}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateOptionHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	option, err := app.models.Options.GetByID(id)
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
		Name   *string `json:"name"`
		Active *bool   `json:"active"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name != nil {
		option.Name = *input.Name
	}

	if input.Active != nil {
		option.Active = *input.Active
	}

	v := validator.New()

	if data.ValidateOption(v, option); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Options.Update(option)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		case errors.Is(err, data.ErrOptionHasOutdatedModules):
			app.unprocessableEntityResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"option": option}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteOptionHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = app.models.Options.Delete(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "tower option successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
