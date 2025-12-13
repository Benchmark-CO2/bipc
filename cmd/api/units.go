package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

type TowerCreateData struct {
	Floors []data.FloorCreate `json:"floors"`
}

type UnitCreate struct {
	Name string          `json:"name"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func parseFloors(data json.RawMessage) ([]data.FloorCreate, error) {
	if data == nil {
		return nil, nil
	}

	var towerData TowerCreateData
	err := json.Unmarshal(data, &towerData)
	if err != nil {
		return nil, err
	}

	return towerData.Floors, nil
}

func validateFloors(v *validator.Validator, floors []data.FloorCreate) {
	allowedCategories := []string{"basement_floor", "penthouse_floor", "ground_floor", "standard_floor"}
	indexMap := make(map[int]bool)
	
	for i, floor := range floors {
		v.Check(floor.FloorGroup != "", "floors."+strconv.Itoa(i)+".floor_group", "must be provided")
		v.Check(floor.Category != "", "floors."+strconv.Itoa(i)+".category", "must be provided")
		v.Check(
			validator.PermittedValue(floor.Category, allowedCategories...),
			"floors."+strconv.Itoa(i)+".category",
			"invalid category",
		)
		v.Check(floor.Area > 0, "floors."+strconv.Itoa(i)+".area", "must be greater than zero")
		v.Check(floor.Height > 0, "floors."+strconv.Itoa(i)+".height", "must be greater than zero")
		
		if indexMap[floor.Index] {
			v.AddError("floors."+strconv.Itoa(i)+".index", "index must be unique")
		}
		indexMap[floor.Index] = true
	}
}

func (app *application) createUnitHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var input UnitCreate

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	unit := &data.Unit{
		ProjectID: projectID,
		Name:      input.Name,
		Type:      input.Type,
	}

	v := validator.New()
	data.ValidateUnit(v, unit)

	var floors []data.FloorCreate

	switch input.Type {
	case "tower":
		floors, err = parseFloors(input.Data)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
		validateFloors(v, floors)

	default:
		v.AddError("type", "invalid unit type")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Units.Insert(unit, floors)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateFloorIndexes):
			v.AddError("floors", "floor indexes must be unique")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrFloorIndexGap):
			v.AddError("floors", "floor indexes must be continuous without gaps")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type RoleInfo struct {
	ID          uuid.UUID                    `json:"id"`
	Name        string                       `json:"name"`
	IsMember    bool                         `json:"is_member"`
	Consumption map[string]*data.Consumption `json:"consumption,omitempty"`
}

func (app *application) readUnitHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	unit, err := app.models.Units.GetByID(unitID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user := app.contextGetUser(r)

	allRoles, err := app.models.Roles.GetAllUserRoles(user.ID, projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	simulationRoles := []RoleInfo{}

	for _, role := range allRoles {

		roleInfo := RoleInfo{
			ID:       role.ID,
			Name:     role.Name,
			IsMember: role.IsMember,
		}

		if unit.Type == "tower" {
			consumption, err := app.models.Units.GetConsumptionByRole(unitID, role.ID)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
			if len(consumption) > 0 {
				roleInfo.Consumption = consumption
			}
		}

		simulationRoles = append(simulationRoles, roleInfo)

	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit, "roles": simulationRoles}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type UnitUpdate struct {
	Name string          `json:"name"`
	Data json.RawMessage `json:"data"`
}

func (app *application) updateUnitHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var input UnitUpdate
	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	unit, err := app.models.Units.GetByID(unitID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if unit.ProjectID != projectID {
		app.notFoundResponse(w, r)
		return
	}

	if input.Name != "" {
		unit.Name = input.Name
	}

	v := validator.New()
	data.ValidateUnit(v, unit)

	var floors []data.FloorCreate

	if unit.Type == "tower" && input.Data != nil {
		floors, err = parseFloors(input.Data)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
		validateFloors(v, floors)
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Units.Update(unit, floors)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateFloorIndexes):
			v.AddError("floors", "floor indexes must be unique")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrFloorIndexGap):
			v.AddError("floors", "floor indexes must be continuous without gaps")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteUnitHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = app.models.Units.Delete(unitID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "unit successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
