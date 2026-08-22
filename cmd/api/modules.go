package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

type modulePayloadWrapper struct {
	Type   string          `json:"type"`
	Data   json.RawMessage `json:"data"`
	Source string          `json:"source,omitempty"`
}

type moduleCreateRequestPayload struct {
	Type    string                  `json:"type"`
	Data    json.RawMessage         `json:"data"`
	Source  string                  `json:"source,omitempty"`
	Modules *[]modulePayloadWrapper `json:"modules"`
}

var moduleTypesWithUnitID = map[string]struct{}{
	"raft_foundation":       {},
	"piles_foundation":      {},
	"raft_piles_foundation": {},
}

func (app *application) parseModulePayload(w http.ResponseWriter, r *http.Request) (modulePayloadWrapper, error) {
	var wrapper modulePayloadWrapper

	if err := app.readJSON(w, r, &wrapper); err != nil {
		return modulePayloadWrapper{}, err
	}

	if wrapper.Type == "" {
		return modulePayloadWrapper{}, errors.New("missing or invalid 'type' field")
	}
	if wrapper.Data == nil {
		return modulePayloadWrapper{}, errors.New("missing or invalid 'data' field")
	}

	return wrapper, nil
}

func validateModulePayloadWrapper(wrapper modulePayloadWrapper, listIndex int, fromList bool) error {
	fieldPrefix := ""
	if fromList {
		fieldPrefix = fmt.Sprintf("modules[%d].", listIndex)
	}

	if wrapper.Type == "" {
		return fmt.Errorf("missing or invalid '%stype' field", fieldPrefix)
	}

	if wrapper.Data == nil {
		return fmt.Errorf("missing or invalid '%sdata' field", fieldPrefix)
	}

	return nil
}

func (app *application) normalizeWrappersWithFloorIndex(optionID uuid.UUID, wrappers []modulePayloadWrapper) ([]modulePayloadWrapper, error) {
	return app.resolveWrappersFloorIndex(optionID, wrappers)
}

func (app *application) resolveWrappersFloorIndex(optionID uuid.UUID, wrappers []modulePayloadWrapper) ([]modulePayloadWrapper, error) {
	option, err := app.models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	unit, err := app.models.Units.GetByID(option.UnitID)
	if err != nil {
		return nil, err
	}

	if len(unit.Floors) == 0 {
		return wrappers, nil
	}

	type floorIndexEntry struct {
		wrapperIndex int
		value        int
	}

	entries := make([]floorIndexEntry, 0, len(wrappers))
	for i, wrapper := range wrappers {
		floorIndex, hasFloorIndex, err := readFloorIndexFromData(wrapper.Data)
		if err != nil {
			return nil, &ValidationError{Errors: map[string]string{
				fmt.Sprintf("modules[%d].data.floor_index", i): "must be an integer",
			}}
		}

		if !hasFloorIndex {
			continue
		}

		entries = append(entries, floorIndexEntry{wrapperIndex: i, value: floorIndex})
	}

	if len(entries) == 0 {
		return wrappers, nil
	}

	for i := 1; i < len(entries); i++ {
		if len(entries) != len(unit.Floors) {
			break
		}

		if entries[i].value == entries[i-1].value+1 {
			continue
		}

		return nil, &ValidationError{Errors: map[string]string{
			fmt.Sprintf("modules[%d].data.floor_index", entries[i].wrapperIndex): "must form a contiguous sequence without gaps",
		}}
	}

	floorIDByRealIndex := make(map[int]uuid.UUID, len(unit.Floors))
	for _, floor := range unit.Floors {
		floorIDByRealIndex[floor.Index] = floor.ID
	}

	normalized := append([]modulePayloadWrapper(nil), wrappers...)
	for i, entry := range entries {
		resolvedFloorID := uuid.Nil
		if len(entries) == len(unit.Floors) {
			resolvedFloorID = unit.Floors[i].ID
		} else {
			floorID, ok := floorIDByRealIndex[entry.value]
			if !ok {
				return nil, &ValidationError{Errors: map[string]string{
					fmt.Sprintf("modules[%d].data.floor_index", entry.wrapperIndex): "must match an existing floor index when the amount of floor_index modules differs from floor count",
				}}
			}

			resolvedFloorID = floorID
		}

		normalizedData, err := overrideFloorTargets(normalized[entry.wrapperIndex].Data, resolvedFloorID)
		if err != nil {
			return nil, fmt.Errorf("invalid json format for modules[%d].data: %w", entry.wrapperIndex, err)
		}

		normalized[entry.wrapperIndex].Data = normalizedData
	}

	return normalized, nil
}

func overrideFloorTargets(data json.RawMessage, floorID uuid.UUID) (json.RawMessage, error) {
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, err
	}

	delete(payload, "floor_index")
	delete(payload, "floor_id")
	payload["floor_ids"] = []string{floorID.String()}

	normalizedData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return normalizedData, nil
}

func readFloorIndexFromData(data json.RawMessage) (int, bool, error) {
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		return 0, false, err
	}

	rawFloorIndex, exists := payload["floor_index"]
	if !exists {
		return 0, false, nil
	}

	floorIndexFloat, ok := rawFloorIndex.(float64)
	if !ok {
		return 0, true, errors.New("floor_index must be a number")
	}

	floorIndex := int(floorIndexFloat)
	if float64(floorIndex) != floorIndexFloat {
		return 0, true, errors.New("floor_index must be an integer")
	}

	return floorIndex, true, nil
}

func moduleRequiresUnitID(moduleType string) bool {
	_, ok := moduleTypesWithUnitID[moduleType]
	return ok
}

func injectUnitIDIntoWrapperData(wrapper modulePayloadWrapper, unitID uuid.UUID) (modulePayloadWrapper, error) {
	if !moduleRequiresUnitID(wrapper.Type) {
		return wrapper, nil
	}

	var payload map[string]any
	if err := json.Unmarshal(wrapper.Data, &payload); err != nil {
		return modulePayloadWrapper{}, fmt.Errorf("invalid json format for module data: %w", err)
	}

	rawUnitID, hasUnitID := payload["unit_id"]
	if hasUnitID {
		if value, ok := rawUnitID.(string); ok && value != "" {
			return wrapper, nil
		}

		if rawUnitID != nil {
			return wrapper, nil
		}
	}

	payload["unit_id"] = unitID.String()

	normalizedData, err := json.Marshal(payload)
	if err != nil {
		return modulePayloadWrapper{}, fmt.Errorf("invalid json format for module data: %w", err)
	}

	wrapper.Data = normalizedData
	return wrapper, nil
}

func injectUnitIDIntoWrappersData(wrappers []modulePayloadWrapper, unitID uuid.UUID) ([]modulePayloadWrapper, error) {
	if len(wrappers) == 0 {
		return wrappers, nil
	}

	normalized := append([]modulePayloadWrapper(nil), wrappers...)
	for i := range normalized {
		updatedWrapper, err := injectUnitIDIntoWrapperData(normalized[i], unitID)
		if err != nil {
			return nil, fmt.Errorf("invalid json format for modules[%d].data: %w", i, err)
		}

		normalized[i] = updatedWrapper
	}

	return normalized, nil
}

func (app *application) parseCreateModulesPayload(w http.ResponseWriter, r *http.Request) ([]modulePayloadWrapper, error) {
	var payload moduleCreateRequestPayload

	if err := app.readJSON(w, r, &payload); err != nil {
		return nil, err
	}

	if payload.Modules != nil {
		if payload.Type != "" || payload.Data != nil {
			return nil, errors.New("when 'modules' is provided, do not send root 'type' or 'data' fields")
		}

		if len(*payload.Modules) == 0 {
			return nil, errors.New("'modules' must contain at least one item")
		}

		for i, wrapper := range *payload.Modules {
			if err := validateModulePayloadWrapper(wrapper, i, true); err != nil {
				return nil, err
			}
		}

		return *payload.Modules, nil
	}

	singleWrapper := modulePayloadWrapper{Type: payload.Type, Data: payload.Data, Source: payload.Source}
	if err := validateModulePayloadWrapper(singleWrapper, 0, false); err != nil {
		return nil, err
	}

	return []modulePayloadWrapper{singleWrapper}, nil
}

func (app *application) parseModuleFromPayload(wrapper modulePayloadWrapper) (modules.Module, error) {
	module, err := modules.ParseModuleType(wrapper.Type)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(wrapper.Data, module); err != nil {
		return nil, fmt.Errorf("invalid json format for module data: %w", err)
	}

	return module, nil
}

func (app *application) parseModule(w http.ResponseWriter, r *http.Request) (modules.Module, error) {
	wrapper, err := app.parseModulePayload(w, r)
	if err != nil {
		return nil, err
	}

	return app.parseModuleFromPayload(wrapper)
}

func (app *application) createModulesFromPayloads(
	optionID uuid.UUID,
	wrappers []modulePayloadWrapper,
	payloadValidator func(modules.Module, json.RawMessage) error,
	responseConverter func(modules.Module) (map[string]any, error),
	sourceResolver func(string) string,
) ([]map[string]any, error) {
	normalizedWrappers, err := app.normalizeWrappersWithFloorIndex(optionID, wrappers)
	if err != nil {
		return nil, err
	}

	if len(wrappers) <= 1 {
		return app.createModulesFromPayloadsWithModels(optionID, normalizedWrappers, app.models, payloadValidator, responseConverter, sourceResolver)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	tx, err := app.models.Modules.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}

	txModels := app.models
	txModels.Modules = data.ModuleModel{DB: app.models.Modules.DB, Tx: tx}

	createdModules, err := app.createModulesFromPayloadsWithModels(optionID, normalizedWrappers, txModels, payloadValidator, responseConverter, sourceResolver)
	if err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return createdModules, nil
}

func (app *application) createModulesFromPayloadsWithModels(
	optionID uuid.UUID,
	wrappers []modulePayloadWrapper,
	modelsSet data.Models,
	payloadValidator func(modules.Module, json.RawMessage) error,
	responseConverter func(modules.Module) (map[string]any, error),
	sourceResolver func(string) string,
) ([]map[string]any, error) {
	createdModules := make([]map[string]any, 0, len(wrappers))

	for _, wrapper := range wrappers {
		module, err := app.parseModuleFromPayload(wrapper)
		if err != nil {
			return nil, err
		}

		source := sourceResolver(wrapper.Source)

		if err := payloadValidator(module, wrapper.Data); err != nil {
			return nil, err
		}

		newModule, err := app.insertModuleWithModels(module, optionID, modelsSet, source)
		if err != nil {
			return nil, err
		}

		responseModule, err := responseConverter(newModule)
		if err != nil {
			return nil, err
		}

		createdModules = append(createdModules, responseModule)
	}

	return createdModules, nil
}

func (app *application) writeCreateModulesResponse(
	w http.ResponseWriter,
	r *http.Request,
	modulesList []map[string]any,
) {
	if len(modulesList) == 1 {
		err := app.writeJSON(w, http.StatusCreated, envelope{"module": modulesList[0]}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err := app.writeJSON(w, http.StatusCreated, envelope{"modules": modulesList}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) handleCreateModuleError(w http.ResponseWriter, r *http.Request, err error) {
	var ve *ValidationError
	if errors.As(err, &ve) {
		app.failedValidationResponse(w, r, ve.Errors)
		return
	}

	if isModulePayloadBadRequest(err) {
		app.badRequestResponse(w, r, err)
		return
	}

	if errors.Is(err, data.ErrInvalidOptionID) {
		app.badRequestResponse(w, r, err)
		return
	}

	if errors.Is(err, data.ErrInvalidFloorID) {
		app.badRequestResponse(w, r, err)
		return
	}

	if errors.Is(err, data.ErrInvalidUnitID) {
		app.badRequestResponse(w, r, err)
		return
	}

	if errors.Is(err, data.ErrZeroArea) {
		app.badRequestResponse(w, r, err)
		return
	}

	if errors.Is(err, data.ErrRecordNotFound) {
		app.badRequestResponse(w, r, errors.New("one or more floors do not exist"))
		return
	}

	app.serverErrorResponse(w, r, err)
}

func isModulePayloadBadRequest(err error) bool {
	var syntaxError *json.SyntaxError
	if errors.As(err, &syntaxError) {
		return true
	}

	var unmarshalTypeError *json.UnmarshalTypeError
	if errors.As(err, &unmarshalTypeError) {
		return true
	}

	message := err.Error()

	return message == "invalid module type" ||
		strings.HasPrefix(message, "invalid json format for module data:") ||
		strings.Contains(message, "does not accept legacy field") ||
		strings.HasPrefix(message, "v1 does not accept '")
}

// insertModule centralizes module validation, calculation and persistence.
// It keeps handlers focused on HTTP concerns while reusing the same logic
// across API and CSV ingestion flows.
func (app *application) insertModule(module modules.Module, optionID uuid.UUID) (modules.Module, error) {
	return app.insertModuleWithModels(module, optionID, app.models, "")
}

func (app *application) insertModuleWithModels(module modules.Module, optionID uuid.UUID, modelsSet data.Models, source string) (modules.Module, error) {
	v := validator.New()
	module.Validate(v)
	if !v.Valid() {
		return nil, &ValidationError{Errors: v.Errors}
	}

	result, err := module.Calculate()
	if err != nil {
		return nil, err
	}

	newModule, err := module.Insert(modelsSet, optionID, result, source)
	if err != nil {
		return nil, err
	}

	return newModule, nil
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
		TotalMaterial:     originalModule.TotalMaterial,
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
	var material float64
	if originalModule.TotalMaterial != nil {
		material = *originalModule.TotalMaterial
	}

	result := modules.Consumption{
		CO2Min:    *originalModule.TotalCO2Min,
		CO2Max:    *originalModule.TotalCO2Max,
		EnergyMin: *originalModule.TotalEnergyMin,
		EnergyMax: *originalModule.TotalEnergyMax,
		Material:  material,
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
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	wrappers, err := app.parseCreateModulesPayload(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	wrappers, err = injectUnitIDIntoWrappersData(wrappers, unitID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	createdModules, err := app.createModulesFromPayloads(
		optionID,
		wrappers,
		modules.ValidateV2PayloadForModule,
		modules.ToV2Response,
		func(payloadSource string) string {
			return app.resolveDataSource(r, payloadSource)
		},
	)
	if err != nil {
		app.handleCreateModuleError(w, r, err)
		return
	}

	app.writeCreateModulesResponse(w, r, createdModules)
}

func (app *application) createModuleV1Handler(w http.ResponseWriter, r *http.Request) {
	optionID, _ := app.readUUIDParam(r, "optionID")
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	wrappers, err := app.parseCreateModulesPayload(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	wrappers, err = injectUnitIDIntoWrappersData(wrappers, unitID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	createdModules, err := app.createModulesFromPayloads(
		optionID,
		wrappers,
		modules.ValidateV1LegacyPayloadForModule,
		modules.ToV1Response,
		func(payloadSource string) string {
			return app.resolveDataSource(r, payloadSource)
		},
	)
	if err != nil {
		app.handleCreateModuleError(w, r, err)
		return
	}

	app.writeCreateModulesResponse(w, r, createdModules)

}

func (app *application) readModuleHandler(w http.ResponseWriter, r *http.Request) {
	moduleID, err := app.readUUIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	includeSource := app.readSourceInclude(r.URL.Query())

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

	v2Module, err := modules.ToV2Response(module)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	rawModule, err := app.models.Modules.Get(moduleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	modules.ApplySourceShape(v2Module, rawModule.Data, includeSource)

	err = app.writeJSON(w, http.StatusOK, envelope{"module": v2Module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) readModuleV1Handler(w http.ResponseWriter, r *http.Request) {
	moduleID, err := app.readUUIDParam(r, "moduleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	includeSource := app.readSourceInclude(r.URL.Query())

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

	v1Module, err := modules.ToV1Response(module)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	rawModule, err := app.models.Modules.Get(moduleID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	modules.ApplySourceShape(v1Module, rawModule.Data, includeSource)

	err = app.writeJSON(w, http.StatusOK, envelope{"module": v1Module}, nil)
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

	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	wrapper, err := app.parseModulePayload(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	wrapper, err = injectUnitIDIntoWrapperData(wrapper, unitID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	module, err := app.parseModuleFromPayload(wrapper)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	source := app.resolveDataSource(r, wrapper.Source)

	if err := modules.ValidateV2PayloadForModule(module, wrapper.Data); err != nil {
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

	err = module.Update(app.models, moduleID, optionID, result, source)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidUnitID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrZeroArea):
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

	v2Module, err := modules.ToV2Response(updatedModule)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"module": v2Module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateModuleV1Handler(w http.ResponseWriter, r *http.Request) {
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

	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	wrapper, err := app.parseModulePayload(w, r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	wrapper, err = injectUnitIDIntoWrapperData(wrapper, unitID)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	module, err := app.parseModuleFromPayload(wrapper)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	source := app.resolveDataSource(r, wrapper.Source)

	if err := modules.ValidateV1LegacyPayloadForModule(module, wrapper.Data); err != nil {
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

	err = module.Update(app.models, moduleID, optionID, result, source)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		case errors.Is(err, data.ErrInvalidFloorID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrInvalidUnitID):
			app.badRequestResponse(w, r, err)
		case errors.Is(err, data.ErrZeroArea):
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

	v1Module, err := modules.ToV1Response(updatedModule)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"module": v1Module}, nil)
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
		case errors.Is(err, data.ErrZeroArea):
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
