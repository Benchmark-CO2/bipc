package data

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/gofrs/uuid"
)

type BeamColumnModule struct {
	ID              uuid.UUID   `json:"id"`
	TowerOptionID   uuid.UUID   `json:"tower_option_id"`
	ConcreteColumns Concrete    `json:"concrete_columns"`
	ConcreteBeams   Concrete    `json:"concrete_beams"`
	ConcreteSlabs   Concrete    `json:"concrete_slabs"`
	FormColumns     *float64    `json:"form_columns,omitempty"`
	FormBeams       *float64    `json:"form_beams,omitempty"`
	FormSlabs       *float64    `json:"form_slabs,omitempty"`
	FormTotal       *float64    `json:"form_total,omitempty"`
	ColumnNumber    *int        `json:"column_number,omitempty"`
	AvgBeamSpan     *int        `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *int        `json:"avg_slab_span,omitempty"`
	TotalCO2Min     *float64    `json:"total_co2_min,omitempty"`
	TotalCO2Max     *float64    `json:"total_co2_max,omitempty"`
	TotalEnergyMin  *float64    `json:"total_energy_min,omitempty"`
	TotalEnergyMax  *float64    `json:"total_energy_max,omitempty"`
	FloorIDs        []uuid.UUID `json:"floor_ids"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type ConcreteWallModule struct {
	ID             uuid.UUID   `json:"id"`
	TowerOptionID  uuid.UUID   `json:"tower_option_id"`
	ConcreteWalls  Concrete    `json:"concrete_walls"`
	ConcreteSlabs  Concrete    `json:"concrete_slabs"`
	WallThickness  *float64    `json:"wall_thickness,omitempty"`
	SlabThickness  *float64    `json:"slab_thickness,omitempty"`
	FormArea       *float64    `json:"form_area,omitempty"`
	WallArea       *float64    `json:"wall_area,omitempty"`
	TotalCO2Min    *float64    `json:"total_co2_min,omitempty"`
	TotalCO2Max    *float64    `json:"total_co2_max,omitempty"`
	TotalEnergyMin *float64    `json:"total_energy_min,omitempty"`
	TotalEnergyMax *float64    `json:"total_energy_max,omitempty"`
	FloorIDs       []uuid.UUID `json:"floor_ids"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type BeamColumnModuleModel struct {
	DB *sql.DB
}

type ConcreteWallModuleModel struct {
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

func insertModule(db dbExecutor, moduleID uuid.UUID, towerOptionID uuid.UUID, moduleType string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO module (id, tower_option_id, type)
		VALUES ($1, $2, $3)
	`, moduleID, towerOptionID, moduleType)
	return err
}

func (m BeamColumnModuleModel) Insert(module *BeamColumnModule) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	colID, err := InsertConcrete(tx, &module.ConcreteColumns)
	if err != nil {
		return err
	}
	beamID, err := InsertConcrete(tx, &module.ConcreteBeams)
	if err != nil {
		return err
	}
	slabID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return err
	}

	err = insertModule(tx, module.ID, module.TowerOptionID, "beam_column")
	if err != nil {
		return checkForeignKeyError(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO module_beam_column (
			id, concrete_columns, concrete_beams, concrete_slabs,
			form_columns, form_beams, form_slabs, form_total, column_number, avg_beam_span, avg_slab_span,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
		)
		RETURNING created_at, updated_at`
	err = tx.QueryRowContext(ctx, query,
		module.ID, colID, beamID, slabID,
		module.FormColumns, module.FormBeams, module.FormSlabs, module.FormTotal, module.ColumnNumber, module.AvgBeamSpan, module.AvgSlabSpan,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax,
	).Scan(&module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return err
	}

	if err := insertModuleFloor(tx, module.ID, module.FloorIDs); err != nil {
		return checkForeignKeyError(err)
	}
	return tx.Commit()
}

func (m ConcreteWallModuleModel) Insert(module *ConcreteWallModule) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	wallsID, err := InsertConcrete(tx, &module.ConcreteWalls)
	if err != nil {
		return err
	}
	slabsID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return err
	}

	err = insertModule(tx, module.ID, module.TowerOptionID, "concrete_wall")
	if err != nil {
		return checkForeignKeyError(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO module_concrete_wall (
			id, concrete_walls, concrete_slabs,
			wall_thickness, slab_thickness, form_area, wall_area,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING created_at, updated_at`
	err = tx.QueryRowContext(ctx, query,
		module.ID, wallsID, slabsID,
		module.WallThickness, module.SlabThickness, module.FormArea, module.WallArea,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax,
	).Scan(&module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return err
	}

	if err := insertModuleFloor(tx, module.ID, module.FloorIDs); err != nil {
		return checkForeignKeyError(err)
	}
	return tx.Commit()
}

func (m BeamColumnModuleModel) Get(id uuid.UUID) (*BeamColumnModule, error) {
	query := `
		SELECT
			m.id, m.tower_option_id,
			bc.concrete_columns, bc.concrete_beams, bc.concrete_slabs,
			bc.form_columns, bc.form_beams, bc.form_slabs, bc.form_total,
			bc.column_number, bc.avg_beam_span, bc.avg_slab_span,
			bc.total_co2_min, bc.total_co2_max, bc.total_energy_min, bc.total_energy_max,
			bc.created_at, bc.updated_at
		FROM module m
		JOIN module_beam_column bc ON m.id = bc.id
		WHERE m.id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module BeamColumnModule
	var colID, beamID, slabID uuid.UUID

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.TowerOptionID,
		&colID, &beamID, &slabID,
		&module.FormColumns, &module.FormBeams, &module.FormSlabs, &module.FormTotal,
		&module.ColumnNumber, &module.AvgBeamSpan, &module.AvgSlabSpan,
		&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax,
		&module.CreatedAt, &module.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	module.ConcreteColumns, err = GetConcrete(m.DB, colID)
	if err != nil {
		return nil, err
	}
	module.ConcreteBeams, err = GetConcrete(m.DB, beamID)
	if err != nil {
		return nil, err
	}
	module.ConcreteSlabs, err = GetConcrete(m.DB, slabID)
	if err != nil {
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

func (m ConcreteWallModuleModel) Get(id uuid.UUID) (*ConcreteWallModule, error) {
	query := `
		SELECT
			m.id, m.tower_option_id,
			cw.concrete_walls, cw.concrete_slabs,
			cw.wall_thickness, cw.slab_thickness, cw.form_area, cw.wall_area,
			cw.total_co2_min, cw.total_co2_max, cw.total_energy_min, cw.total_energy_max,
			cw.created_at, cw.updated_at
		FROM module m
		JOIN module_concrete_wall cw ON m.id = cw.id
		WHERE m.id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module ConcreteWallModule
	var wallID, slabID uuid.UUID

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.TowerOptionID,
		&wallID, &slabID,
		&module.WallThickness, &module.SlabThickness, &module.FormArea, &module.WallArea,
		&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax,
		&module.CreatedAt, &module.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	module.ConcreteWalls, err = GetConcrete(m.DB, wallID)
	if err != nil {
		return nil, err
	}
	module.ConcreteSlabs, err = GetConcrete(m.DB, slabID)
	if err != nil {
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

func (m BeamColumnModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var colID, beamID, slabID uuid.UUID
	query := `
		SELECT concrete_columns, concrete_beams, concrete_slabs
		FROM module_beam_column
		WHERE id = $1`

	err = tx.QueryRowContext(ctx, query, id).Scan(&colID, &beamID, &slabID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	query = `DELETE FROM module WHERE id = $1`
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

	concreteIDs := []uuid.UUID{colID, beamID, slabID}
	for _, concreteID := range concreteIDs {
		var count int
		query = `
			SELECT COUNT(*) FROM (
				SELECT concrete_columns AS id FROM module_beam_column
				UNION ALL
				SELECT concrete_beams FROM module_beam_column
				UNION ALL
				SELECT concrete_slabs FROM module_beam_column
				UNION ALL
				SELECT concrete_walls FROM module_concrete_wall
				UNION ALL
				SELECT concrete_slabs FROM module_concrete_wall
			) AS concrete_usage WHERE id = $1
		`
		err := tx.QueryRowContext(ctx, query, concreteID).Scan(&count)
		if err != nil {
			return err
		}

		if count == 0 {
			query = `DELETE FROM concrete WHERE id = $1`
			_, err = tx.ExecContext(ctx, query, concreteID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (m ConcreteWallModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var wallID, slabID uuid.UUID
	query := `
		SELECT concrete_walls, concrete_slabs
		FROM module_concrete_wall
		WHERE id = $1`

	err = tx.QueryRowContext(ctx, query, id).Scan(&wallID, &slabID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	query = `DELETE FROM module WHERE id = $1`
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

	concreteIDs := []uuid.UUID{wallID, slabID}
	for _, concreteID := range concreteIDs {
		var count int
		query = `
			SELECT COUNT(*) FROM (
				SELECT concrete_columns AS id FROM module_beam_column
				UNION ALL
				SELECT concrete_beams FROM module_beam_column
				UNION ALL
				SELECT concrete_slabs FROM module_beam_column
				UNION ALL
				SELECT concrete_walls FROM module_concrete_wall
				UNION ALL
				SELECT concrete_slabs FROM module_concrete_wall
			) AS concrete_usage WHERE id = $1
		`
		err := tx.QueryRowContext(ctx, query, concreteID).Scan(&count)
		if err != nil {
			return err
		}

		if count == 0 {
			query = `DELETE FROM concrete WHERE id = $1`
			_, err = tx.ExecContext(ctx, query, concreteID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (m BeamColumnModuleModel) GetModuleType(id uuid.UUID) (string, error) {
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
