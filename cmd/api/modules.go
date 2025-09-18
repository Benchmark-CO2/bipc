package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

func (app *application) parseModule(w http.ResponseWriter, r *http.Request) (modules.Module, error) {
	var wrapper struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	if err := app.readJSON(w, r, &wrapper); err != nil {
		return nil, err
	}

	if wrapper.Type == "" {
		return nil, errors.New("missing or invalid 'type' field")
	}
	if wrapper.Data == nil {
		return nil, errors.New("missing or invalid 'data' field")
	}

	module, err := modules.ParseModuleType(wrapper.Type)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(wrapper.Data, module); err != nil {
		return nil, fmt.Errorf("invalid json format for module data: %w", err)
	}

	return module, nil
}

func (app *application) createModuleHandler(w http.ResponseWriter, r *http.Request) {
	optionID, _ := app.readUUIDParam(r, "optionID")

	module, err := app.parseModule(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	module.Validate(v)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	result, err := module.Calculate()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	newModule, err := module.Insert(app.models, optionID, result)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidTowerOptionID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"module": newModule}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) readModuleHandler(w http.ResponseWriter, r *http.Request) {
	moduleID, err := app.readUUIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	moduleType, err := app.models.BeamColumnModules.GetModuleType(moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	moduleAPI, err := modules.ParseModuleType(moduleType)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	module, err := moduleAPI.Get(app.models, moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"module": module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateModuleHandler(w http.ResponseWriter, r *http.Request) {
	moduleID, err := app.readUUIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	optionID, err := app.readUUIDParam(r, "optionID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	module, err := app.parseModule(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	existingModuleType, err := app.models.BeamColumnModules.GetModuleType(moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if module.GetType() != existingModuleType {
		app.badRequestResponse(w, r, fmt.Errorf("module type mismatch: existing type is '%s', but received '%s'", existingModuleType, module.GetType()))
		return
	}

	v := validator.New()
	module.Validate(v)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	result, err := module.Calculate()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = module.Update(app.models, moduleID, optionID, result)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	updatedModule, err := module.Get(app.models, moduleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"module": updatedModule}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteModuleHandler(w http.ResponseWriter, r *http.Request) {
	moduleID, err := app.readUUIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	moduleType, err := app.models.BeamColumnModules.GetModuleType(moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	module, err := modules.ParseModuleType(moduleType)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = module.Delete(app.models, moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "module successfully deleted", "id": moduleID}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
