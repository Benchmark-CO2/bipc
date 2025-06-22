package main

import (
	"net/http"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BaseUnit struct {
	ProjectID int64  `json:"project_id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
}

type Tower struct {
	TotalFloors    int     `json:"total_floors"`
	TowerFloors    int     `json:"tower_floors"`
	BaseFloors     int     `json:"base_floors"`
	BasementFloors int     `json:"basement_floors"`
	TypeFloors     int     `json:"type_floors"`
	TotalArea      float64 `json:"total_area"`
}

type CreateUnit struct {
	BaseUnit
	Tower
}

func (app *application) createUnitHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readIDParam(r, "projectID")

	var input CreateUnit

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	unit := &data.Unit{
		ProjectID:      projectID,
		Name:           input.Name,
		Type:           input.Type,
		TotalFloors:    &input.TotalFloors,
		TowerFloors:    &input.TowerFloors,
		BaseFloors:     &input.BaseFloors,
		BasementFloors: &input.BasementFloors,
		TypeFloors:     &input.TypeFloors,
		TotalArea:      &input.TotalArea,
	}

	v := validator.New()
	data.ValidateUnit(v, unit)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Units.Insert(unit)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"unit": unit}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
