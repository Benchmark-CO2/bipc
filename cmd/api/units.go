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

// New struct to match the TowerCreateData schema in openapi.yaml
type TowerCreateData struct {
	FloorGroups []data.FloorGroupCreate `json:"floor_groups"`
}

type UnitCreate struct {
	Name string          `json:"name"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
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

	var floorGroups []data.FloorGroupCreate

	switch input.Type {
	case "tower":
		var towerData TowerCreateData
		err = json.Unmarshal(input.Data, &towerData)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
		floorGroups = towerData.FloorGroups

		// Validate floor groups
		allowedCategories := []string{"basement_floor", "penthouse_floor", "ground_floor", "standard_floor"}
		for i, floorGroup := range floorGroups {
			v.Check(validator.PermittedValue(floorGroup.Category, allowedCategories...), "floor_groups."+strconv.Itoa(i)+".category", "invalid category")
		}

	default:
		v.AddError("type", "invalid unit type")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Units.Insert(unit, floorGroups)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type RoleInfo struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
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

	var simulationRoles []RoleInfo
	for _, role := range allRoles {
		if role.Simulation {
			simulationRoles = append(simulationRoles, RoleInfo{
				ID:   role.ID,
				Name: role.Name,
			})
		}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit, "roles": simulationRoles}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateUnitHandler(w http.ResponseWriter, r *http.Request) {
	app.notImplementedResponse(w, r)
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
