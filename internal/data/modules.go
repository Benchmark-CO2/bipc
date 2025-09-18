package data

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/gofrs/uuid"
)

type Module struct {
	ID             uuid.UUID   `json:"id"`
	TowerOptionID  uuid.UUID   `json:"tower_option_id"`
	TotalCO2Min    *float64    `json:"total_co2_min,omitempty"`
	TotalCO2Max    *float64    `json:"total_co2_max,omitempty"`
	TotalEnergyMin *float64    `json:"total_energy_min,omitempty"`
	TotalEnergyMax *float64    `json:"total_energy_max,omitempty"`
	FloorIDs       []uuid.UUID `json:"floor_ids"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type BeamColumnModule struct {
	Module
	ConcreteColumns Concrete `json:"concrete_columns"`
	ConcreteBeams   Concrete `json:"concrete_beams"`
	ConcreteSlabs   Concrete `json:"concrete_slabs"`
	FormColumns     *float64 `json:"form_columns,omitempty"`
	FormBeams       *float64 `json:"form_beams,omitempty"`
	FormSlabs       *float64 `json:"form_slabs,omitempty"`
	FormTotal       *float64 `json:"form_total,omitempty"`
	ColumnNumber    *int     `json:"column_number,omitempty"`
	AvgBeamSpan     *int     `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *int     `json:"avg_slab_span,omitempty"`
}

type ConcreteWallModule struct {
	Module
	ConcreteWalls  Concrete `json:"concrete_walls"`
	ConcreteSlabs  Concrete `json:"concrete_slabs"`
		
	WallThickness *float64 `json:"wall_thickness,omitempty"`
	SlabThickness *float64 `json:"slab_thickness,omitempty"`
	WallArea      *float64 `json:"wall_area,omitempty"`
	SlabArea      *float64 `json:"slab_area,omitempty"`

	WallFormArea *float64    `json:"wall_form_area,omitempty"`
	SlabFormArea *float64    `json:"slab_form_area,omitempty"`
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

func insertModule(db dbExecutor, module *Module, moduleType string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		INSERT INTO module (id, tower_option_id, type, total_co2_min, total_co2_max, total_energy_min, total_energy_max)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, module.ID, module.TowerOptionID, moduleType, module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax)
	return err
}

func updateModule(db dbExecutor, module *Module) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, err := db.ExecContext(ctx, `
		UPDATE module SET
			tower_option_id = $1,
			total_co2_min = $2,
			total_co2_max = $3,
			total_energy_min = $4,
			total_energy_max = $5
		WHERE id = $6
	`, module.TowerOptionID, module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.ID)
	return err
}

func (m BeamColumnModuleModel) Insert(module *BeamColumnModule) (*BeamColumnModule, error) {
	tx, err := m.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	colID, err := InsertConcrete(tx, &module.ConcreteColumns)
	if err != nil {
		return nil, err
	}
	beamID, err := InsertConcrete(tx, &module.ConcreteBeams)
	if err != nil {
		return nil, err
	}
	slabID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return nil, err
	}

	err = insertModule(tx, &module.Module, "beam_column")
	if err != nil {
		return nil, checkForeignKeyError(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO module_beam_column (
			id, concrete_columns, concrete_beams, concrete_slabs,
			form_columns, form_beams, form_slabs, form_total, column_number, avg_beam_span, avg_slab_span
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING created_at, updated_at`
	err = tx.QueryRowContext(ctx, query,
		module.ID, colID, beamID, slabID,
		module.FormColumns, module.FormBeams, module.FormSlabs, module.FormTotal, module.ColumnNumber, module.AvgBeamSpan, module.AvgSlabSpan,
	).Scan(&module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return nil, err
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

func (m ConcreteWallModuleModel) Insert(module *ConcreteWallModule) (*ConcreteWallModule, error) {
	tx, err := m.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	wallsID, err := InsertConcrete(tx, &module.ConcreteWalls)
	if err != nil {
		return nil, err
	}
	slabsID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return nil, err
	}

	err = insertModule(tx, &module.Module, "concrete_wall")
	if err != nil {
		return nil, checkForeignKeyError(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO module_concrete_wall (
			id, concrete_walls, concrete_slabs,
			wall_thickness, slab_thickness, wall_area, slab_area, wall_form_area, slab_form_area
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		)
		RETURNING created_at, updated_at`
	err = tx.QueryRowContext(ctx, query,
		module.ID, wallsID, slabsID,
		module.WallThickness, module.SlabThickness, module.WallArea, module.SlabArea, module.WallFormArea, module.SlabFormArea,
	).Scan(&module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return nil, err
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

func (m BeamColumnModuleModel) Get(id uuid.UUID) (*BeamColumnModule, error) {
	query := `
		SELECT
			m.id, m.tower_option_id,
			bc.concrete_columns, bc.concrete_beams, bc.concrete_slabs,
			bc.form_columns, bc.form_beams, bc.form_slabs, bc.form_total,
			bc.column_number, bc.avg_beam_span, bc.avg_slab_span,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max,
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
			cw.wall_thickness, cw.slab_thickness, cw.wall_area, cw.slab_area, cw.wall_form_area, cw.slab_form_area,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max,
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
		&module.WallThickness, &module.SlabThickness, &module.WallArea, &module.SlabArea, &module.WallFormArea, &module.SlabFormArea,
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

func (m BeamColumnModuleModel) Update(module *BeamColumnModule) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var oldColID, oldBeamID, oldSlabID uuid.UUID
	query := `SELECT concrete_columns, concrete_beams, concrete_slabs FROM module_beam_column WHERE id = $1`
	err = tx.QueryRowContext(context.Background(), query, module.ID).Scan(&oldColID, &oldBeamID, &oldSlabID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	newColID, err := InsertConcrete(tx, &module.ConcreteColumns)
	if err != nil {
		return err
	}
	newBeamID, err := InsertConcrete(tx, &module.ConcreteBeams)
	if err != nil {
		return err
	}
	newSlabID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return err
	}

	query = `
		UPDATE module_beam_column SET
			concrete_columns = $1, concrete_beams = $2, concrete_slabs = $3,
			form_columns = $4, form_beams = $5, form_slabs = $6, form_total = $7,
			column_number = $8, avg_beam_span = $9, avg_slab_span = $10,
			updated_at = NOW()
		WHERE id = $11`
	_, err = tx.ExecContext(context.Background(), query,
		newColID, newBeamID, newSlabID,
		module.FormColumns, module.FormBeams, module.FormSlabs, module.FormTotal,
		module.ColumnNumber, module.AvgBeamSpan, module.AvgSlabSpan,
		module.ID)
	if err != nil {
		return err
	}

	if err := updateModule(tx, &module.Module); err != nil {
		return checkForeignKeyError(err)
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

	oldConcreteIDs := []uuid.UUID{oldColID, oldBeamID, oldSlabID}
	for _, concreteID := range oldConcreteIDs {
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
		err := tx.QueryRowContext(context.Background(), query, concreteID).Scan(&count)
		if err != nil {
			return err
		}

		if count == 0 {
			query = `DELETE FROM concrete WHERE id = $1`
			_, err = tx.ExecContext(context.Background(), query, concreteID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (m ConcreteWallModuleModel) Update(module *ConcreteWallModule) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var oldWallID, oldSlabID uuid.UUID
	query := `SELECT concrete_walls, concrete_slabs FROM module_concrete_wall WHERE id = $1`
	err = tx.QueryRowContext(context.Background(), query, module.ID).Scan(&oldWallID, &oldSlabID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	newWallID, err := InsertConcrete(tx, &module.ConcreteWalls)
	if err != nil {
		return err
	}
	newSlabID, err := InsertConcrete(tx, &module.ConcreteSlabs)
	if err != nil {
		return err
	}

	query = `
		UPDATE module_concrete_wall SET
			concrete_walls = $1, concrete_slabs = $2,
			wall_thickness = $3, slab_thickness = $4, wall_area = $5, slab_area = $6, wall_form_area = $7, slab_form_area = $8,
			updated_at = NOW()
		WHERE id = $9`
	_, err = tx.ExecContext(context.Background(), query,
		newWallID, newSlabID,
		module.WallThickness, module.SlabThickness, module.WallArea, module.SlabArea, module.WallFormArea, module.SlabFormArea,
		module.ID)
	if err != nil {
		return err
	}

	if err := updateModule(tx, &module.Module); err != nil {
		return checkForeignKeyError(err)
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

	oldConcreteIDs := []uuid.UUID{oldWallID, oldSlabID}
	for _, concreteID := range oldConcreteIDs {
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
		err := tx.QueryRowContext(context.Background(), query, concreteID).Scan(&count)
		if err != nil {
			return err
		}

		if count == 0 {
			query = `DELETE FROM concrete WHERE id = $1`
			_, err = tx.ExecContext(context.Background(), query, concreteID)
			if err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
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

	if err := updateFloorMetricsById(tx, floorIDs); err != nil {
		return err
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

	if err := updateFloorMetricsById(tx, floorIDs); err != nil {
		return err
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
