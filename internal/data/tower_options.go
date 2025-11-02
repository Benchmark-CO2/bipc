package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

type ModuleInfo struct {
	ID          uuid.UUID    `json:"id"`
	Type        string       `json:"type"`
	Consumption *Consumption `json:"consumption,omitempty"`
}

type TowerOption struct {
	ID          uuid.UUID              `json:"id"`
	UnitID      uuid.UUID              `json:"unit_id"`
	RoleID      uuid.UUID              `json:"role_id"`
	Name        string                 `json:"name"`
	Active      bool                   `json:"active"`
	Modules     []ModuleInfo           `json:"modules"`
	Consumption map[string]*Consumption `json:"consumption,omitempty"`
}

func ValidateTowerOption(v *validator.Validator, towerOption *TowerOption) {
	v.Check(towerOption.Name != "", "name", "must be provided")
	v.Check(len(towerOption.Name) <= 500, "name", "must not be more than 500 bytes long")
	v.Check(towerOption.RoleID != uuid.Nil, "role_id", "must be provided")
}

type TowerOptionModel struct {
	DB *sql.DB
}

func (m TowerOptionModel) Insert(towerOption *TowerOption) error {
	towerOptionID, err := uuid.NewV7()
	if err != nil {
		return err
	}

	towerOption.ID = towerOptionID

	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var unitType string
	queryCheck := `SELECT type FROM units WHERE id = $1`
	err = tx.QueryRow(queryCheck, towerOption.UnitID).Scan(&unitType)
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
		err = m.DeactivateTowerOptions(towerOption.UnitID, towerOption.RoleID)
		if err != nil {
			return err
		}
	}

	query := `
        INSERT INTO tower_option (id, unit_id, role_id, name, active)
        VALUES ($1, $2, $3, $4, $5)`

	args := []interface{}{towerOption.ID, towerOption.UnitID, towerOption.RoleID, towerOption.Name, towerOption.Active}

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
	err = unitModel.UpdateUnitFloorsMetrics(towerOption.UnitID)
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
        SELECT id, unit_id, role_id, name, active
        FROM tower_option
        WHERE id = $1`

	var towerOption TowerOption

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&towerOption.ID,
		&towerOption.UnitID,
		&towerOption.RoleID,
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
        SELECT id, type, relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max
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

	consumption, err := GetFullConsumption(m.DB, towerOption.UnitID, towerOption.RoleID, towerOption.ID)
	if err != nil {
		return nil, err
	}
	if len(consumption) > 0 {
		towerOption.Consumption = consumption
	}

	return &towerOption, nil
}

func (m TowerOptionModel) GetAll(unitID uuid.UUID) ([]*TowerOption, error) {
	query := `
        SELECT id, unit_id, role_id, name, active
        FROM tower_option
        WHERE unit_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	towerOptions := []*TowerOption{}

	for rows.Next() {
		var towerOption TowerOption

		err := rows.Scan(
			&towerOption.ID,
			&towerOption.UnitID,
			&towerOption.RoleID,
			&towerOption.Name,
			&towerOption.Active,
		)
		if err != nil {
			return nil, err
		}

		modulesQuery := `
            SELECT id, type, relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max
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

		consumption, err := GetFullConsumption(m.DB, towerOption.UnitID, towerOption.RoleID, towerOption.ID)
		if err != nil {
			return nil, err
		}
		if len(consumption) > 0 {
			towerOption.Consumption = consumption
		}

		towerOptions = append(towerOptions, &towerOption)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return towerOptions, nil
}

func (m TowerOptionModel) GetAllByRole(unitID, roleID uuid.UUID) ([]*TowerOption, error) {
	query := `
        SELECT id, unit_id, role_id, name, active
        FROM tower_option
        WHERE unit_id = $1 AND role_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	towerOptions := []*TowerOption{}

	for rows.Next() {
		var towerOption TowerOption

		err := rows.Scan(
			&towerOption.ID,
			&towerOption.UnitID,
			&towerOption.RoleID,
			&towerOption.Name,
			&towerOption.Active,
		)
		if err != nil {
			return nil, err
		}

		modulesQuery := `
            SELECT id, type, relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max
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

		consumption, err := GetFullConsumption(m.DB, towerOption.UnitID, towerOption.RoleID, towerOption.ID)
		if err != nil {
			return nil, err
		}
		if len(consumption) > 0 {
			towerOption.Consumption = consumption
		}

		towerOptions = append(towerOptions, &towerOption)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return towerOptions, nil
}

func (m TowerOptionModel) Update(towerOption *TowerOption) error {
	if towerOption.Active {
		err := m.DeactivateTowerOptions(towerOption.UnitID, towerOption.RoleID)
		if err != nil {
			return err
		}
	}

	query := `
        UPDATE tower_option 
        SET role_id = $1, name = $2, active = $3
        WHERE id = $4`

	args := []any{
		towerOption.RoleID,
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
	err = unitModel.UpdateUnitFloorsMetrics(towerOption.UnitID)
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

func (m TowerOptionModel) DeactivateTowerOptions(unitID uuid.UUID, roleID uuid.UUID) error {
	query := `
        UPDATE tower_option
        SET active = FALSE
        WHERE unit_id = $1 AND role_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, unitID, roleID)
	return err
}
