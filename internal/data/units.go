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

type Unit struct {
	ID        uuid.UUID `json:"id"`
	ProjectID uuid.UUID `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Tower     *Tower    `json:"tower,omitempty"`
}

type Tower struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Version   int32     `json:"version"`
	Floors    []Floor   `json:"floors"`
}

type FloorGroup struct {
	ID       uuid.UUID `json:"id"`
	TowerID  uuid.UUID `json:"tower_id"`
	Name     string    `json:"name"`
	Category string    `json:"category"`
}

type Consumption struct {
	CO2Min    *float64 `json:"co2_min,omitempty"`
	CO2Max    *float64 `json:"co2_max,omitempty"`
	EnergyMin *float64 `json:"energy_min,omitempty"`
	EnergyMax *float64 `json:"energy_max,omitempty"`
}

type Floor struct {
	ID           uuid.UUID              `json:"id"`
	GroupID      uuid.UUID              `json:"group_id"`
	GroupName    string                 `json:"group_name"`
	Category     string                 `json:"category"`
	Area         float64                `json:"area"`
	Height       float64                `json:"height"`
	Index        int                    `json:"index"`
	Consumptions map[string]*Consumption `json:"consumptions,omitempty"`
}

type FloorGroupCreate struct {
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Area       float64 `json:"area"`
	Height     float64 `json:"height"`
	Repetition int     `json:"repetition"`
}

func ValidateUnit(v *validator.Validator, unit *Unit) {
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
}

func (m UnitModel) InsertWithExistingFloors(unit *Unit) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}

	if unit.ID == uuid.Nil {
		tx.Rollback()
		return errors.New("unit.ID must be provided")
	}

	queryUnit := `
		INSERT INTO units (id, project_id, name, type)
		VALUES ($1, $2, $3, $4)`
	_, err = tx.Exec(queryUnit, unit.ID, unit.ProjectID, unit.Name, unit.Type)
	if err != nil {
		tx.Rollback()
		return err
	}

	if unit.Type == "tower" {
		queryTower := `INSERT INTO tower (id) VALUES ($1)`
		_, err = tx.Exec(queryTower, unit.ID)
		if err != nil {
			tx.Rollback()
			return err
		}

		insertedGroups := make(map[uuid.UUID]bool)

		for _, floor := range unit.Tower.Floors {
			if !insertedGroups[floor.GroupID] {
				queryFloorGroup := `
					INSERT INTO floor_group (id, tower_id, name, category)
					VALUES ($1, $2, $3, $4)
					ON CONFLICT (id) DO NOTHING`
				_, err = tx.Exec(queryFloorGroup, floor.GroupID, unit.ID, floor.GroupName, "standard_floor")
				if err != nil {
					tx.Rollback()
					return err
				}
				insertedGroups[floor.GroupID] = true
			}

			queryFloor := `
				INSERT INTO floor (id, group_id, area, height, "index")
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (id) DO NOTHING`
			_, err = tx.Exec(queryFloor, floor.ID, floor.GroupID, floor.Area, floor.Height, floor.Index)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit()
}

func (m UnitModel) Insert(unit *Unit, floorGroups []FloorGroupCreate) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}

	unit.ID, err = uuid.NewV7()
	if err != nil {
		tx.Rollback()
		return err
	}

	queryUnit := `
		INSERT INTO units (id, project_id, name, type)
		VALUES ($1, $2, $3, $4)`
	_, err = tx.Exec(queryUnit, unit.ID, unit.ProjectID, unit.Name, unit.Type)
	if err != nil {
		tx.Rollback()
		return err
	}

	if unit.Type == "tower" {
		queryTower := `INSERT INTO tower (id) VALUES ($1)`
		_, err = tx.Exec(queryTower, unit.ID)
		if err != nil {
			tx.Rollback()
			return err
		}

		basementCount := 0
		for _, fg := range floorGroups {
			if fg.Category == "basement_floor" {
				basementCount += fg.Repetition
			}
		}

		currentBasementIndex := -basementCount
		currentAboveGroundIndex := 0

		for _, fg := range floorGroups {
			floorGroupID, err := uuid.NewV7()
			if err != nil {
				tx.Rollback()
				return err
			}

			queryFloorGroup := `INSERT INTO floor_group (id, tower_id, name, category) VALUES ($1, $2, $3, $4)`
			_, err = tx.Exec(queryFloorGroup, floorGroupID, unit.ID, fg.Name, fg.Category)
			if err != nil {
				tx.Rollback()
				return err
			}

			for i := 0; i < fg.Repetition; i++ {
				floorID, err := uuid.NewV7()
				if err != nil {
					tx.Rollback()
					return err
				}

				var floorIndex int
				if fg.Category == "basement_floor" {
					floorIndex = currentBasementIndex
					currentBasementIndex++
				} else {
					floorIndex = currentAboveGroundIndex
					currentAboveGroundIndex++
				}

				queryFloor := `INSERT INTO floor (id, group_id, area, height, "index") VALUES ($1, $2, $3, $4, $5)`
				_, err = tx.Exec(queryFloor, floorID, floorGroupID, fg.Area, fg.Height, floorIndex)
				if err != nil {
					tx.Rollback()
					return err
				}
			}
		}
	}

	return tx.Commit()
}

func (m UnitModel) GetByID(id uuid.UUID) (*Unit, error) {
	if id == uuid.Nil {
		return nil, ErrRecordNotFound
	}

	query := `
		SELECT id, project_id, name, type
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
		tower, err := m.getTowerByUnitID(id)
		if err != nil {
			return nil, err
		}
		unit.Tower = tower
	}

	return &unit, nil
}

func (m UnitModel) getTowerByUnitID(unitID uuid.UUID) (*Tower, error) {
	query := `
		SELECT id, created_at, updated_at, version
		FROM tower
		WHERE id = $1`

	var tower Tower

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, unitID).Scan(
		&tower.ID,
		&tower.CreatedAt,
		&tower.UpdatedAt,
		&tower.Version,
	)

	if err != nil {
		return nil, err
	}

	floors, err := m.getFloorsByTowerID(tower.ID)
	if err != nil {
		return nil, err
	}
	tower.Floors = floors

	return &tower, nil
}

func (m UnitModel) getFloorsByTowerID(towerID uuid.UUID) ([]Floor, error) {
	query := `
		SELECT f.id, f.group_id, fg.name, fg.category, f.area, f.height, f.index,
		       ftm.role_id, ftm.option_id, ftm.technology, ftm.co2_min, ftm.co2_max, ftm.energy_min, ftm.energy_max
		FROM floor f
		INNER JOIN floor_group fg ON f.group_id = fg.id
		LEFT JOIN floors_consumption ftm ON f.id = ftm.floor_id
		WHERE fg.tower_id = $1
		ORDER BY f.index`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, towerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	floorsMap := make(map[uuid.UUID]*Floor)
	var orderedFloorIDs []uuid.UUID

	for rows.Next() {
		var floorID, groupID uuid.UUID
		var groupName, category string
		var area, height float64
		var index int
		var roleID, optionID, tech sql.NullString
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&floorID, &groupID, &groupName, &category, &area, &height, &index,
			&roleID, &optionID, &tech, &co2Min, &co2Max, &energyMin, &energyMax,
		)
		if err != nil {
			return nil, err
		}

		if _, ok := floorsMap[floorID]; !ok {
			floorsMap[floorID] = &Floor{
				ID:           floorID,
				GroupID:      groupID,
				GroupName:    groupName,
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

// TODO: Update this function to work with the new structure
func (m UnitModel) Update(unit *Unit) error {
	return errors.New("Update not implemented yet")
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

func (m UnitModel) UpdateTowerFloorsMetrics(towerID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		SELECT f.id
		FROM floor f
		INNER JOIN floor_group fg ON f.group_id = fg.id
		WHERE fg.tower_id = $1`

	rows, err := tx.QueryContext(ctx, query, towerID)
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
			m.id, m.type, topt.active, topt.role_id, topt.id,
			m.total_co2_min, m.total_co2_max,
			m.total_energy_min, m.total_energy_max
		FROM floor f
		LEFT JOIN module_floor mf ON f.id = mf.floor_id
		LEFT JOIN module m ON mf.module_id = m.id
		LEFT JOIN tower_option topt ON m.tower_option_id = topt.id
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

		if moduleID.Valid && active.Valid && active.Bool {
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
					Active:         true,
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

	// Clear old metrics
	_, err = tx.Exec(`DELETE FROM floors_consumption WHERE floor_id = ANY($1)`, pq.Array(floorIDs))
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

	// Insert metrics into floors_consumption
	for key, metrics := range groupedMetrics {
		floor := floors[key.floorID]
		floorCO2Min := *metrics.CO2Min / floor.Area
		floorCO2Max := *metrics.CO2Max / floor.Area
		floorEnergyMin := *metrics.EnergyMin / floor.Area
		floorEnergyMax := *metrics.EnergyMax / floor.Area

		_, err := tx.Exec(`
			INSERT INTO floors_consumption (floor_id, role_id, option_id, technology, co2_min, co2_max, energy_min, energy_max)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			key.floorID, key.roleID, key.optionID, key.tech, floorCO2Min, floorCO2Max, floorEnergyMin, floorEnergyMax,
		)
		if err != nil {
			return err
		}
	}

	return nil
}
