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
	query := `
		INSERT INTO module_concrete_wall (
			unit_id, name, floor_repetition, floor_area, floor_height,
			concrete_walls, concrete_slabs, steel_ca50, steel_ca60,
			wall_thickness, slab_thickness, form_area, wall_area,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max, version, in_use
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19
		)
		RETURNING id, created_at, updated_at`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return m.DB.QueryRowContext(ctx, query,
		module.UnitID, module.Name, module.FloorRepetition, module.FloorArea, module.FloorHeight,
		wallsID, slabsID, module.SteelCA50, module.SteelCA60,
		module.WallThickness, module.SlabThickness, module.FormArea, module.WallArea,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.Version, module.InUse,
	).Scan(&module.ID, &module.CreatedAt, &module.UpdatedAt)
}

func (m BeamColumnModuleModel) GetLatestVersion(id int64) (int32, error) {
	query := `SELECT version FROM module_beam_column WHERE id = $1 ORDER BY version DESC LIMIT 1`
	var version int32
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	err := m.DB.QueryRowContext(ctx, query, id).Scan(&version)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil // ou -1 se preferir indicar ausência
		}
		return 0, err
	}
	return version, nil
}

