package main

import (
	"errors"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

type unknownModuleMaterialPayload struct {
	Name     string  `json:"name"`
	Unit     string  `json:"unit"`
	Quantity float64 `json:"quantity"`
}

type unknownModuleCreatePayload struct {
	Category        string                         `json:"category"`
	Name            string                         `json:"name"`
	Description     string                         `json:"description,omitempty"`
	References      []string                       `json:"references,omitempty"`
	UnknownModuleID uuid.UUID                      `json:"unknown_module_id,omitzero"`
	Materials       []unknownModuleMaterialPayload `json:"materials"`
}

// buildOccurrence builds the occurrence for the given type and option, using
// the material quantities sent by the client.
func buildUnknownModuleOccurrence(optionID uuid.UUID, moduleType *data.UnknownModule, userID uuid.UUID, materials []unknownModuleMaterialPayload) (*data.UnknownModuleOccurrence, error) {
	occurrenceMaterials := make([]data.OccurrenceMaterial, 0, len(materials))
	for _, material := range materials {
		occurrenceMaterials = append(occurrenceMaterials, data.OccurrenceMaterial{
			Name:     material.Name,
			Unit:     material.Unit,
			Quantity: material.Quantity,
		})
	}

	occurrenceID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	return &data.UnknownModuleOccurrence{
		ID:              occurrenceID,
		OptionID:        optionID,
		UnknownModuleID: moduleType.ID,
		UserID:          userID,
		Materials:       occurrenceMaterials,
	}, nil
}

// createUnknownModuleHandler either creates a custom module type (global to
// the creator user) and its occurrence inside the given option, or, when an
// existing unknown_module_id is provided, creates a new occurrence of that
// type in the option. The materials with their quantities are stored in the
// occurrence, mirroring the conventional module table (module.option_id). No
// consumption calculation is generated. A type is never applied to an option
// more than once.
func (app *application) createUnknownModuleHandler(w http.ResponseWriter, r *http.Request) {
	optionID, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var payload unknownModuleCreatePayload
	err = app.readJSON(w, r, &payload)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	var moduleType *data.UnknownModule

	if payload.UnknownModuleID != uuid.Nil {
		moduleType, err = app.models.UnknownModules.GetByID(payload.UnknownModuleID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRecordNotFound):
				app.unprocessableEntityResponse(w, r, data.ErrInvalidUnknownModuleID)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		// Reusing a module type is scoped to its creator (his own technologies).
		if moduleType.UserID != user.ID {
			app.notPermittedResponse(w, r)
			return
		}
	} else {
		moduleType = &data.UnknownModule{
			UserID:      user.ID,
			Category:    payload.Category,
			Name:        payload.Name,
			Description: payload.Description,
			References:  payload.References,
		}

		v := validator.New()
		data.ValidateUnknownModule(v, moduleType)
		if !v.Valid() {
			app.failedValidationResponse(w, r, v.Errors)
			return
		}

		moduleID, err := uuid.NewV7()
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		moduleType.ID = moduleID

		created, err := app.models.UnknownModules.Insert(moduleType)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrInvalidUserID):
				app.unprocessableEntityResponse(w, r, err)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		moduleType = created
	}

	occurrence, err := buildUnknownModuleOccurrence(optionID, moduleType, user.ID, payload.Materials)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	ov := validator.New()
	data.ValidateUnknownModuleOccurrence(ov, occurrence)
	if !ov.Valid() {
		app.failedValidationResponse(w, r, ov.Errors)
		return
	}

	createdOccurrence, err := app.models.UnknownModules.InsertOccurrence(occurrence)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidOptionID),
			errors.Is(err, data.ErrInvalidUnknownModuleID),
			errors.Is(err, data.ErrInvalidUserID),
			errors.Is(err, data.ErrUnknownModuleAlreadyApplied):
			app.unprocessableEntityResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	createdOccurrence.UnknownModule = moduleType

	err = app.writeJSON(w, http.StatusCreated, envelope{"unknown_module": moduleType, "occurrence": createdOccurrence}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// listUserUnknownModulesHandler returns the module types created by the
// authenticated user, scoped by their own id.
func (app *application) listUserUnknownModulesHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	modules, err := app.models.UnknownModules.ListByUser(user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unknown_modules": modules}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// deleteUnknownModuleOccurrenceHandler deletes the occurrence of an unknown
// module applied to an option, scoped to the option.
func (app *application) deleteUnknownModuleOccurrenceHandler(w http.ResponseWriter, r *http.Request) {
	optionID, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	occurrenceID, err := app.readUUIDParam(r, "occurrenceID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = app.models.UnknownModules.DeleteOccurrence(occurrenceID, optionID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.resourceNotFoundResponse(w, r, "unknown module occurrence")
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "occurrence successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
