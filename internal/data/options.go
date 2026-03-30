package data

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

var (
	ErrNilOptionID              = errors.New("option ID must be provided")
	ErrInvalidOptionID          = errors.New("option_id does not exist or is invalid")
	ErrOptionHasOutdatedModules = errors.New("option has outdated modules and cannot be activated")
)

type ModuleInfo struct {
	ID          uuid.UUID    `json:"id"`
	Type        string       `json:"type"`
	Outdated    bool         `json:"outdated"`
	Consumption *Consumption `json:"consumption,omitempty"`
}

type Option struct {
	ID          uuid.UUID               `json:"id"`
	UnitID      uuid.UUID               `json:"unit_id"`
	RoleID      uuid.UUID               `json:"role_id"`
	Name        string                  `json:"name"`
	Active      bool                    `json:"active"`
	Modules     []ModuleInfo            `json:"modules"`
	Consumption map[string]*Consumption `json:"consumption,omitempty"`
}

func ValidateOption(v *validator.Validator, option *Option) {
	v.Check(option.Name != "", "name", "must be provided")
	v.Check(len(option.Name) <= 500, "name", "must not be more than 500 bytes long")
	v.Check(option.RoleID != uuid.Nil, "role_id", "must be provided")
}

type OptionModel struct {
	DB *sql.DB
}

func (m OptionModel) hasOutdatedModules(optionID uuid.UUID) (bool, error) {
	var outdatedCount int
	queryOutdated := `SELECT COUNT(*) FROM module WHERE option_id = $1 AND outdated = TRUE`
	err := m.DB.QueryRow(queryOutdated, optionID).Scan(&outdatedCount)
	if err != nil {
		return false, err
	}
	return outdatedCount > 0, nil
}

func (m OptionModel) Insert(option *Option) error {
	if option.ID == uuid.Nil {
		return ErrNilOptionID
	}

	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var unitType string
	queryCheck := `SELECT type FROM units WHERE id = $1`
	err = tx.QueryRow(queryCheck, option.UnitID).Scan(&unitType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidUnitID
		}
		return err
	}

	if unitType != "tower" {
		return ErrUnitIsNotTower
	}

	if option.Active {
		err = m.DeactivateOptions(option.UnitID, option.RoleID)
		if err != nil {
			return err
		}
	}

	query := `
        INSERT INTO options (id, unit_id, role_id, name, active)
        VALUES ($1, $2, $3, $4, $5)`

	args := []interface{}{option.ID, option.UnitID, option.RoleID, option.Name, option.Active}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err = tx.ExecContext(ctx, query, args...)
	if err != nil {
		if strings.Contains(err.Error(), "options_role_id_fkey") {
			return ErrInvalidRoleID
		}
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	err = updateAllFloorMetrics(m.DB, option.UnitID)
	if err != nil {
		return err
	}

	return nil
}

func (m OptionModel) GetByID(id uuid.UUID) (*Option, error) {
	if id == uuid.Nil {
		return nil, ErrRecordNotFound
	}

	query := `
        SELECT id, unit_id, role_id, name, active
        FROM options
        WHERE id = $1`

	var option Option

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&option.ID,
		&option.UnitID,
		&option.RoleID,
		&option.Name,
		&option.Active,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	modules, err := getModuleConsumptionByOption(ctx, m.DB, option.ID)
	if err != nil {
		return nil, err
	}
	option.Modules = modules

	consumption, err := GetFullConsumption(m.DB, option.UnitID, option.RoleID, option.ID)
	if err != nil {
		return nil, err
	}
	if len(consumption) > 0 {
		option.Consumption = consumption
	}

	return &option, nil
}

func (m OptionModel) GetAll(unitID uuid.UUID) ([]*Option, error) {
	query := `
        SELECT id, unit_id, role_id, name, active
        FROM options
        WHERE unit_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	options := []*Option{}

	for rows.Next() {
		var option Option

		err := rows.Scan(
			&option.ID,
			&option.UnitID,
			&option.RoleID,
			&option.Name,
			&option.Active,
		)
		if err != nil {
			return nil, err
		}

		modules, err := getModuleConsumptionByOption(ctx, m.DB, option.ID)
		if err != nil {
			return nil, err
		}
		option.Modules = modules

		consumption, err := GetFullConsumption(m.DB, option.UnitID, option.RoleID, option.ID)
		if err != nil {
			return nil, err
		}
		if len(consumption) > 0 {
			option.Consumption = consumption
		}

		options = append(options, &option)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return options, nil
}

func (m OptionModel) GetAllByRole(unitID, roleID uuid.UUID) ([]*Option, error) {
	query := `
        SELECT id, unit_id, role_id, name, active
        FROM options
        WHERE unit_id = $1 AND role_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	options := []*Option{}

	for rows.Next() {
		var option Option

		err := rows.Scan(
			&option.ID,
			&option.UnitID,
			&option.RoleID,
			&option.Name,
			&option.Active,
		)
		if err != nil {
			return nil, err
		}

		modules, err := getModuleConsumptionByOption(ctx, m.DB, option.ID)
		if err != nil {
			return nil, err
		}
		option.Modules = modules

		consumption, err := GetFullConsumption(m.DB, option.UnitID, option.RoleID, option.ID)
		if err != nil {
			return nil, err
		}
		if len(consumption) > 0 {
			option.Consumption = consumption
		}

		options = append(options, &option)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return options, nil
}

func (m OptionModel) Update(option *Option) error {
	if option.Active {
		hasOutdated, err := m.hasOutdatedModules(option.ID)
		if err != nil {
			return err
		}

		if hasOutdated {
			return ErrOptionHasOutdatedModules
		}

		err = m.DeactivateOptions(option.UnitID, option.RoleID)
		if err != nil {
			return err
		}
	}

	query := `
        UPDATE options 
        SET role_id = $1, name = $2, active = $3
        WHERE id = $4`

	args := []any{
		option.RoleID,
		option.Name,
		option.Active,
		option.ID,
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

	err = updateAllFloorMetrics(m.DB, option.UnitID)
	if err != nil {
		return err
	}

	return nil
}

func (m OptionModel) Delete(id uuid.UUID) error {
	if id == uuid.Nil {
		return ErrRecordNotFound
	}

	query := `
        DELETE FROM options
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

func (m OptionModel) DeactivateOptions(unitID uuid.UUID, roleID uuid.UUID) error {
	query := `
        UPDATE options
        SET active = FALSE
        WHERE unit_id = $1 AND role_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, unitID, roleID)
	return err
}

func (m OptionModel) DeactivateOptionsWithOutdatedModules(tx *sql.Tx, unitID uuid.UUID) error {
	query := `
		UPDATE options opt
		SET active = FALSE
		WHERE opt.unit_id = $1
		AND EXISTS (
			SELECT 1 FROM module m
			WHERE m.option_id = opt.id AND m.outdated = TRUE
		)`

	_, err := tx.Exec(query, unitID)
	return err
}
