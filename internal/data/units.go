package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type Unit struct {
	ID             int64     `json:"id"`
	ProjectID      int       `json:"project_id"`
	Name           string    `json:"name"`
	Type           string    `json:"type"`
	TotalFloors    *int      `json:"total_floors,omitempty"`
	TowerFloors    *int      `json:"tower_floors,omitempty"`
	BaseFloors     *int      `json:"base_floors,omitempty"`
	BasementFloors *int      `json:"basement_floors,omitempty"`
	TypeFloors     *int      `json:"type_floors,omitempty"`
	TotalArea      *float64  `json:"total_area,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Version        int32     `json:"version"`
}

func ValidateUnit(v *validator.Validator, unit *Unit) {
	v.Check(unit.ProjectID > 0, "project_id", "must be provided and greater than zero")
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
	if unit.Type == "tower" {
		v.Check(unit.TotalArea != nil && *unit.TotalArea > 0, "total_area", "must be provided and greater than zero")
	}
}

func (m UnitModel) Insert(unit *Unit) error {
	query := `
		INSERT INTO units (
			project_id, name, type, total_floors, tower_floors, base_floors, basement_floors, type_floors, total_area
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at, version
	`
	args := []interface{}{
		unit.ProjectID,
		unit.Name,
		unit.Type,
		unit.TotalFloors,
		unit.TowerFloors,
		unit.BaseFloors,
		unit.BasementFloors,
		unit.TypeFloors,
		unit.TotalArea,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	return m.DB.QueryRowContext(ctx, query, args...).Scan(
		&unit.ID,
		&unit.CreatedAt,
		&unit.UpdatedAt,
		&unit.Version,
	)
}

type UnitModel struct {
	DB *sql.DB
}
