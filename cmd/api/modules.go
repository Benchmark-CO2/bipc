package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
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

// duplicateModule creates a copy of a module with optional customizations.
// Parameters:
//   - originalModule: the source module to duplicate
//   - newModuleID: UUID for the new module
//   - newOptionID: UUID of the option that will own this module
//   - customFloorIDs: nil = preserve original floors, []uuid.UUID = use these floor IDs
//   - customUnitID: nil = preserve original unit, *uuid.UUID = use this unit ID
func (app *application) duplicateModule(
	originalModule *data.Module,
	newModuleID, newOptionID uuid.UUID,
	customFloorIDs []uuid.UUID,
	customUnitID *uuid.UUID,
) (*data.Module, error) {
	floorIDs := originalModule.FloorIDs
	if customFloorIDs != nil {
		floorIDs = customFloorIDs
	}

	unitID := originalModule.UnitID
	if customUnitID != nil {
		unitID = customUnitID
	}

	duplicatedModule := &data.Module{
		ID:                newModuleID,
		Type:              originalModule.Type,
		OptionID:          newOptionID,
		Data:              originalModule.Data,
		TotalCO2Min:       originalModule.TotalCO2Min,
		TotalCO2Max:       originalModule.TotalCO2Max,
		TotalEnergyMin:    originalModule.TotalEnergyMin,
		TotalEnergyMax:    originalModule.TotalEnergyMax,
		RelativeCO2Min:    originalModule.RelativeCO2Min,
		RelativeCO2Max:    originalModule.RelativeCO2Max,
		RelativeEnergyMin: originalModule.RelativeEnergyMin,
		RelativeEnergyMax: originalModule.RelativeEnergyMax,
		Outdated:          false,
		FloorIDs:          floorIDs,
		UnitID:            unitID,
	}

	option, err := app.models.Options.GetByID(newOptionID)
	if err != nil {
		return nil, err
	}

	// Convert module totals to Consumption type
	result := modules.Consumption{
		CO2Min:    *originalModule.TotalCO2Min,
		CO2Max:    *originalModule.TotalCO2Max,
		EnergyMin: *originalModule.TotalEnergyMin,
		EnergyMax: *originalModule.TotalEnergyMax,
	}

	// Use centralized function to prepare targets with area calculations
	targets, err := modules.PrepareModuleTargetConsumptions(
		app.models,
		newModuleID,
		newOptionID,
		option.RoleID,
		result,
		floorIDs,
		unitID,
	)
	if err != nil {
		return nil, err
	}

	return app.models.Modules.Insert(duplicatedModule, targets)
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
		case errors.Is(err, data.ErrInvalidOptionID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidUnitID):
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

	moduleType, err := app.models.Modules.GetModuleType(moduleID)
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

	existingModuleType, err := app.models.Modules.GetModuleType(moduleID)
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
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidUnitID):
			app.badRequestResponse(w, r, err)
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

	moduleType, err := app.models.Modules.GetModuleType(moduleID)
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

func (app *application) duplicateModuleHandler(w http.ResponseWriter, r *http.Request) {
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

	originalModule, err := app.models.Modules.Get(moduleID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	newModuleID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	_, err = app.duplicateModule(originalModule, newModuleID, optionID, nil, nil)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidOptionID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidUnitID):
			app.badRequestResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	moduleAPI, err := modules.ParseModuleType(originalModule.Type)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	module, err := moduleAPI.Get(app.models, newModuleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"module": module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
