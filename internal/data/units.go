package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrNilUnitID             = errors.New("unit ID must be provided")
	ErrInvalidUnitID         = errors.New("unit_id does not exist or is invalid")
	ErrUnitIsNotTower        = errors.New("the specified unit is not a tower")
	ErrInvalidFloorID        = errors.New("one or more floor_ids are invalid or do not exist")
	ErrZeroArea              = errors.New("floor or unit has zero area")
	ErrInvalidFloorFilter    = errors.New("invalid floor filter")
	ErrDuplicateFloorIndexes = errors.New("floor indexes must be unique")
	ErrFloorIndexGap         = errors.New("floor indexes must be continuous without gaps")
	ErrInvalidFloor          = errors.New("invalid floor")
)

type Unit struct {
	ID              uuid.UUID `json:"id"`
	ProjectID       uuid.UUID `json:"project_id"`
	Name            string    `json:"name"`
	Type            string    `json:"type"`
	RepetitionCount int       `json:"repetition_count"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Version         int32     `json:"version"`
	Floors          []Floor   `json:"floors,omitempty"`
}

type Consumption struct {
	CO2Min    *float64 `json:"co2_min,omitempty"`
	CO2Max    *float64 `json:"co2_max,omitempty"`
	EnergyMin *float64 `json:"energy_min,omitempty"`
	EnergyMax *float64 `json:"energy_max,omitempty"`
}

type Floor struct {
	ID           uuid.UUID               `json:"id"`
	UnitID       uuid.UUID               `json:"unit_id"`
	FloorGroup   string                  `json:"floor_group"`
	Category     string                  `json:"category"`
	Area         float64                 `json:"area"`
	Height       float64                 `json:"height"`
	Index        int                     `json:"index"`
	Consumptions map[string]*Consumption `json:"consumptions,omitempty"`
}

type FloorCreate struct {
	ID         uuid.UUID `json:"id,omitempty"`
	FloorGroup string    `json:"floor_group"`
	Category   string    `json:"category"`
	Area       float64   `json:"area"`
	Height     float64   `json:"height"`
	Index      int       `json:"index"`
}

func ValidateUnit(v *validator.Validator, unit *Unit) {
	if unit.RepetitionCount == 0 {
		unit.RepetitionCount = 1
	}
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
	v.Check(unit.RepetitionCount > 0, "repetition_count", "must be greater than zero")
}

func validateFloorIndexes(floors []FloorCreate) error {
	if len(floors) == 0 {
		return nil
	}

	indexMap := make(map[int]bool)
	minIndex := floors[0].Index
	maxIndex := floors[0].Index

	for _, floor := range floors {
		if indexMap[floor.Index] {
			return ErrDuplicateFloorIndexes
		}
		indexMap[floor.Index] = true

		if floor.Index < minIndex {
			minIndex = floor.Index
		}
		if floor.Index > maxIndex {
			maxIndex = floor.Index
		}
	}

	// Check for continuous indexes (no gaps)
	expectedCount := maxIndex - minIndex + 1
	if len(floors) != expectedCount {
		return ErrFloorIndexGap
	}

	// Verify all indexes exist in range
	for i := minIndex; i <= maxIndex; i++ {
		if !indexMap[i] {
			return ErrFloorIndexGap
		}
	}

	return nil
}

func insertFloors(tx *sql.Tx, unitID uuid.UUID, floors []FloorCreate) error {
	queryFloor := `INSERT INTO floor (id, unit_id, floor_group, category, area, height, "index") VALUES ($1, $2, $3, $4, $5, $6, $7)`

	for _, floor := range floors {
		floorID := floor.ID
		if floorID == uuid.Nil {
			var err error
			floorID, err = uuid.NewV7()
			if err != nil {
				return err
			}
		}

		_, err := tx.Exec(queryFloor, floorID, unitID, floor.FloorGroup, floor.Category, floor.Area, floor.Height, floor.Index)
		if err != nil {
			return err
		}
	}

	return nil
}

func (m UnitModel) Insert(unit *Unit, floors []FloorCreate) error {
	if unit.ID == uuid.Nil {
		return ErrNilUnitID
	}

	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	queryUnit := `
		INSERT INTO units (id, project_id, name, type, repetition_count)
		VALUES ($1, $2, $3, $4, $5)`
	_, err = tx.Exec(queryUnit, unit.ID, unit.ProjectID, unit.Name, unit.Type, unit.RepetitionCount)
	if err != nil {
		return err
	}

	if unit.Type == "tower" && len(floors) > 0 {
		if err := validateFloorIndexes(floors); err != nil {
			return err
		}

		if err := insertFloors(tx, unit.ID, floors); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m UnitModel) GetByID(id uuid.UUID) (*Unit, error) {
	if id == uuid.Nil {
		return nil, ErrRecordNotFound
	}

	query := `
		SELECT id, project_id, name, type, repetition_count, created_at, updated_at, version
		FROM units
		WHERE id = $1`

	var unit Unit

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&unit.ID,
		&unit.ProjectID,
		&unit.Name,
		&unit.Type,
		&unit.RepetitionCount,
		&unit.CreatedAt,
		&unit.UpdatedAt,
		&unit.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	if unit.Type == "tower" {
		floors, err := m.getFloorsByUnitID(id)
		if err != nil {
			return nil, err
		}
		unit.Floors = floors
	}

	return &unit, nil
}

func (m UnitModel) GetFloorArea(floorID uuid.UUID) (float64, error) {
	query := `SELECT area FROM floor WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var area float64
	err := m.DB.QueryRowContext(ctx, query, floorID).Scan(&area)
	if err != nil {
		return 0, err
	}

	return area, nil
}

func (m UnitModel) GetUnitTotalArea(unitID uuid.UUID) (float64, error) {
	query := `SELECT COALESCE(SUM(area), 0) FROM floor WHERE unit_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var totalArea float64
	err := m.DB.QueryRowContext(ctx, query, unitID).Scan(&totalArea)
	if err != nil {
		return 0, err
	}

	return totalArea, nil
}

func (m UnitModel) getFloorsByUnitID(unitID uuid.UUID) ([]Floor, error) {
	query := `
		SELECT f.id, f.unit_id, f.floor_group, f.category, f.area, f.height, f.index,
		       ftm.technology, ftm.co2_min, ftm.co2_max, ftm.energy_min, ftm.energy_max
		FROM floor f
		LEFT JOIN (
			SELECT mtc.target_id as floor_id, m.type as technology, 
			       SUM(mtc.co2_min) as co2_min, SUM(mtc.co2_max) as co2_max, 
			       SUM(mtc.energy_min) as energy_min, SUM(mtc.energy_max) as energy_max
			FROM module_target_consumption mtc
			INNER JOIN module m ON mtc.module_id = m.id
			INNER JOIN options opt ON mtc.option_id = opt.id AND mtc.role_id = opt.role_id
			WHERE mtc.target_type = 'floor' AND opt.active = TRUE
			GROUP BY mtc.target_id, m.type
		) ftm ON f.id = ftm.floor_id
		WHERE f.unit_id = $1
		ORDER BY f.index`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	floorsMap := make(map[uuid.UUID]*Floor)
	var orderedFloorIDs []uuid.UUID

	for rows.Next() {
		var floorID, floorUnitID uuid.UUID
		var floorGroup, category string
		var area, height float64
		var index int
		var tech sql.NullString
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&floorID, &floorUnitID, &floorGroup, &category, &area, &height, &index,
			&tech, &co2Min, &co2Max, &energyMin, &energyMax,
		)
		if err != nil {
			return nil, err
		}

		if _, ok := floorsMap[floorID]; !ok {
			floorsMap[floorID] = &Floor{
				ID:           floorID,
				UnitID:       floorUnitID,
				FloorGroup:   floorGroup,
				Category:     category,
				Area:         area,
				Height:       height,
				Index:        index,
				Consumptions: make(map[string]*Consumption),
			}
			orderedFloorIDs = append(orderedFloorIDs, floorID)
		}

		if tech.Valid && co2Min.Valid {
			if _, ok := floorsMap[floorID].Consumptions[tech.String]; !ok {
				floorsMap[floorID].Consumptions[tech.String] = newConsumption()
			}
			cons := floorsMap[floorID].Consumptions[tech.String]
			*cons.CO2Min += co2Min.Float64
			*cons.CO2Max += co2Max.Float64
			*cons.EnergyMin += energyMin.Float64
			*cons.EnergyMax += energyMax.Float64
		}
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	// Calculate totals
	for _, floor := range floorsMap {
		if len(floor.Consumptions) > 0 {
			total := newConsumption()
			for _, consumption := range floor.Consumptions {
				total.Add(consumption)
			}
			floor.Consumptions["total"] = total
		}
	}

	var floors []Floor
	for _, id := range orderedFloorIDs {
		floors = append(floors, *floorsMap[id])
	}

	return floors, nil
}

func (m UnitModel) getExistingFloors(tx *sql.Tx, unitID uuid.UUID) (map[uuid.UUID]*Floor, error) {
	queryExistingFloors := `
		SELECT id, floor_group, category, area, height, "index"
		FROM floor
		WHERE unit_id = $1
		ORDER BY "index"`

	rows, err := tx.Query(queryExistingFloors, unitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	existingFloors := make(map[uuid.UUID]*Floor)
	for rows.Next() {
		var floor Floor
		if err := rows.Scan(&floor.ID, &floor.FloorGroup, &floor.Category, &floor.Area, &floor.Height, &floor.Index); err != nil {
			return nil, err
		}
		floor.UnitID = unitID
		existingFloors[floor.ID] = &floor
	}

	return existingFloors, rows.Err()
}

func (m UnitModel) Update(unit *Unit, floors []FloorCreate) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	queryUnit := `
		UPDATE units 
		SET name = $1, repetition_count = $2, updated_at = CURRENT_TIMESTAMP, version = version + 1
		WHERE id = $3
		RETURNING version`

	err = tx.QueryRow(queryUnit, unit.Name, unit.RepetitionCount, unit.ID).Scan(&unit.Version)
	if err != nil {
		return err
	}

	if len(floors) == 0 {
		return tx.Commit()
	}

	if err := validateFloorIndexes(floors); err != nil {
		return err
	}

	existingFloors, err := m.getExistingFloors(tx, unit.ID)
	if err != nil {
		return err
	}

	validatedFloors := make([]FloorCreate, 0, len(floors))
	for _, floor := range floors {
		if floor.ID != uuid.Nil {
			if _, exists := existingFloors[floor.ID]; exists {
				validatedFloors = append(validatedFloors, floor)
			} else {
				floor.ID = uuid.Nil
				validatedFloors = append(validatedFloors, floor)
			}
		} else {
			validatedFloors = append(validatedFloors, floor)
		}
	}

	moduleModel := ModuleModel{DB: m.DB}
	hasModules, err := moduleModel.HasModulesForUnit(tx, unit.ID)
	if err != nil {
		return err
	}

	var changedFloorIDs []uuid.UUID
	existingIDs := make(map[uuid.UUID]bool)

	for id := range existingFloors {
		existingIDs[id] = true
	}

	for _, newFloor := range validatedFloors {
		if newFloor.ID != uuid.Nil {
			if existingFloor, exists := existingFloors[newFloor.ID]; exists {
				if existingFloor.Area != newFloor.Area ||
					existingFloor.Height != newFloor.Height ||
					existingFloor.Index != newFloor.Index ||
					existingFloor.FloorGroup != newFloor.FloorGroup ||
					existingFloor.Category != newFloor.Category {
					changedFloorIDs = append(changedFloorIDs, newFloor.ID)
				}
				delete(existingIDs, newFloor.ID)
			}
		}
	}

	for removedID := range existingIDs {
		changedFloorIDs = append(changedFloorIDs, removedID)
	}

	if len(existingIDs) > 0 {
		removedIDs := make([]uuid.UUID, 0, len(existingIDs))
		for id := range existingIDs {
			removedIDs = append(removedIDs, id)
		}
		queryDeleteFloors := `DELETE FROM floor WHERE id = ANY($1)`
		_, err = tx.Exec(queryDeleteFloors, pq.Array(removedIDs))
		if err != nil {
			return err
		}
	}

	var floorsToInsert []FloorCreate
	for _, floor := range validatedFloors {
		if floor.ID != uuid.Nil {
			queryUpdate := `
				UPDATE floor 
				SET floor_group = $1, category = $2, area = $3, height = $4, "index" = $5
				WHERE id = $6`
			_, err = tx.Exec(queryUpdate, floor.FloorGroup, floor.Category, floor.Area, floor.Height, floor.Index, floor.ID)
			if err != nil {
				return err
			}
		} else {
			floorsToInsert = append(floorsToInsert, floor)
		}
	}

	if len(floorsToInsert) > 0 {
		if err := insertFloors(tx, unit.ID, floorsToInsert); err != nil {
			return err
		}
	}

	if hasModules && len(changedFloorIDs) > 0 {
		err = moduleModel.MarkModulesAsOutdatedForFloors(tx, changedFloorIDs)
		if err != nil {
			return err
		}

		optionModel := OptionModel{DB: m.DB}
		err = optionModel.DeactivateOptionsWithOutdatedModules(tx, unit.ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m UnitModel) Delete(id uuid.UUID) error {
	if id == uuid.Nil {
		return ErrRecordNotFound
	}

	query := `DELETE FROM units WHERE id = $1`

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

type UnitModel struct {
	DB *sql.DB
}

func (m UnitModel) GetConsumptionByRole(unitID, roleID uuid.UUID) (map[string]*Consumption, error) {
	var activeOptionID uuid.UUID
	query := `
		SELECT id 
		FROM options 
		WHERE unit_id = $1 AND role_id = $2 AND active = TRUE
		LIMIT 1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, unitID, roleID).Scan(&activeOptionID)
	if err != nil {
		if err == sql.ErrNoRows {
			return make(map[string]*Consumption), nil
		}
		return nil, err
	}

	return GetFullConsumption(m.DB, unitID, roleID, activeOptionID)
}
