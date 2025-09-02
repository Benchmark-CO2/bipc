package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

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

	err = module.Insert(app.models, optionID, result)
	if err != nil {
		if err.Error() == `pq: insert or update on table "module" violates foreign key constraint "module_tower_option_id_fkey"` {
			app.badRequestResponse(w, r, errors.New("tower_option_id does not exist or is invalid"))
			return
		}
		if err.Error() == `pq: insert or update on table "module_floor" violates foreign key constraint "module_floor_floor_id_fkey"` {
			app.badRequestResponse(w, r, errors.New("one or more floor_ids are invalid or do not exist"))
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"module": module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

