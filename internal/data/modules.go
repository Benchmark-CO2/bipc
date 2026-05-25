package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Module struct {
	ID                uuid.UUID              `json:"id"`
	Type              string                 `json:"type"`
	OptionID          uuid.UUID              `json:"option_id"`
	Data              map[string]interface{} `json:"data"`
	TotalCO2Min       *float64               `json:"total_co2_min,omitempty"`
	TotalCO2Max       *float64               `json:"total_co2_max,omitempty"`
	TotalEnergyMin    *float64               `json:"total_energy_min,omitempty"`
	TotalEnergyMax    *float64               `json:"total_energy_max,omitempty"`
	TotalMaterial     *float64               `json:"total_material,omitempty"`
	RelativeCO2Min    *float64               `json:"relative_co2_min,omitempty"`
	RelativeCO2Max    *float64               `json:"relative_co2_max,omitempty"`
	RelativeEnergyMin *float64               `json:"relative_energy_min,omitempty"`
	RelativeEnergyMax *float64               `json:"relative_energy_max,omitempty"`
	Outdated          bool                   `json:"outdated"`
	FloorIDs          []uuid.UUID            `json:"floor_ids"`
	UnitID            *uuid.UUID             `json:"unit_id,omitempty"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

type ModuleModel struct {
	DB *sql.DB
}

func checkForeignKeyError(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "module_option_id_fkey") {
		return ErrInvalidOptionID
	}
	return err
}

func insertModuleTargetConsumptions(tx *sql.Tx, ctx context.Context, targets []ModuleTargetConsumption) error {
	insertQuery := `
		INSERT INTO module_target_consumption 
		(id, module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max, material)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	for _, target := range targets {
		target.ID = uuid.Must(uuid.NewV7())
		_, err := tx.ExecContext(ctx, insertQuery,
			target.ID, target.ModuleID, target.TargetID, target.TargetType, target.RoleID, target.OptionID,
			target.CO2Min, target.CO2Max, target.EnergyMin, target.EnergyMax, target.Material)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m ModuleModel) UpsertModuleTargetConsumptions(moduleID uuid.UUID, targets []ModuleTargetConsumption) error {
	if len(targets) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO module_target_consumption
		(module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max, material)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (module_id, target_id)
		DO UPDATE SET
			target_type = EXCLUDED.target_type,
			role_id = EXCLUDED.role_id,
			option_id = EXCLUDED.option_id,
			co2_min = EXCLUDED.co2_min,
			co2_max = EXCLUDED.co2_max,
			energy_min = EXCLUDED.energy_min,
			energy_max = EXCLUDED.energy_max,
			material = EXCLUDED.material`

	for _, target := range targets {
		_, err := tx.ExecContext(ctx, query,
			target.ModuleID,
			target.TargetID,
			target.TargetType,
			target.RoleID,
			target.OptionID,
			target.CO2Min,
			target.CO2Max,
			target.EnergyMin,
			target.EnergyMax,
			target.Material,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m ModuleModel) ListModuleIDsMissingConsumption() ([]uuid.UUID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT DISTINCT m.id
		FROM module m
		INNER JOIN module_target_consumption mtc ON m.id = mtc.module_id
		WHERE mtc.material IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM module_target_consumption mtc_floor
			LEFT JOIN floor f ON f.id = mtc_floor.target_id
			WHERE mtc_floor.module_id = m.id
			  AND mtc_floor.target_type = 'floor'
			  AND (f.id IS NULL OR COALESCE(f.area, 0) = 0)
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM module_target_consumption mtc_unit
			WHERE mtc_unit.module_id = m.id
			  AND mtc_unit.target_type = 'unit'
			  AND COALESCE((
				SELECT SUM(f.area)
				FROM floor f
				WHERE f.unit_id = mtc_unit.target_id
			), 0) = 0
		  )`

	rows, err := m.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	moduleIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		var moduleID uuid.UUID
		err := rows.Scan(&moduleID)
		if err != nil {
			return nil, err
		}
		moduleIDs = append(moduleIDs, moduleID)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return moduleIDs, nil
}

func (m ModuleModel) insertTx(tx *sql.Tx, module *Module) (*Module, error) {
	jsonData, err := json.Marshal(module.Data)
	if err != nil {
		return nil, err
	}

	query := `
        INSERT INTO module (id, option_id, type, data,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max, total_material,
			relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max,
			outdated)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING created_at, updated_at`

	err = tx.QueryRowContext(context.Background(), query,
		module.ID, module.OptionID, module.Type, jsonData,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.TotalMaterial,
		module.RelativeCO2Min, module.RelativeCO2Max, module.RelativeEnergyMin, module.RelativeEnergyMax,
		module.Outdated,
	).Scan(&module.CreatedAt, &module.UpdatedAt)

	if err != nil {
		return nil, checkForeignKeyError(err)
	}

	return module, nil
}

func (m ModuleModel) validateModuleTargets(tx *sql.Tx, ctx context.Context, module *Module) error {
	var optionUnitID uuid.UUID

	err := tx.QueryRowContext(ctx, `SELECT unit_id FROM options WHERE id = $1`, module.OptionID).Scan(&optionUnitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidOptionID
		}
		return err
	}

	if module.UnitID != nil && *module.UnitID != optionUnitID {
		return ErrInvalidUnitID
	}

	if len(module.FloorIDs) == 0 {
		return nil
	}

	var validFloorCount int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM floor
		WHERE unit_id = $1 AND id = ANY($2)`, optionUnitID, pq.Array(module.FloorIDs)).Scan(&validFloorCount)
	if err != nil {
		return err
	}

	if validFloorCount != len(module.FloorIDs) {
		return ErrInvalidFloorID
	}

	return nil
}

func (m ModuleModel) Insert(module *Module, targets []ModuleTargetConsumption) (*Module, error) {
	hasFloors := len(module.FloorIDs) > 0
	hasUnit := module.UnitID != nil

	if hasFloors && hasUnit {
		return nil, errors.New("module cannot have both floor_ids and unit_id")
	}
	if !hasFloors && !hasUnit {
		return nil, errors.New("module must have either floor_ids or unit_id")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := m.validateModuleTargets(tx, ctx, module); err != nil {
		return nil, err
	}

	_, err = m.insertTx(tx, module)
	if err != nil {
		return nil, err
	}

	if err := insertModuleTargetConsumptions(tx, ctx, targets); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return m.Get(module.ID)
}

func (m ModuleModel) Get(id uuid.UUID) (*Module, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module Module
	var jsonData []byte

	query := `
		SELECT 
			m.id, m.option_id, m.type, m.data,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max, m.total_material,
			m.relative_co2_min, m.relative_co2_max, m.relative_energy_min, m.relative_energy_max,
			m.outdated, m.created_at, m.updated_at
		FROM module m
		WHERE m.id = $1`

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.OptionID, &module.Type, &jsonData,
		&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax, &module.TotalMaterial,
		&module.RelativeCO2Min, &module.RelativeCO2Max, &module.RelativeEnergyMin, &module.RelativeEnergyMax,
		&module.Outdated, &module.CreatedAt, &module.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(jsonData, &module.Data); err != nil {
		return nil, err
	}

	rows, err := m.DB.QueryContext(ctx, `
		SELECT DISTINCT target_id FROM module_target_consumption 
		WHERE module_id = $1 AND target_type = 'floor'`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var floorIDs []uuid.UUID
	for rows.Next() {
		var floorID uuid.UUID
		if err := rows.Scan(&floorID); err != nil {
			return nil, err
		}
		floorIDs = append(floorIDs, floorID)
	}
	module.FloorIDs = floorIDs

	var unitID uuid.UUID
	err = m.DB.QueryRowContext(ctx, `
		SELECT DISTINCT target_id FROM module_target_consumption 
		WHERE module_id = $1 AND target_type = 'unit'`, id).Scan(&unitID)
	if err == nil {
		module.UnitID = &unitID
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	return &module, nil
}

func (m ModuleModel) updateTx(tx *sql.Tx, module *Module) error {
	query := `SELECT id FROM module WHERE id = $1 AND type = $2`
	var existingID uuid.UUID
	err := tx.QueryRowContext(context.Background(), query, module.ID, module.Type).Scan(&existingID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	jsonData, err := json.Marshal(module.Data)
	if err != nil {
		return err
	}

	query = `
        UPDATE module
        SET data = $1,
            total_co2_min = $2, total_co2_max = $3,
			total_energy_min = $4, total_energy_max = $5,
			total_material = $6,
			relative_co2_min = $7, relative_co2_max = $8,
			relative_energy_min = $9, relative_energy_max = $10,
            outdated = FALSE,
            updated_at = NOW()
		WHERE id = $11`

	_, err = tx.ExecContext(context.Background(), query,
		jsonData,
		module.TotalCO2Min, module.TotalCO2Max,
		module.TotalEnergyMin, module.TotalEnergyMax,
		module.TotalMaterial,
		module.RelativeCO2Min, module.RelativeCO2Max,
		module.RelativeEnergyMin, module.RelativeEnergyMax,
		module.ID)

	return err
}

func (m ModuleModel) Update(module *Module, targets []ModuleTargetConsumption) error {
	hasFloors := len(module.FloorIDs) > 0
	hasUnit := module.UnitID != nil

	if hasFloors && hasUnit {
		return errors.New("module cannot have both floor_ids and unit_id")
	}
	if !hasFloors && !hasUnit {
		return errors.New("module must have either floor_ids or unit_id")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := m.validateModuleTargets(tx, ctx, module); err != nil {
		return err
	}

	if err := m.updateTx(tx, module); err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "DELETE FROM module_target_consumption WHERE module_id = $1", module.ID)
	if err != nil {
		return err
	}

	if err := insertModuleTargetConsumptions(tx, ctx, targets); err != nil {
		return err
	}

	return tx.Commit()
}

func (m ModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `DELETE FROM module WHERE id = $1`
	result, err := tx.ExecContext(ctx, query, id)
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

	return tx.Commit()
}

func (m ModuleModel) GetModuleType(id uuid.UUID) (string, error) {
	query := `
		SELECT type
		FROM module
		WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var moduleType string
	err := m.DB.QueryRowContext(ctx, query, id).Scan(&moduleType)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", ErrRecordNotFound
		}
		return "", err
	}

	return moduleType, nil
}

func (m ModuleModel) HasModulesForUnit(tx *sql.Tx, unitID uuid.UUID) (bool, error) {
	query := `
		SELECT COUNT(DISTINCT m.id)
		FROM module m
		INNER JOIN module_target_consumption mtc ON m.id = mtc.module_id
		INNER JOIN floor f ON mtc.target_id = f.id AND mtc.target_type = 'floor'
		WHERE f.unit_id = $1`

	var moduleCount int
	err := tx.QueryRow(query, unitID).Scan(&moduleCount)
	if err != nil {
		return false, err
	}

	return moduleCount > 0, nil
}

func (m ModuleModel) MarkModulesAsOutdatedForUnit(tx *sql.Tx, unitID uuid.UUID) error {
	query := `
		UPDATE module m
		SET outdated = TRUE
		FROM module_target_consumption mtc
		INNER JOIN floor f ON mtc.target_id = f.id AND mtc.target_type = 'floor'
		WHERE m.id = mtc.module_id AND f.unit_id = $1`

	_, err := tx.Exec(query, unitID)
	return err
}

func (m ModuleModel) MarkModulesAsOutdatedForFloors(tx *sql.Tx, floorIDs []uuid.UUID) error {
	query := `
		UPDATE module m
		SET outdated = TRUE
		FROM module_target_consumption mtc
		WHERE m.id = mtc.module_id 
			AND mtc.target_type = 'floor' 
			AND mtc.target_id = ANY($1)`

	_, err := tx.Exec(query, pq.Array(floorIDs))
	return err
}
