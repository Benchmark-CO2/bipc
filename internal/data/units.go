package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/utils"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
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
	ID          uuid.UUID    `json:"id"`
	GroupID     uuid.UUID    `json:"group_id"`
	GroupName   string       `json:"group_name"`
	Area        float64      `json:"area"`
	Height      float64      `json:"height"`
	Index       int          `json:"index"`
	Consumption *Consumption `json:"consumption,omitempty"`
}

type FloorGroupCreate struct {
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Area       float64 `json:"area"`
	Height     float64 `json:"height"`
	Repetition int     `json:"repetition"`
}

func ValidateUnit(v *validator.Validator, unit *Unit) {
	v.Check(!unit.ProjectID.IsNil(), "project_id", "must be provided")
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
}

func (m UnitModel) InsertWithExistingFloors(unit *Unit) error {
	tx, err := m.DB.Begin()
	if err != nil {
		return err
	}

	if unit.ID.IsNil() {
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
				_, err = tx.Exec(queryFloorGroup, floor.GroupID, unit.ID, floor.GroupName, "default_category")
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

	unit.ID, err = utils.NewUUIDv7()
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
			floorGroupID, err := utils.NewUUIDv7()
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
				floorID, err := utils.NewUUIDv7()
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
	if id.IsNil() {
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
		SELECT f.id, f.group_id, fg.name, f.area, f.height, f.index,
		       f.co2_min, f.co2_max, f.energy_min, f.energy_max
		FROM floor f
		INNER JOIN floor_group fg ON f.group_id = fg.id
		WHERE fg.tower_id = $1
		ORDER BY f.index`

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, towerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var floors []Floor
	for rows.Next() {
		var floor Floor
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64
		err := rows.Scan(
			&floor.ID,
			&floor.GroupID,
			&floor.GroupName,
			&floor.Area,
			&floor.Height,
			&floor.Index,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
		)
		if err != nil {
			return nil, err
		}

		if co2Min.Valid {
			floor.Consumption = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}

		floors = append(floors, floor)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return floors, nil
}

// TODO: Update this function to work with the new structure
func (m UnitModel) Update(unit *Unit) error {
	return errors.New("Update not implemented yet")
}

func (m UnitModel) Delete(id uuid.UUID) error {
	if id.IsNil() {
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
	Active         bool
	TotalCO2Min    float64
	TotalCO2Max    float64
	TotalEnergyMin float64
	TotalEnergyMax float64
}

func loadFloorsAndModules(tx *sql.Tx, floorIDs []uuid.UUID) (map[uuid.UUID]*FloorMetrics, map[uuid.UUID]*ModuleMetrics, error) {
	rows, err := tx.Query(`
		SELECT 
			f.id, f.area,
			m.id, topt.active,
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
			moduleID                             sql.NullString
			active                               sql.NullBool
			co2Min, co2Max, energyMin, energyMax sql.NullFloat64
		)

		if err := rows.Scan(&floorID, &area, &moduleID, &active, &co2Min, &co2Max, &energyMin, &energyMax); err != nil {
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
			mid, err := uuid.FromString(moduleID.String)
			if err != nil {
				return nil, nil, err
			}

			floors[floorID].ModuleIDs = append(floors[floorID].ModuleIDs, mid)

			if _, ok := modules[mid]; !ok {
				modules[mid] = &ModuleMetrics{
					ModuleID:       mid,
					Active:         true,
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

	for _, floor := range floors {
		var totalCO2Min, totalCO2Max, totalEnergyMin, totalEnergyMax float64

		for _, moduleID := range floor.ModuleIDs {
			m := modules[moduleID]
			totalCO2Min += m.TotalCO2Min
			totalCO2Max += m.TotalCO2Max
			totalEnergyMin += m.TotalEnergyMin
			totalEnergyMax += m.TotalEnergyMax
		}

		if floor.Area == 0 {
			continue
		}

		floorCO2Min := totalCO2Min / floor.Area
		floorCO2Max := totalCO2Max / floor.Area
		floorEnergyMin := totalEnergyMin / floor.Area
		floorEnergyMax := totalEnergyMax / floor.Area

		_, err := tx.Exec(`
			UPDATE floor
			SET co2_min=$1, co2_max=$2, energy_min=$3, energy_max=$4
			WHERE id=$5`,
			floorCO2Min, floorCO2Max, floorEnergyMin, floorEnergyMax, floor.FloorID,
		)
		if err != nil {
			return err
		}
	}

	return nil
}
