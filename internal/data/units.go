package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BeamColumnModuleBasic struct {
	ID              int64    `json:"id"`
	Name            string   `json:"name"`
	StructureType   string   `json:"structure_type"`
	FloorRepetition int      `json:"floor_repetition"`
	FloorArea       float64  `json:"floor_area"`
	Concrete        *float64 `json:"total_concrete"`
	Steel           *float64 `json:"total_steel"`
	CO2Min          *float64 `json:"co2_min"`
	CO2Max          *float64 `json:"co2_max"`
	EnergyMin       *float64 `json:"energy_min"`
	EnergyMax       *float64 `json:"energy_max"`
	InUse           bool     `json:"in_use"`
	VersionInUse    *int32   `json:"version_in_use,omitempty"`
}

type ConcreteWallModuleBasic struct {
	ID              int64    `json:"id"`
	Name            string   `json:"name"`
	StructureType   string   `json:"structure_type"`
	FloorRepetition int      `json:"floor_repetition"`
	FloorArea       float64  `json:"floor_area"`
	Concrete        *float64 `json:"total_concrete"`
	Steel           *float64 `json:"total_steel"`
	CO2Min          *float64 `json:"co2_min"`
	CO2Max          *float64 `json:"co2_max"`
	EnergyMin       *float64 `json:"energy_min"`
	EnergyMax       *float64 `json:"energy_max"`
	InUse           bool     `json:"in_use"`
	VersionInUse    *int32   `json:"version_in_use,omitempty"`
}

type Unit struct {
	ID                  int64                     `json:"id"`
	ProjectID           int64                     `json:"project_id"`
	Name                string                    `json:"name"`
	Type                string                    `json:"type"`
	TotalFloors         *int                      `json:"total_floors,omitempty"`
	TowerFloors         *int                      `json:"tower_floors,omitempty"`
	BaseFloors          *int                      `json:"base_floors,omitempty"`
	BasementFloors      *int                      `json:"basement_floors,omitempty"`
	TypeFloors          *int                      `json:"type_floors,omitempty"`
	TotalArea           *float64                  `json:"total_area,omitempty"`
	CreatedAt           time.Time                 `json:"created_at"`
	UpdatedAt           time.Time                 `json:"updated_at"`
	Version             int32                     `json:"version"`
	BeamColumnModules   []BeamColumnModuleBasic   `json:"beam_column_modules"`
	ConcreteWallModules []ConcreteWallModuleBasic `json:"concrete_wall_modules"`
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

func (m UnitModel) GetByID(id int64) (*Unit, error) {
	if id < 1 {
		return nil, ErrRecordNotFound
	}

	query := `
		SELECT id, project_id, name, type, total_floors, tower_floors, base_floors, basement_floors, type_floors, total_area, created_at, updated_at, version
		FROM units
		WHERE id = $1`

	var unit Unit

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&unit.ID,
		&unit.ProjectID,
		&unit.Name,
		&unit.Type,
		&unit.TotalFloors,
		&unit.TowerFloors,
		&unit.BaseFloors,
		&unit.BasementFloors,
		&unit.TypeFloors,
		&unit.TotalArea,
		&unit.CreatedAt,
		&unit.UpdatedAt,
		&unit.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	beamModules, err := m.getBeamColumnModulesForUnit(id)
	if err != nil {
		return nil, err
	}
	unit.BeamColumnModules = beamModules

	wallModules, err := m.getConcreteWallModulesForUnit(id)
	if err != nil {
		return nil, err
	}
	unit.ConcreteWallModules = wallModules

	return &unit, nil
}

func (m UnitModel) Update(unit *Unit) error {
	query := `
        UPDATE units
        SET name = $1, type = $2, total_floors = $3, tower_floors = $4, base_floors = $5, basement_floors = $6, type_floors = $7, total_area = $8, updated_at = now(), version = version + 1
        WHERE id = $9 AND version = $10
        RETURNING updated_at, version`

	args := []interface{}{
		unit.Name,
		unit.Type,
		unit.TotalFloors,
		unit.TowerFloors,
		unit.BaseFloors,
		unit.BasementFloors,
		unit.TypeFloors,
		unit.TotalArea,
		unit.ID,
		unit.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&unit.UpdatedAt, &unit.Version)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}
	return nil
}

func (m UnitModel) getBeamColumnModulesForUnit(unitID int64) ([]BeamColumnModuleBasic, error) {
	query := `
	WITH ranked_modules AS (
		SELECT
			mbc.*,
			ROW_NUMBER() OVER(PARTITION BY mbc.id ORDER BY mbc.in_use DESC, mbc.version DESC) as rn
		FROM
			module_beam_column mbc
		WHERE
			mbc.unit_id = $1
	)
	SELECT
		rm.id, rm.name, 'beam_column' AS structure_type, rm.floor_repetition, rm.floor_area,
		(
			COALESCE(cc.volume_fck20, 0) + COALESCE(cc.volume_fck25, 0) + COALESCE(cc.volume_fck30, 0) + COALESCE(cc.volume_fck35, 0) + COALESCE(cc.volume_fck40, 0) + COALESCE(cc.volume_fck45, 0) +
			COALESCE(cb.volume_fck20, 0) + COALESCE(cb.volume_fck25, 0) + COALESCE(cb.volume_fck30, 0) + COALESCE(cb.volume_fck35, 0) + COALESCE(cb.volume_fck40, 0) + COALESCE(cb.volume_fck45, 0) +
			COALESCE(cs.volume_fck20, 0) + COALESCE(cs.volume_fck25, 0) + COALESCE(cs.volume_fck30, 0) + COALESCE(cs.volume_fck35, 0) + COALESCE(cs.volume_fck40, 0) + COALESCE(cs.volume_fck45, 0)
		) AS total_concrete,
		(rm.steel_ca50 + rm.steel_ca60) AS total_steel,
		rm.total_co2_min, rm.total_co2_max, rm.total_energy_min, rm.total_energy_max, rm.in_use,
		CASE WHEN rm.in_use THEN rm.version ELSE NULL END AS version_in_use
	FROM
		ranked_modules rm
	LEFT JOIN concrete cc ON rm.concrete_columns = cc.id
	LEFT JOIN concrete cb ON rm.concrete_beams = cb.id
	LEFT JOIN concrete cs ON rm.concrete_slabs = cs.id
	WHERE
		rm.rn = 1`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []BeamColumnModuleBasic
	for rows.Next() {
		var module BeamColumnModuleBasic
		err := rows.Scan(
			&module.ID, &module.Name, &module.StructureType, &module.FloorRepetition, &module.FloorArea,
			&module.Concrete, &module.Steel, &module.CO2Min, &module.CO2Max,
			&module.EnergyMin, &module.EnergyMax, &module.InUse, &module.VersionInUse,
		)
		if err != nil {
			return nil, err
		}
		modules = append(modules, module)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return modules, nil
}

func (m UnitModel) getConcreteWallModulesForUnit(unitID int64) ([]ConcreteWallModuleBasic, error) {
	query := `
	WITH ranked_modules AS (
		SELECT
			mcw.*,
			ROW_NUMBER() OVER(PARTITION BY mcw.id ORDER BY mcw.in_use DESC, mcw.version DESC) as rn
		FROM
			module_concrete_wall mcw
		WHERE
			mcw.unit_id = $1
	)
	SELECT
		rm.id, rm.name, 'concrete_wall' AS structure_type, rm.floor_repetition, rm.floor_area,
		(
			COALESCE(cw.volume_fck20, 0) + COALESCE(cw.volume_fck25, 0) + COALESCE(cw.volume_fck30, 0) + COALESCE(cw.volume_fck35, 0) + COALESCE(cw.volume_fck40, 0) + COALESCE(cw.volume_fck45, 0) +
			COALESCE(cs_wall.volume_fck20, 0) + COALESCE(cs_wall.volume_fck25, 0) + COALESCE(cs_wall.volume_fck30, 0) + COALESCE(cs_wall.volume_fck35, 0) + COALESCE(cs_wall.volume_fck40, 0) + COALESCE(cs_wall.volume_fck45, 0)
		) AS total_concrete,
		(rm.steel_ca50 + rm.steel_ca60) AS total_steel,
		rm.total_co2_min, rm.total_co2_max, rm.total_energy_min, rm.total_energy_max, rm.in_use,
		CASE WHEN rm.in_use THEN rm.version ELSE NULL END AS version_in_use
	FROM
		ranked_modules rm
	LEFT JOIN concrete cw ON rm.concrete_walls = cw.id
	LEFT JOIN concrete cs_wall ON rm.concrete_slabs = cs_wall.id
	WHERE
		rm.rn = 1`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []ConcreteWallModuleBasic
	for rows.Next() {
		var module ConcreteWallModuleBasic
		err := rows.Scan(
			&module.ID, &module.Name, &module.StructureType, &module.FloorRepetition, &module.FloorArea,
			&module.Concrete, &module.Steel, &module.CO2Min, &module.CO2Max,
			&module.EnergyMin, &module.EnergyMax, &module.InUse, &module.VersionInUse,
		)
		if err != nil {
			return nil, err
		}
		modules = append(modules, module)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return modules, nil
}

func (m UnitModel) Delete(id int64) error {
	if id < 1 {
		return ErrRecordNotFound
	}

	query := `
		DELETE FROM units
		WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrRecordNotFound
	}

	return nil
}

type UnitModel struct {
	DB *sql.DB
}
