package main

import (
	"errors"
	"fmt"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

// ValidationError carries field-level validation errors across the service boundary,
// decoupling business rules from HTTP response formatting.
type ValidationError struct {
	Errors map[string]string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error: %v", e.Errors)
}

func (app *application) prepareUnitForCreate(unit *data.Unit, input UnitCreate) ([]data.FloorCreate, error) {
	if input.Type != "tower" {
		return []data.FloorCreate{}, nil
	}

	towerData, err := parseTowerData(input.Data)
	if err != nil {
		return nil, err
	}

	unit.HousingUnitsCount = resolveHousingUnitsCount(input.HousingUnitsCount, towerData.HousingUnitsCount)
	return towerData.Floors, nil
}

func (app *application) prepareUnitForUpdate(unit *data.Unit, input UnitUpdate) ([]data.FloorCreate, error) {
	if unit.Type != "tower" {
		return []data.FloorCreate{}, nil
	}

	if input.Data == nil {
		unit.HousingUnitsCount = resolveHousingUnitsCount(input.HousingUnitsCount, unit.HousingUnitsCount)
		return []data.FloorCreate{}, nil
	}

	towerData, err := parseTowerData(input.Data)
	if err != nil {
		return nil, err
	}

	unit.HousingUnitsCount = resolveHousingUnitsCount(input.HousingUnitsCount, towerData.HousingUnitsCount)
	return towerData.Floors, nil
}

// insertProject validates the project, assigns a new UUID, and persists it.
// Database sentinel errors are translated into *ValidationError so callers
// don't need to import data-layer error types.
func (app *application) insertProject(project *data.Project, userID uuid.UUID) error {
	project.State = strings.ToUpper(project.State)

	v := validator.New()
	if data.ValidateProject(v, project); !v.Valid() {
		return &ValidationError{Errors: v.Errors}
	}

	if project.ID == uuid.Nil {
		projectID, err := uuid.NewV7()
		if err != nil {
			return err
		}
		project.ID = projectID
	}

	err := app.models.Projects.Insert(project, userID)
	if err != nil {
		v := validator.New()
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			v.AddError("projects(id)", "the provided projectID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users(id)", "the provided userID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateUserProject):
			v.AddError("users_projects", "user is already associated with the project")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("roles(name)", "you already have a role with this name")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions(id)", "the provided permissionID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidRoleID):
			v.AddError("roles(id)", "the provided roleID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateRolePermission):
			v.AddError("roles_permissions", "role already has permission associated")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateUserRole):
			v.AddError("users_roles", "user already has role associated")
			return &ValidationError{Errors: v.Errors}
		default:
			return err
		}
	}

	return nil
}

// insertUnit validates the unit and its floors, assigns a new UUID if needed, and persists it.
func (app *application) insertUnit(unit *data.Unit, floors []data.FloorCreate) error {
	v := validator.New()
	data.ValidateUnit(v, unit)
	if unit.Type != "tower" {
		v.AddError("type", "invalid unit type")
	}

	if unit.Type == "tower" {
		validateFloors(v, floors)
		validateHousingUnitsCount(v, unit.HousingUnitsCount)
	}

	if !v.Valid() {
		return &ValidationError{Errors: v.Errors}
	}

	if unit.ID == uuid.Nil {
		unitID, err := uuid.NewV7()
		if err != nil {
			return err
		}
		unit.ID = unitID
	}

	err := app.models.Units.Insert(unit, floors)
	if err != nil {
		v := validator.New()
		switch {
		case errors.Is(err, data.ErrDuplicateFloorIndexes):
			v.AddError("floors", "floor indexes must be unique")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrFloorIndexGap):
			v.AddError("floors", "floor indexes must be continuous without gaps")
			return &ValidationError{Errors: v.Errors}
		default:
			return err
		}
	}

	return nil
}

func (app *application) updateUnit(unit *data.Unit, floors []data.FloorCreate) error {
	v := validator.New()
	data.ValidateUnit(v, unit)

	if unit.Type == "tower" {
		validateFloors(v, floors)
		validateHousingUnitsCount(v, unit.HousingUnitsCount)
	}

	if !v.Valid() {
		return &ValidationError{Errors: v.Errors}
	}

	err := app.models.Units.Update(unit, floors)
	if err != nil {
		v := validator.New()
		switch {
		case errors.Is(err, data.ErrDuplicateFloorIndexes):
			v.AddError("floors", "floor indexes must be unique")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrFloorIndexGap):
			v.AddError("floors", "floor indexes must be continuous without gaps")
			return &ValidationError{Errors: v.Errors}
		default:
			return err
		}
	}

	return nil
}

// insertModule centralizes module validation, calculation and persistence.
// It keeps handlers focused on HTTP concerns while reusing the same logic
// across API and CSV ingestion flows.
func (app *application) insertModule(module modules.Module, optionID uuid.UUID) (modules.Module, error) {
	v := validator.New()
	module.Validate(v)
	if !v.Valid() {
		return nil, &ValidationError{Errors: v.Errors}
	}

	result, err := module.Calculate()
	if err != nil {
		return nil, err
	}

	newModule, err := module.Insert(app.models, optionID, result)
	if err != nil {
		return nil, err
	}

	return newModule, nil
}
