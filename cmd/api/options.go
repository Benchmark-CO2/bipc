package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

// duplicateOption duplicates an option with all its modules with optional customizations.
// Use customName to override the generated name (for unit/project duplication).
// Use customActive to override the active state (for unit/project duplication).
// Use customUnitID to change the unit reference (for unit duplication).
// Pass oldFloorIndexToID and newFloorIndexToID for floor mapping (for unit duplication).
// Pass empty string, nil, original unitID, and nil maps to use defaults (for option handler).
func (app *application) duplicateOption(
	originalOption *data.Option,
	newOptionID, customUnitID uuid.UUID,
	customName string,
	customActive *bool,
	oldFloorIndexToID, newFloorIndexToID map[int]uuid.UUID,
) (*data.Option, error) {
	name := customName
	if name == "" {
		name = generateDuplicateName(originalOption.Name)
	}

	active := originalOption.Active
	if customActive != nil {
		active = *customActive
	}

	duplicatedOption := &data.Option{
		ID:     newOptionID,
		UnitID: customUnitID,
		RoleID: originalOption.RoleID,
		Name:   name,
		Active: active,
	}

	err := app.models.Options.Insert(duplicatedOption)
	if err != nil {
		return nil, err
	}

	for _, moduleInfo := range originalOption.Modules {
		originalModule, err := app.models.Modules.Get(moduleInfo.ID)
		if err != nil {
			return nil, err
		}

		newModuleID, err := uuid.NewV7()
		if err != nil {
			return nil, err
		}

		var newFloorIDs []uuid.UUID
		var newUnitIDPtr *uuid.UUID

		// If floor mapping is provided (unit duplication), map floor IDs by index
		if oldFloorIndexToID != nil && newFloorIndexToID != nil {
			for _, oldFloorID := range originalModule.FloorIDs {
				// Find the index of the old floor
				for idx, fID := range oldFloorIndexToID {
					if fID == oldFloorID {
						if newFID, exists := newFloorIndexToID[idx]; exists {
							newFloorIDs = append(newFloorIDs, newFID)
						}
						break
					}
				}
			}

			if originalModule.UnitID != nil {
				newUnitIDPtr = &customUnitID
			}
		}

		_, err = app.duplicateModule(originalModule, newModuleID, newOptionID, newFloorIDs, newUnitIDPtr)
		if err != nil {
			return nil, err
		}
	}

	return app.models.Options.GetByID(newOptionID)
}

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
		RoleID: roleID,
		Name:   input.Name,
		Active: input.Active,
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

func (app *application) duplicateOptionHandler(w http.ResponseWriter, r *http.Request) {
	optionID, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	originalOption, err := app.models.Options.GetByID(optionID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	newOptionID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	active := true
	duplicatedOption, err := app.duplicateOption(
		originalOption,
		newOptionID,
		originalOption.UnitID,
		"",     // generates name
		&active, // force active=true
		nil, nil, // no floor mapping
	)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidUnitID),
			errors.Is(err, data.ErrUnitIsNotTower),
			errors.Is(err, data.ErrInvalidRoleID):
			app.unprocessableEntityResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	headers := make(http.Header)
	headers.Set("Location", fmt.Sprintf("/v1/tower-options/%s", duplicatedOption.ID))

	err = app.writeJSON(w, http.StatusCreated, envelope{"option": duplicatedOption}, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
