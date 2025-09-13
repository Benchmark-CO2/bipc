package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/gofrs/uuid"
)

type BenchmarkModel struct {
	DB *sql.DB
}

type BenchmarkData struct {
	ID          uuid.UUID    `json:"id"`
	Consumption *Consumption `json:"consumption,omitempty"`
}

func (m BenchmarkModel) GetFloorsBenchmark() ([]*BenchmarkData, error) {
	query := `
		SELECT
			f.id,
			f.co2_min,
			f.co2_max,
			f.energy_min,
			f.energy_max
		FROM floor f
		GROUP BY f.id`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var floors []*BenchmarkData

	for rows.Next() {
		var floor BenchmarkData
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&floor.ID,
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

		floors = append(floors, &floor)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return floors, nil
}

func (m BenchmarkModel) GetUnitsBenchmark() ([]*BenchmarkData, error) {
	query := `
		WITH tower_consumption AS (
			SELECT
				fg.tower_id,
				SUM(f.co2_min * f.area) / SUM(f.area) as co2_min,
				SUM(f.co2_max * f.area) / SUM(f.area) as co2_max,
				SUM(f.energy_min * f.area) / SUM(f.area) as energy_min,
				SUM(f.energy_max * f.area) / SUM(f.area) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			GROUP BY fg.tower_id
		)
		SELECT
			u.id,
			tc.co2_min,
			tc.co2_max,
			tc.energy_min,
			tc.energy_max
		FROM units u
		LEFT JOIN tower_consumption tc ON u.id = tc.tower_id
		GROUP BY u.id, tc.co2_min, tc.co2_max, tc.energy_min, tc.energy_max`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []*BenchmarkData

	for rows.Next() {
		var unit BenchmarkData
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&unit.ID,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
		)
		if err != nil {
			return nil, err
		}

		if co2Min.Valid {
			unit.Consumption = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}

		units = append(units, &unit)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return units, nil

}

func (m BenchmarkModel) GetProjectsBenchmark() ([]*BenchmarkData, error) {
	query := `
		WITH project_consumption AS (
			SELECT
				u.project_id,
				SUM(f.co2_min * f.area) / SUM(f.area) as co2_min,
				SUM(f.co2_max * f.area) / SUM(f.area) as co2_max,
				SUM(f.energy_min * f.area) / SUM(f.area) as energy_min,
				SUM(f.energy_max * f.area) / SUM(f.area) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN units u ON fg.tower_id = u.id
			GROUP BY u.project_id
		)
		SELECT
			p.id,
			pc.co2_min,
			pc.co2_max,
			pc.energy_min,
			pc.energy_max
		FROM projects p
		LEFT JOIN project_consumption pc ON p.id = pc.project_id
		GROUP BY p.id, pc.co2_min, pc.co2_max, pc.energy_min, pc.energy_max`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*BenchmarkData

	for rows.Next() {
		var project BenchmarkData
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&project.ID,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
		)
		if err != nil {
			return nil, err
		}

		if co2Min.Valid {
			project.Consumption = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}

		projects = append(projects, &project)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return projects, nil
}
