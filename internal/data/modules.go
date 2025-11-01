package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Module struct {
	ID                uuid.UUID              `json:"id"`
	Type              string                 `json:"type"`
	TowerOptionID     uuid.UUID              `json:"tower_option_id"`
	Data              map[string]interface{} `json:"data"`
	TotalCO2Min       *float64               `json:"total_co2_min,omitempty"`
	TotalCO2Max       *float64               `json:"total_co2_max,omitempty"`
	TotalEnergyMin    *float64               `json:"total_energy_min,omitempty"`
	TotalEnergyMax    *float64               `json:"total_energy_max,omitempty"`
	RelativeCO2Min    *float64               `json:"relative_co2_min,omitempty"`
	RelativeCO2Max    *float64               `json:"relative_co2_max,omitempty"`
	RelativeEnergyMin *float64               `json:"relative_energy_min,omitempty"`
	RelativeEnergyMax *float64               `json:"relative_energy_max,omitempty"`
	FloorIDs          []uuid.UUID            `json:"floor_ids"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

type ModuleModel struct {
	DB *sql.DB
}

type dbExecutor interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func checkForeignKeyError(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "module_tower_option_id_fkey") {
		return ErrInvalidTowerOptionID
	}
	if strings.Contains(err.Error(), "module_floor_floor_id_fkey") {
		return ErrInvalidFloorID
	}
	return err
}

func insertModuleFloor(db dbExecutor, moduleID uuid.UUID, floorIDs []uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	for _, floorID := range floorIDs {
		_, err := db.ExecContext(ctx,
			`INSERT INTO module_floor (module_id, floor_id) VALUES ($1, $2)`,
			moduleID, floorID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m ModuleModel) Insert(module *Module) (*Module, error) {
	tx, err := m.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	jsonData, err := json.Marshal(module.Data)
	if err != nil {
		return nil, err
	}

	query := `
        INSERT INTO module (id, tower_option_id, type, data,
            total_co2_min, total_co2_max, total_energy_min, total_energy_max,
            relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING created_at, updated_at`

	err = tx.QueryRowContext(context.Background(), query,
		module.ID, module.TowerOptionID, module.Type, jsonData,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax,
		module.RelativeCO2Min, module.RelativeCO2Max, module.RelativeEnergyMin, module.RelativeEnergyMax,
	).Scan(&module.CreatedAt, &module.UpdatedAt)

	if err != nil {
		return nil, checkForeignKeyError(err)
	}

	if err := insertModuleFloor(tx, module.ID, module.FloorIDs); err != nil {
		return nil, checkForeignKeyError(err)
	}

	if err := updateFloorMetricsById(tx, module.FloorIDs); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return module, nil
}

func (m ModuleModel) Get(id uuid.UUID) (*Module, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module Module
	var jsonData []byte

	query := `
		SELECT 
			m.id, m.tower_option_id, m.type, m.data,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max,
			m.relative_co2_min, m.relative_co2_max, m.relative_energy_min, m.relative_energy_max,
			m.created_at, m.updated_at
		FROM module m
		WHERE m.id = $1`

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.TowerOptionID, &module.Type, &jsonData,
		&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax,
		&module.RelativeCO2Min, &module.RelativeCO2Max, &module.RelativeEnergyMin, &module.RelativeEnergyMax,
		&module.CreatedAt, &module.UpdatedAt,
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

	rows, err := m.DB.QueryContext(ctx, `SELECT floor_id FROM module_floor WHERE module_id = $1`, id)
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

	return &module, nil
}

func (m ModuleModel) Update(module *Module) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `SELECT id FROM module WHERE id = $1 AND type = $2`
	var existingID uuid.UUID
	err = tx.QueryRowContext(context.Background(), query, module.ID, module.Type).Scan(&existingID)
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
            relative_co2_min = $6, relative_co2_max = $7,
            relative_energy_min = $8, relative_energy_max = $9,
            updated_at = NOW()
        WHERE id = $10`

	_, err = tx.ExecContext(context.Background(), query,
		jsonData,
		module.TotalCO2Min, module.TotalCO2Max,
		module.TotalEnergyMin, module.TotalEnergyMax,
		module.RelativeCO2Min, module.RelativeCO2Max,
		module.RelativeEnergyMin, module.RelativeEnergyMax,
		module.ID)

	if err != nil {
		return err
	}

	_, err = tx.ExecContext(context.Background(), `DELETE FROM module_floor WHERE module_id = $1`, module.ID)
	if err != nil {
		return err
	}

	err = insertModuleFloor(tx, module.ID, module.FloorIDs)
	if err != nil {
		return checkForeignKeyError(err)
	}

	if err := updateFloorMetricsById(tx, module.FloorIDs); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m ModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var floorIDs []uuid.UUID
	rows, err := tx.QueryContext(ctx, `SELECT floor_id FROM module_floor WHERE module_id = $1`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var floorID uuid.UUID
		if err := rows.Scan(&floorID); err != nil {
			return err
		}
		floorIDs = append(floorIDs, floorID)
	}
	if err = rows.Err(); err != nil {
		return err
	}

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

	if err := updateFloorMetricsById(tx, floorIDs); err != nil {
		return err
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
