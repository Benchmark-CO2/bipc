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
	ErrInvalidUnitID         = errors.New("unit_id does not exist or is invalid")
	ErrUnitIsNotTower        = errors.New("the specified unit is not a tower")
	ErrInvalidFloorID        = errors.New("one or more floor_ids are invalid or do not exist")
	ErrInvalidFloorFilter    = errors.New("invalid floor filter")
	ErrDuplicateFloorIndexes = errors.New("floor indexes must be unique")
	ErrFloorIndexGap         = errors.New("floor indexes must be continuous without gaps")
	ErrInvalidFloor          = errors.New("invalid floor")
)

type Unit struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uuid.UUID `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Version   int32     `json:"version"`
	Floors    []Floor   `json:"floors,omitempty"`
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
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
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
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	unit.ID, err = uuid.NewV7()
	if err != nil {
		return err
	}

	queryUnit := `
		INSERT INTO units (id, project_id, name, type)
		VALUES ($1, $2, $3, $4)`
	_, err = tx.Exec(queryUnit, unit.ID, unit.ProjectID, unit.Name, unit.Type)
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
		SELECT id, project_id, name, type, created_at, updated_at, version
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

func (m UnitModel) getFloorsByUnitID(unitID uuid.UUID) ([]Floor, error) {
	query := `
		SELECT f.id, f.unit_id, f.floor_group, f.category, f.area, f.height, f.index,
		       ftm.technology, ftm.co2_min, ftm.co2_max, ftm.energy_min, ftm.energy_max
		FROM floor f
		LEFT JOIN (
			SELECT fc.floor_id, fc.technology, fc.co2_min, fc.co2_max, fc.energy_min, fc.energy_max
			FROM floors_consumption fc
			INNER JOIN options opt ON fc.option_id = opt.id AND fc.role_id = opt.role_id
			WHERE opt.active = TRUE
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
				floorsMap[floorID].Consumptions[tech.String] = &Consumption{
					CO2Min:    new(float64),
					CO2Max:    new(float64),
					EnergyMin: new(float64),
					EnergyMax: new(float64),
				}
			}
			*floorsMap[floorID].Consumptions[tech.String].CO2Min += co2Min.Float64
			*floorsMap[floorID].Consumptions[tech.String].CO2Max += co2Max.Float64
			*floorsMap[floorID].Consumptions[tech.String].EnergyMin += energyMin.Float64
			*floorsMap[floorID].Consumptions[tech.String].EnergyMax += energyMax.Float64
		}
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	// Calculate totals
	for _, floor := range floorsMap {
		if len(floor.Consumptions) > 0 {
			total := &Consumption{
				CO2Min:    new(float64),
				CO2Max:    new(float64),
				EnergyMin: new(float64),
				EnergyMax: new(float64),
			}
			for _, consumption := range floor.Consumptions {
				*total.CO2Min += *consumption.CO2Min
				*total.CO2Max += *consumption.CO2Max
				*total.EnergyMin += *consumption.EnergyMin
				*total.EnergyMax += *consumption.EnergyMax
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
		SET name = $1, updated_at = CURRENT_TIMESTAMP, version = version + 1
		WHERE id = $2
		RETURNING version`
	
	err = tx.QueryRow(queryUnit, unit.Name, unit.ID).Scan(&unit.Version)
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

func (m UnitModel) UpdateUnitFloorsMetrics(unitID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		SELECT id
		FROM floor
		WHERE unit_id = $1`

	rows, err := tx.QueryContext(ctx, query, unitID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var floorIDs []uuid.UUID
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

	if len(floorIDs) > 0 {
		err = updateFloorMetricsById(tx, floorIDs)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

type UnitModel struct {
	DB *sql.DB
}

type FloorMetrics struct {
	FloorID   uuid.UUID
	Area      float64
	ModuleIDs []uuid.UUID
}

type ModuleMetrics struct {
	ModuleID       uuid.UUID
	RoleID         uuid.UUID
	OptionID       uuid.UUID
	Active         bool
	Type           string
	TotalCO2Min    float64
	TotalCO2Max    float64
	TotalEnergyMin float64
	TotalEnergyMax float64
}

func loadFloorsAndModules(tx *sql.Tx, floorIDs []uuid.UUID) (map[uuid.UUID]*FloorMetrics, map[uuid.UUID]*ModuleMetrics, error) {
	rows, err := tx.Query(`
		SELECT
			f.id, f.area,
			m.id, m.type, opt.active, opt.role_id, opt.id,
			m.total_co2_min, m.total_co2_max,
			m.total_energy_min, m.total_energy_max
		FROM floor f
		LEFT JOIN module_floor mf ON f.id = mf.floor_id
		LEFT JOIN module m ON mf.module_id = m.id
		LEFT JOIN options opt ON m.option_id = opt.id
		WHERE f.id = ANY($1)`, pq.Array(floorIDs))
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	floors := make(map[uuid.UUID]*FloorMetrics)
	modules := make(map[uuid.UUID]*ModuleMetrics)

	for rows.Next() {
		var (
			floorID                              uuid.UUID
			area                                 float64
			moduleID, moduleType, roleID, optionID sql.NullString
			active                               sql.NullBool
			co2Min, co2Max, energyMin, energyMax sql.NullFloat64
		)

		if err := rows.Scan(&floorID, &area, &moduleID, &moduleType, &active, &roleID, &optionID, &co2Min, &co2Max, &energyMin, &energyMax); err != nil {
			return nil, nil, err
		}

		if _, ok := floors[floorID]; !ok {
			floors[floorID] = &FloorMetrics{
				FloorID:   floorID,
				Area:      area,
				ModuleIDs: []uuid.UUID{},
			}
		}

		if moduleID.Valid {
			mid, err := uuid.Parse(moduleID.String)
			if err != nil {
				return nil, nil, err
			}

			rid, err := uuid.Parse(roleID.String)
			if err != nil {
				return nil, nil, err
			}

			oid, err := uuid.Parse(optionID.String)
			if err != nil {
				return nil, nil, err
			}

			floors[floorID].ModuleIDs = append(floors[floorID].ModuleIDs, mid)

			if _, ok := modules[mid]; !ok {
				modules[mid] = &ModuleMetrics{
					ModuleID:       mid,
					RoleID:         rid,
					OptionID:       oid,
					Active:         active.Valid && active.Bool,
					Type:           moduleType.String,
					TotalCO2Min:    co2Min.Float64,
					TotalCO2Max:    co2Max.Float64,
					TotalEnergyMin: energyMin.Float64,
					TotalEnergyMax: energyMax.Float64,
				}
			}
		}
	}

	return floors, modules, nil
}

func updateFloorMetricsById(tx *sql.Tx, floorIDs []uuid.UUID) error {
	floors, modules, err := loadFloorsAndModules(tx, floorIDs)
	if err != nil {
		return err
	}

	// Calculate average floor area
	moduleFloors := make(map[uuid.UUID][]float64) // map[moduleID][]floorArea
	for _, floor := range floors {
		for _, moduleID := range floor.ModuleIDs {
			moduleFloors[moduleID] = append(moduleFloors[moduleID], floor.Area)
		}
	}

	// Update relative metrics for each module
	for moduleID, floorAreas := range moduleFloors {
		var avgArea float64
		for _, area := range floorAreas {
			avgArea += area
		}
		avgArea /= float64(len(floorAreas))

		m := modules[moduleID]
		_, err = tx.Exec(`
			UPDATE module SET
				relative_co2_min = $1,
				relative_co2_max = $2,
				relative_energy_min = $3,
				relative_energy_max = $4
			WHERE id = $5`,
			m.TotalCO2Min/avgArea,
			m.TotalCO2Max/avgArea,
			m.TotalEnergyMin/avgArea,
			m.TotalEnergyMax/avgArea,
			moduleID,
		)
		if err != nil {
			return err
		}
	}

	type metricsKey struct {
		floorID  uuid.UUID
		roleID   uuid.UUID
		optionID uuid.UUID
		tech     string
	}
	groupedMetrics := make(map[metricsKey]*Consumption)

	for _, floor := range floors {
		if floor.Area == 0 {
			continue
		}

		for _, moduleID := range floor.ModuleIDs {
			m := modules[moduleID]
			key := metricsKey{
				floorID:  floor.FloorID,
				roleID:   m.RoleID,
				optionID: m.OptionID,
				tech:     m.Type,
			}

			if _, ok := groupedMetrics[key]; !ok {
				groupedMetrics[key] = &Consumption{
					CO2Min:    new(float64),
					CO2Max:    new(float64),
					EnergyMin: new(float64),
					EnergyMax: new(float64),
				}
			}

			*groupedMetrics[key].CO2Min += m.TotalCO2Min
			*groupedMetrics[key].CO2Max += m.TotalCO2Max
			*groupedMetrics[key].EnergyMin += m.TotalEnergyMin
			*groupedMetrics[key].EnergyMax += m.TotalEnergyMax
		}
	}

	for key, metrics := range groupedMetrics {
		floor := floors[key.floorID]
		floorCO2Min := *metrics.CO2Min / floor.Area
		floorCO2Max := *metrics.CO2Max / floor.Area
		floorEnergyMin := *metrics.EnergyMin / floor.Area
		floorEnergyMax := *metrics.EnergyMax / floor.Area

		_, err := tx.Exec(`
			INSERT INTO floors_consumption (floor_id, role_id, option_id, technology, co2_min, co2_max, energy_min, energy_max)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (floor_id, role_id, option_id, technology) 
			DO UPDATE SET 
				co2_min = EXCLUDED.co2_min,
				co2_max = EXCLUDED.co2_max,
				energy_min = EXCLUDED.energy_min,
				energy_max = EXCLUDED.energy_max`,
			key.floorID, key.roleID, key.optionID, key.tech, floorCO2Min, floorCO2Max, floorEnergyMin, floorEnergyMax,
		)
		if err != nil {
			return err
		}
	}

	return nil
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
