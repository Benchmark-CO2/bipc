package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

func (app *application) parseModule(w http.ResponseWriter, r *http.Request) (modules.Module, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()

	var basic modules.BasicModuleData
	err = json.Unmarshal(body, &basic)
	if err != nil {
		return nil, err
	}

	r.Body = io.NopCloser(bytes.NewBuffer(body))

	switch strings.ToLower(basic.StructureType) {
	case "beam_column":
		var m modules.BeamColumn
		err := app.readJSON(w, r, &m)
		if err != nil {
			return nil, err
		}
		return &m, nil
	case "concrete_wall":
		var m modules.ConcreteWall
		err := app.readJSON(w, r, &m)
		if err != nil {
			return nil, err
		}
		return &m, nil

	default:
		return nil, errors.New("invalid structure_type")
	}
}

func (app *application) createModuleHandler(w http.ResponseWriter, r *http.Request) {
	unitID, _ := app.readIDParam(r, "unitID")

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

	err = module.Insert(app.models, unitID, result, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"result": result}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) createVersionHandler(w http.ResponseWriter, r *http.Request) {
	unitID, _ := app.readIDParam(r, "unitID")
	moduleID, _ := app.readIDParam(r, "moduleID")

	newVersionModule, err := app.parseModule(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	newVersionNumber, err := newVersionModule.MergeModuleData(app.models, moduleID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	newVersionModule.ValidateVersion(v)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	result, err := newVersionModule.Calculate()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	opts := &modules.InsertOptions{
		Version: newVersionNumber,
		ID:      &moduleID,
	}

	err = newVersionModule.Insert(app.models, unitID, result, opts)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"result": result}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) readModuleHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	module, err := modules.GetModule(app.models, id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"versions": module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
