package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/utils"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
)

type Unit struct {
	ID        uuid.UUID `json:"id"`
	ProjectID int64     `json:"project_id"`
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

type Floor struct {
	ID        uuid.UUID `json:"id"`
	GroupID   uuid.UUID `json:"group_id"`
	GroupName string    `json:"group_name"`
	Area      float64   `json:"area"`
	Height    float64   `json:"height"`
	Index     int       `json:"index"`
}

type FloorGroupCreate struct {
	Name       string  `json:"name"`
	Category   string  `json:"category"`
	Area       float64 `json:"area"`
	Height     float64 `json:"height"`
	Repetition int     `json:"repetition"`
}

func ValidateUnit(v *validator.Validator, unit *Unit) {
	v.Check(unit.ProjectID > 0, "project_id", "must be provided and greater than zero")
	v.Check(unit.Name != "", "name", "must be provided")
	v.Check(unit.Type != "", "type", "must be provided")
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
		SELECT f.id, f.group_id, fg.name, f.area, f.height, f.index
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
		err := rows.Scan(
			&floor.ID,
			&floor.GroupID,
			&floor.GroupName,
			&floor.Area,
			&floor.Height,
			&floor.Index,
		)
		if err != nil {
			return nil, err
		}
		floors = append(floors, floor)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return floors, nil
}

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

type UnitModel struct {
	DB *sql.DB
}
