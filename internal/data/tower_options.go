package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/utils"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
)

type ModuleInfo struct {
	ID          uuid.UUID    `json:"id"`
	Type        string       `json:"type"`
	Consumption *Consumption `json:"consumption,omitempty"`
}

type TowerOption struct {
	ID      uuid.UUID    `json:"id"`
	TowerID uuid.UUID    `json:"tower_id"`
	Name    string       `json:"name"`
	Active  bool         `json:"active"`
	Modules []ModuleInfo `json:"modules"`
}

func ValidateTowerOption(v *validator.Validator, towerOption *TowerOption) {
	v.Check(towerOption.Name != "", "name", "must be provided")
	v.Check(len(towerOption.Name) <= 500, "name", "must not be more than 500 bytes long")
}

type TowerOptionModel struct {
	DB *sql.DB
}

func (m TowerOptionModel) Insert(towerOption *TowerOption) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var unitType string
	queryCheck := `SELECT type FROM units WHERE id = $1`
	err = tx.QueryRow(queryCheck, towerOption.TowerID).Scan(&unitType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidUnitID
		}
		return err
	}

	if unitType != "tower" {
		return ErrUnitIsNotTower
	}

	if towerOption.Active {
		err = m.DeactivateTowerOptions(towerOption.TowerID)
		if err != nil {
			return err
		}
	}

	query := `
        INSERT INTO tower_option (id, tower_id, name, active)
        VALUES ($1, $2, $3, $4)`

	if towerOption.ID.IsNil() {
		towerOptionID, err := utils.NewUUIDv7()
		if err != nil {
			return err
		}
		towerOption.ID = towerOptionID
	}

	args := []interface{}{towerOption.ID, towerOption.TowerID, towerOption.Name, towerOption.Active}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err = tx.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	unitModel := UnitModel{DB: m.DB}
	err = unitModel.UpdateTowerFloorsMetrics(towerOption.TowerID)
	if err != nil {
		return err
	}

	return nil
}

func (m TowerOptionModel) GetByID(id uuid.UUID) (*TowerOption, error) {
	if id == uuid.Nil {
		return nil, ErrRecordNotFound
	}

	query := `
        SELECT id, tower_id, name, active
        FROM tower_option
        WHERE id = $1`

	var towerOption TowerOption

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&towerOption.ID,
		&towerOption.TowerID,
		&towerOption.Name,
		&towerOption.Active,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	modulesQuery := `
        SELECT id, type, total_co2_min, total_co2_max, total_energy_min, total_energy_max
        FROM module
        WHERE tower_option_id = $1`

	moduleRows, err := m.DB.QueryContext(ctx, modulesQuery, towerOption.ID)
	if err != nil {
		return nil, err
	}
	defer moduleRows.Close()

	modules := []ModuleInfo{}
	for moduleRows.Next() {
		var module ModuleInfo
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64
		err := moduleRows.Scan(
			&module.ID,
			&module.Type,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
		)
		if err != nil {
			return nil, err
		}
		if co2Min.Valid {
			module.Consumption = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}
		modules = append(modules, module)
	}
	if err = moduleRows.Err(); err != nil {
		return nil, err
	}
	towerOption.Modules = modules

	return &towerOption, nil
}

func (m TowerOptionModel) GetAll(towerID uuid.UUID) ([]*TowerOption, error) {
	query := `
        SELECT id, tower_id, name, active
        FROM tower_option
        WHERE tower_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, towerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	towerOptions := []*TowerOption{}

	for rows.Next() {
		var towerOption TowerOption

		err := rows.Scan(
			&towerOption.ID,
			&towerOption.TowerID,
			&towerOption.Name,
			&towerOption.Active,
		)
		if err != nil {
			return nil, err
		}

		modulesQuery := `
            SELECT id, type, total_co2_min, total_co2_max, total_energy_min, total_energy_max
            FROM module
            WHERE tower_option_id = $1`

		moduleRows, err := m.DB.QueryContext(ctx, modulesQuery, towerOption.ID)
		if err != nil {
			return nil, err
		}

		modules := []ModuleInfo{}
		for moduleRows.Next() {
			var module ModuleInfo
			var co2Min, co2Max, energyMin, energyMax sql.NullFloat64
			err := moduleRows.Scan(
				&module.ID,
				&module.Type,
				&co2Min,
				&co2Max,
				&energyMin,
				&energyMax,
			)
			if err != nil {
				moduleRows.Close()
				return nil, err
			}
			if co2Min.Valid {
				module.Consumption = &Consumption{
					CO2Min:    &co2Min.Float64,
					CO2Max:    &co2Max.Float64,
					EnergyMin: &energyMin.Float64,
					EnergyMax: &energyMax.Float64,
				}
			}
			modules = append(modules, module)
		}
		moduleRows.Close()
		if err = moduleRows.Err(); err != nil {
			return nil, err
		}
		towerOption.Modules = modules

		towerOptions = append(towerOptions, &towerOption)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return towerOptions, nil
}

func (m TowerOptionModel) Update(towerOption *TowerOption) error {
	if towerOption.Active {
		err := m.DeactivateTowerOptions(towerOption.TowerID)
		if err != nil {
			return err
		}
	}

	query := `
        UPDATE tower_option
        SET name = $1, active = $2
        WHERE id = $3`

	args := []interface{}{
		towerOption.Name,
		towerOption.Active,
		towerOption.ID,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, args...)
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

	unitModel := UnitModel{DB: m.DB}
	err = unitModel.UpdateTowerFloorsMetrics(towerOption.TowerID)
	if err != nil {
		return err
	}

	return nil
}

func (m TowerOptionModel) Delete(id uuid.UUID) error {
	if id == uuid.Nil {
		return ErrRecordNotFound
	}

	query := `
        DELETE FROM tower_option
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

func (m TowerOptionModel) DeactivateTowerOptions(towerID uuid.UUID) error {
	query := `
        UPDATE tower_option
        SET active = FALSE
        WHERE tower_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, towerID)
	return err
}
