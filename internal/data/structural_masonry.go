package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Masonry struct {
	Grout  []GroutInfo  `json:"grout"`
	Mortar []MortarInfo `json:"mortar"`
	Blocks []BlockInfo  `json:"blocks"`
}

type GroutInfo struct {
	Position string        `json:"position"`
	Volumes  []GroutVolume `json:"volumes"`
	Steel    []SteelMass   `json:"steel"`
}

type GroutVolume struct {
	Fgk    int     `json:"fgk"`
	Volume float64 `json:"volume"`
}

type MortarInfo struct {
	Fak    float64 `json:"fak"`
	Volume float64 `json:"volume"`
}

type BlockInfo struct {
	Type  string `json:"type"`
	Fbk   int    `json:"fbk"`
	Count int    `json:"count"`
}

type StructuralMasonryModule struct {
	Module
	ConcreteColumns Concrete `json:"concrete_columns"`
	ConcreteBeams   Concrete `json:"concrete_beams"`
	ConcreteSlabs   Concrete `json:"concrete_slabs"`
	FormColumns     *float64 `json:"form_columns,omitempty"`
	FormBeams       *float64 `json:"form_beams,omitempty"`
	FormSlabs       *float64 `json:"form_slabs,omitempty"`
	FormTotal       *float64 `json:"form_total,omitempty"`
	Masonry         Masonry  `json:"masonry"`
}

type StructuralMasonryModuleModel struct {
	DB *sql.DB
}

func (m StructuralMasonryModuleModel) Insert(module *StructuralMasonryModule) (*StructuralMasonryModule, error) {
	tx, err := m.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	moduleData := map[string]interface{}{
		"concrete_columns": module.ConcreteColumns,
		"concrete_beams":   module.ConcreteBeams,
		"concrete_slabs":   module.ConcreteSlabs,
		"form_columns":     module.FormColumns,
		"form_beams":       module.FormBeams,
		"form_slabs":       module.FormSlabs,
		"form_total":       module.FormTotal,
		"masonry":          module.Masonry,
	}

	err = insertModuleWithData(tx, &module.Module, "structural_masonry", moduleData)
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

func (m StructuralMasonryModuleModel) Get(id uuid.UUID) (*StructuralMasonryModule, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module StructuralMasonryModule
	var moduleData map[string]interface{}

	query := `
		SELECT 
			m.id, m.tower_option_id, m.data,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max,
			m.relative_co2_min, m.relative_co2_max, m.relative_energy_min, m.relative_energy_max,
			m.created_at, m.updated_at
		FROM module m
		WHERE m.id = $1 AND m.type = 'structural_masonry'`

	var jsonData []byte
	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.TowerOptionID, &jsonData,
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

	if err := json.Unmarshal(jsonData, &moduleData); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	if colData, ok := moduleData["concrete_columns"].(map[string]interface{}); ok {
		module.ConcreteColumns = concreteFromMap(colData)
	}
	if beamData, ok := moduleData["concrete_beams"].(map[string]interface{}); ok {
		module.ConcreteBeams = concreteFromMap(beamData)
	}
	if slabData, ok := moduleData["concrete_slabs"].(map[string]interface{}); ok {
		module.ConcreteSlabs = concreteFromMap(slabData)
	}

	if formCols, ok := moduleData["form_columns"].(float64); ok {
		module.FormColumns = &formCols
	}
	if formBeams, ok := moduleData["form_beams"].(float64); ok {
		module.FormBeams = &formBeams
	}
	if formSlabs, ok := moduleData["form_slabs"].(float64); ok {
		module.FormSlabs = &formSlabs
	}
	if formTotal, ok := moduleData["form_total"].(float64); ok {
		module.FormTotal = &formTotal
	}

	if masonryData, ok := moduleData["masonry"].(map[string]interface{}); ok {
		module.Masonry = masonryFromMap(masonryData)
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

func (m StructuralMasonryModuleModel) Update(module *StructuralMasonryModule) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var moduleData map[string]interface{}
	var jsonData []byte
	query := `SELECT data FROM module WHERE id = $1 AND type = 'structural_masonry'`
	err = tx.QueryRowContext(context.Background(), query, module.ID).Scan(&jsonData)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	if err := json.Unmarshal(jsonData, &moduleData); err != nil {
		return err
	}

	newData := map[string]interface{}{
		"concrete_columns": module.ConcreteColumns,
		"concrete_beams":   module.ConcreteBeams,
		"concrete_slabs":   module.ConcreteSlabs,
		"form_columns":     module.FormColumns,
		"form_beams":       module.FormBeams,
		"form_slabs":       module.FormSlabs,
		"form_total":       module.FormTotal,
		"masonry":          module.Masonry,
	}

	if err := updateModuleWithData(tx, &module.Module, newData); err != nil {
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

func (m StructuralMasonryModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var moduleData map[string]interface{}
	var jsonData []byte
	query := `SELECT data FROM module WHERE id = $1 AND type = 'structural_masonry'`
	err = tx.QueryRowContext(ctx, query, id).Scan(&jsonData)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	if err := json.Unmarshal(jsonData, &moduleData); err != nil {
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

	query = `DELETE FROM module WHERE id = $1 AND type = 'structural_masonry'`
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

func concreteFromMap(data map[string]interface{}) Concrete {
	var concrete Concrete
	if id, ok := data["id"].(string); ok {
		concrete.ID, _ = uuid.Parse(id)
	}

	if volumesData, ok := data["volumes"].([]interface{}); ok {
		for _, v := range volumesData {
			if volMap, ok := v.(map[string]interface{}); ok {
				volume := ConcreteVolume{
					Fck:    int(volMap["fck"].(float64)),
					Volume: volMap["volume"].(float64),
				}
				concrete.Volumes = append(concrete.Volumes, volume)
			}
		}
	}

	if steelData, ok := data["steel"].([]interface{}); ok {
		for _, s := range steelData {
			if steelMap, ok := s.(map[string]interface{}); ok {
				steel := SteelMass{
					CA:   int(steelMap["ca"].(float64)),
					Mass: steelMap["mass"].(float64),
				}
				concrete.Steel = append(concrete.Steel, steel)
			}
		}
	}

	return concrete
}

func masonryFromMap(data map[string]interface{}) Masonry {
	var masonry Masonry

	if groutData, ok := data["grout"].([]interface{}); ok {
		for _, g := range groutData {
			if groutMap, ok := g.(map[string]interface{}); ok {
				grout := GroutInfo{
					Position: groutMap["position"].(string),
				}

				if volumesData, ok := groutMap["volumes"].([]interface{}); ok {
					for _, v := range volumesData {
						if volMap, ok := v.(map[string]interface{}); ok {
							volume := GroutVolume{
								Fgk:    int(volMap["fgk"].(float64)),
								Volume: volMap["volume"].(float64),
							}
							grout.Volumes = append(grout.Volumes, volume)
						}
					}
				}

				if steelData, ok := groutMap["steel"].([]interface{}); ok {
					for _, s := range steelData {
						if steelMap, ok := s.(map[string]interface{}); ok {
							steel := SteelMass{
								CA:   int(steelMap["ca"].(float64)),
								Mass: steelMap["mass"].(float64),
							}
							grout.Steel = append(grout.Steel, steel)
						}
					}
				}

				masonry.Grout = append(masonry.Grout, grout)
			}
		}
	}

	if mortarData, ok := data["mortar"].([]interface{}); ok {
		for _, m := range mortarData {
			if mortarMap, ok := m.(map[string]interface{}); ok {
				mortar := MortarInfo{
					Fak:    mortarMap["fak"].(float64),
					Volume: mortarMap["volume"].(float64),
				}
				masonry.Mortar = append(masonry.Mortar, mortar)
			}
		}
	}

	if blocksData, ok := data["blocks"].([]interface{}); ok {
		for _, b := range blocksData {
			if blockMap, ok := b.(map[string]interface{}); ok {
				block := BlockInfo{
					Type:  blockMap["type"].(string),
					Fbk:   int(blockMap["fbk"].(float64)),
					Count: int(blockMap["count"].(float64)),
				}
				masonry.Blocks = append(masonry.Blocks, block)
			}
		}
	}

	return masonry
}

func insertModuleWithData(tx *sql.Tx, module *Module, moduleType string, moduleData map[string]interface{}) error {
	jsonData, err := json.Marshal(moduleData)
	if err != nil {
		return err
	}

	query := `
        INSERT INTO module (id, tower_option_id, type, data,
            total_co2_min, total_co2_max, total_energy_min, total_energy_max,
            relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING created_at, updated_at`

	err = tx.QueryRowContext(context.Background(), query,
		module.ID, module.TowerOptionID, moduleType, jsonData,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax,
		module.RelativeCO2Min, module.RelativeCO2Max, module.RelativeEnergyMin, module.RelativeEnergyMax,
	).Scan(&module.CreatedAt, &module.UpdatedAt)

	return err
}

func updateModuleWithData(tx *sql.Tx, module *Module, moduleData map[string]interface{}) error {
	jsonData, err := json.Marshal(moduleData)
	if err != nil {
		return err
	}

	query := `
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

	return err
}
