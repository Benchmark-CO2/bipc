package data

import (
	"context"
	"database/sql"
	"time"
)

type Concrete struct {
	ID          int64   `json:"id"`
	VolumeFck20 float64 `json:"volume_fck20"`
	VolumeFck25 float64 `json:"volume_fck25"`
	VolumeFck30 float64 `json:"volume_fck30"`
	VolumeFck35 float64 `json:"volume_fck35"`
	VolumeFck40 float64 `json:"volume_fck40"`
	VolumeFck45 float64 `json:"volume_fck45"`
}

type BeamColumnModule struct {
	ID              int64     `json:"id"`
	UnitID          int64     `json:"unit_id"`
	Name            string    `json:"name"`
	FloorRepetition int       `json:"floor_repetition"`
	FloorArea       float64   `json:"floor_area"`
	FloorHeight     float64   `json:"floor_height"`
	ConcreteColumns Concrete  `json:"concrete_columns"`
	ConcreteBeams   Concrete  `json:"concrete_beams"`
	ConcreteSlabs   Concrete  `json:"concrete_slabs"`
	SteelCA50       float64   `json:"steel_ca50"`
	SteelCA60       float64   `json:"steel_ca60"`
	FormColumns     *float64  `json:"form_columns,omitempty"`
	FormBeams       *float64  `json:"form_beams,omitempty"`
	FormSlabs       *float64  `json:"form_slabs,omitempty"`
	FormTotal       *float64  `json:"form_total,omitempty"`
	ColumnNumber    *int      `json:"column_number,omitempty"`
	AvgBeamSpan     *int      `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *int      `json:"avg_slab_span,omitempty"`
	TotalCO2Min     *float64  `json:"total_co2_min,omitempty"`
	TotalCO2Max     *float64  `json:"total_co2_max,omitempty"`
	TotalEnergyMin  *float64  `json:"total_energy_min,omitempty"`
	TotalEnergyMax  *float64  `json:"total_energy_max,omitempty"`
	Version         int32     `json:"version"`
	InUse           bool      `json:"in_use"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ConcreteWallModule struct {
	ID              int64     `json:"id"`
	UnitID          int64     `json:"unit_id"`
	Name            string    `json:"name"`
	FloorRepetition int       `json:"floor_repetition"`
	FloorArea       float64   `json:"floor_area"`
	FloorHeight     float64   `json:"floor_height"`
	ConcreteWalls   Concrete  `json:"concrete_walls"`
	ConcreteSlabs   Concrete  `json:"concrete_slabs"`
	SteelCA50       float64   `json:"steel_ca50"`
	SteelCA60       float64   `json:"steel_ca60"`
	WallThickness   *float64  `json:"wall_thickness,omitempty"`
	SlabThickness   *float64  `json:"slab_thickness,omitempty"`
	FormArea        *float64  `json:"form_area,omitempty"`
	WallArea        *float64  `json:"wall_area,omitempty"`
	TotalCO2Min     *float64  `json:"total_co2_min,omitempty"`
	TotalCO2Max     *float64  `json:"total_co2_max,omitempty"`
	TotalEnergyMin  *float64  `json:"total_energy_min,omitempty"`
	TotalEnergyMax  *float64  `json:"total_energy_max,omitempty"`
	Version         int32     `json:"version"`
	InUse           bool      `json:"in_use"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type BeamColumnModuleModel struct {
	DB *sql.DB
}

type ConcreteWallModuleModel struct {
	DB *sql.DB
}

func InsertConcrete(db *sql.DB, c *Concrete) (int64, error) {
	query := `
		INSERT INTO concrete (volume_fck20, volume_fck25, volume_fck30, volume_fck35, volume_fck40, volume_fck45)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	var id int64
	err := db.QueryRowContext(ctx, query,
		c.VolumeFck20, c.VolumeFck25, c.VolumeFck30, c.VolumeFck35, c.VolumeFck40, c.VolumeFck45,
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (m BeamColumnModuleModel) Insert(module *BeamColumnModule) error {
	colID, err := InsertConcrete(m.DB, &module.ConcreteColumns)
	if err != nil {
		return err
	}
	beamID, err := InsertConcrete(m.DB, &module.ConcreteBeams)
	if err != nil {
		return err
	}
	slabID, err := InsertConcrete(m.DB, &module.ConcreteSlabs)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if module.ID > 0 {
		query := `
			INSERT INTO module_beam_column (
				id, unit_id, name, floor_repetition, floor_area, floor_height,
				concrete_columns, concrete_beams, concrete_slabs, steel_ca50, steel_ca60,
				form_columns, form_beams, form_slabs, form_total, column_number, avg_beam_span, avg_slab_span,
				total_co2_min, total_co2_max, total_energy_min, total_energy_max, version, in_use
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
			)
			RETURNING id, created_at, updated_at`
		return m.DB.QueryRowContext(ctx, query,
			module.ID, module.UnitID, module.Name, module.FloorRepetition, module.FloorArea, module.FloorHeight,
			colID, beamID, slabID, module.SteelCA50, module.SteelCA60,
			module.FormColumns, module.FormBeams, module.FormSlabs, module.FormTotal, module.ColumnNumber, module.AvgBeamSpan, module.AvgSlabSpan,
			module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.Version, module.InUse,
		).Scan(&module.ID, &module.CreatedAt, &module.UpdatedAt)
	}
	query := `
		INSERT INTO module_beam_column (
			unit_id, name, floor_repetition, floor_area, floor_height,
			concrete_columns, concrete_beams, concrete_slabs, steel_ca50, steel_ca60,
			form_columns, form_beams, form_slabs, form_total, column_number, avg_beam_span, avg_slab_span,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max, version, in_use
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
		)
		RETURNING id, created_at, updated_at`
	return m.DB.QueryRowContext(ctx, query,
		module.UnitID, module.Name, module.FloorRepetition, module.FloorArea, module.FloorHeight,
		colID, beamID, slabID, module.SteelCA50, module.SteelCA60,
		module.FormColumns, module.FormBeams, module.FormSlabs, module.FormTotal, module.ColumnNumber, module.AvgBeamSpan, module.AvgSlabSpan,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.Version, module.InUse,
	).Scan(&module.ID, &module.CreatedAt, &module.UpdatedAt)
}

func (m ConcreteWallModuleModel) Insert(module *ConcreteWallModule) error {
	wallsID, err := InsertConcrete(m.DB, &module.ConcreteWalls)
	if err != nil {
		return err
	}
	slabsID, err := InsertConcrete(m.DB, &module.ConcreteSlabs)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if module.ID > 0 {
		query := `
			INSERT INTO module_concrete_wall (
				id, unit_id, name, floor_repetition, floor_area, floor_height,
				concrete_walls, concrete_slabs, steel_ca50, steel_ca60,
				wall_thickness, slab_thickness, form_area, wall_area,
				total_co2_min, total_co2_max, total_energy_min, total_energy_max, version, in_use
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
			)
			RETURNING id, created_at, updated_at`
		return m.DB.QueryRowContext(ctx, query,
			module.ID, module.UnitID, module.Name, module.FloorRepetition, module.FloorArea, module.FloorHeight,
			wallsID, slabsID, module.SteelCA50, module.SteelCA60,
			module.WallThickness, module.SlabThickness, module.FormArea, module.WallArea,
			module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.Version, module.InUse,
		).Scan(&module.ID, &module.CreatedAt, &module.UpdatedAt)
	}
	query := `
		INSERT INTO module_concrete_wall (
			unit_id, name, floor_repetition, floor_area, floor_height,
			concrete_walls, concrete_slabs, steel_ca50, steel_ca60,
			wall_thickness, slab_thickness, form_area, wall_area,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max, version, in_use
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		)
		RETURNING id, created_at, updated_at`
	return m.DB.QueryRowContext(ctx, query,
		module.UnitID, module.Name, module.FloorRepetition, module.FloorArea, module.FloorHeight,
		wallsID, slabsID, module.SteelCA50, module.SteelCA60,
		module.WallThickness, module.SlabThickness, module.FormArea, module.WallArea,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.Version, module.InUse,
	).Scan(&module.ID, &module.CreatedAt, &module.UpdatedAt)
}

func (m BeamColumnModuleModel) GetById(id int64) ([]*BeamColumnModule, error) {
	query := `SELECT
		mbc.id, mbc.unit_id, mbc.name, mbc.floor_repetition, mbc.floor_area, mbc.floor_height,
		cc.id, cc.volume_fck20, cc.volume_fck25, cc.volume_fck30, cc.volume_fck35, cc.volume_fck40, cc.volume_fck45,
		cb.id, cb.volume_fck20, cb.volume_fck25, cb.volume_fck30, cb.volume_fck35, cb.volume_fck40, cb.volume_fck45,
		cs.id, cs.volume_fck20, cs.volume_fck25, cs.volume_fck30, cs.volume_fck35, cs.volume_fck40, cs.volume_fck45,
		mbc.steel_ca50, mbc.steel_ca60,
		mbc.form_columns, mbc.form_beams, mbc.form_slabs, mbc.form_total, mbc.column_number, mbc.avg_beam_span, mbc.avg_slab_span,
		mbc.total_co2_min, mbc.total_co2_max, mbc.total_energy_min, mbc.total_energy_max,
		mbc.version, mbc.in_use, mbc.created_at, mbc.updated_at
	FROM module_beam_column mbc
	LEFT JOIN concrete cc ON mbc.concrete_columns = cc.id
	LEFT JOIN concrete cb ON mbc.concrete_beams = cb.id
	LEFT JOIN concrete cs ON mbc.concrete_slabs = cs.id
	WHERE mbc.id = $1
	ORDER BY mbc.version ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []*BeamColumnModule

	for rows.Next() {
		var module BeamColumnModule
		err := rows.Scan(
			&module.ID, &module.UnitID, &module.Name, &module.FloorRepetition, &module.FloorArea, &module.FloorHeight,
			&module.ConcreteColumns.ID, &module.ConcreteColumns.VolumeFck20, &module.ConcreteColumns.VolumeFck25, &module.ConcreteColumns.VolumeFck30, &module.ConcreteColumns.VolumeFck35, &module.ConcreteColumns.VolumeFck40, &module.ConcreteColumns.VolumeFck45,
			&module.ConcreteBeams.ID, &module.ConcreteBeams.VolumeFck20, &module.ConcreteBeams.VolumeFck25, &module.ConcreteBeams.VolumeFck30, &module.ConcreteBeams.VolumeFck35, &module.ConcreteBeams.VolumeFck40, &module.ConcreteBeams.VolumeFck45,
			&module.ConcreteSlabs.ID, &module.ConcreteSlabs.VolumeFck20, &module.ConcreteSlabs.VolumeFck25, &module.ConcreteSlabs.VolumeFck30, &module.ConcreteSlabs.VolumeFck35, &module.ConcreteSlabs.VolumeFck40, &module.ConcreteSlabs.VolumeFck45,
			&module.SteelCA50, &module.SteelCA60,
			&module.FormColumns, &module.FormBeams, &module.FormSlabs, &module.FormTotal, &module.ColumnNumber, &module.AvgBeamSpan, &module.AvgSlabSpan,
			&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax,
			&module.Version, &module.InUse, &module.CreatedAt, &module.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		modules = append(modules, &module)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if len(modules) == 0 {
		return nil, ErrRecordNotFound
	}

	return modules, nil
}

func (m ConcreteWallModuleModel) GetById(id int64) ([]*ConcreteWallModule, error) {
	query := `SELECT
		mcw.id, mcw.unit_id, mcw.name, mcw.floor_repetition, mcw.floor_area, mcw.floor_height,
		cw.id, cw.volume_fck20, cw.volume_fck25, cw.volume_fck30, cw.volume_fck35, cw.volume_fck40, cw.volume_fck45,
		cs.id, cs.volume_fck20, cs.volume_fck25, cs.volume_fck30, cs.volume_fck35, cs.volume_fck40, cs.volume_fck45,
		mcw.steel_ca50, mcw.steel_ca60,
		mcw.wall_thickness, mcw.slab_thickness, mcw.form_area, mcw.wall_area,
		mcw.total_co2_min, mcw.total_co2_max, mcw.total_energy_min, mcw.total_energy_max,
		mcw.version, mcw.in_use, mcw.created_at, mcw.updated_at
	FROM module_concrete_wall mcw
	LEFT JOIN concrete cw ON mcw.concrete_walls = cw.id
	LEFT JOIN concrete cs ON mcw.concrete_slabs = cs.id
	WHERE mcw.id = $1
	ORDER BY mcw.version ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var modules []*ConcreteWallModule

	for rows.Next() {
		var module ConcreteWallModule
		err := rows.Scan(
			&module.ID, &module.UnitID, &module.Name, &module.FloorRepetition, &module.FloorArea, &module.FloorHeight,
			&module.ConcreteWalls.ID, &module.ConcreteWalls.VolumeFck20, &module.ConcreteWalls.VolumeFck25, &module.ConcreteWalls.VolumeFck30, &module.ConcreteWalls.VolumeFck35, &module.ConcreteWalls.VolumeFck40, &module.ConcreteWalls.VolumeFck45,
			&module.ConcreteSlabs.ID, &module.ConcreteSlabs.VolumeFck20, &module.ConcreteSlabs.VolumeFck25, &module.ConcreteSlabs.VolumeFck30, &module.ConcreteSlabs.VolumeFck35, &module.ConcreteSlabs.VolumeFck40, &module.ConcreteSlabs.VolumeFck45,
			&module.SteelCA50, &module.SteelCA60,
			&module.WallThickness, &module.SlabThickness, &module.FormArea, &module.WallArea,
			&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax,
			&module.Version, &module.InUse, &module.CreatedAt, &module.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		modules = append(modules, &module)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	if len(modules) == 0 {
		return nil, ErrRecordNotFound
	}

	return modules, nil
}

func (m BeamColumnModuleModel) Delete(id int64) error {
	query := `
		DELETE FROM module_beam_column
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

func (m ConcreteWallModuleModel) Delete(id int64) error {
	query := `
		DELETE FROM module_concrete_wall
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

func (m BeamColumnModuleModel) UpdateName(id int64, name string) error {
	query := `
		UPDATE module_beam_column
		SET name = $1
		WHERE id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, name, id)
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

func (m ConcreteWallModuleModel) UpdateName(id int64, name string) error {
	query := `
		UPDATE module_concrete_wall
		SET name = $1
		WHERE id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, name, id)
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

