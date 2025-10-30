package data

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
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
			SUM(fc.co2_min) as co2_min,
			SUM(fc.co2_max) as co2_max,
			SUM(fc.energy_min) as energy_min,
			SUM(fc.energy_max) as energy_max
		FROM floor f
		LEFT JOIN floors_consumption fc ON f.id = fc.floor_id
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
		WITH tower_consumption_by_tech AS (
			SELECT
				fg.tower_id,
				SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
				SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
				SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
				SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN floors_consumption fc ON f.id = fc.floor_id
			GROUP BY fg.tower_id, fc.technology
		),
		tower_total_consumption AS (
			SELECT
				tower_id,
				SUM(co2_min) as co2_min,
				SUM(co2_max) as co2_max,
				SUM(energy_min) as energy_min,
				SUM(energy_max) as energy_max
			FROM tower_consumption_by_tech
			GROUP BY tower_id
		)
		SELECT
			u.id,
			ttc.co2_min,
			ttc.co2_max,
			ttc.energy_min,
			ttc.energy_max
		FROM units u
		LEFT JOIN tower_total_consumption ttc ON u.id = ttc.tower_id`

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

type GetProjectsBenchmarkFilters struct {
	FloorsFrom *int    `json:"floors_from,omitempty"`
	FloorsTo   *int    `json:"floors_to,omitempty"`
	Technology *string `json:"technology,omitempty"`
}

func (m BenchmarkModel) GetProjectsBenchmark(filters GetProjectsBenchmarkFilters) ([]*BenchmarkData, error) {
	var args []any
	argPosition := 1

	query := `
		WITH floors_per_tower AS (
			SELECT 
				fg.tower_id,
				COUNT(DISTINCT f.id) as floor_count
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			GROUP BY fg.tower_id
		),
		filtered_towers AS (
			SELECT DISTINCT tower_id
			FROM floors_per_tower fpt
			WHERE 1=1`

	if filters.FloorsFrom != nil {
		query += fmt.Sprintf(` AND floor_count >= $%d`, argPosition)
		args = append(args, *filters.FloorsFrom)
		argPosition++
	}

	if filters.FloorsTo != nil {
		query += fmt.Sprintf(` AND floor_count <= $%d`, argPosition)
		args = append(args, *filters.FloorsTo)
		argPosition++
	}

	query += `),
		tower_consumption_by_tech AS (
			SELECT
				fg.tower_id,
				fc.technology,
				SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
				SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
				SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
				SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN floors_consumption fc ON f.id = fc.floor_id`

	if filters.Technology != nil {
		technologies := strings.Split(*filters.Technology, ",")
		techPlaceholders := make([]string, len(technologies))
		
		for i, _ := range technologies {
			techPlaceholders[i] = fmt.Sprintf("$%d", argPosition)
			args = append(args, strings.TrimSpace(technologies[i]))
			argPosition++
		}
		
		query += fmt.Sprintf(`
			WHERE fc.technology = ANY(ARRAY[%s])`, strings.Join(techPlaceholders, ","))
	}

	query += `
			GROUP BY fg.tower_id, fc.technology
		),
		filtered_consumption AS (
			SELECT
				tower_id,
				SUM(co2_min) as co2_min,
				SUM(co2_max) as co2_max,
				SUM(energy_min) as energy_min,
				SUM(energy_max) as energy_max
			FROM tower_consumption_by_tech tct
			WHERE EXISTS (
				SELECT 1 FROM filtered_towers ft
				WHERE ft.tower_id = tct.tower_id
			)
			GROUP BY tower_id
		),
		project_consumption AS (
			SELECT
				u.project_id,
				SUM(fc.co2_min) as co2_min,
				SUM(fc.co2_max) as co2_max,
				SUM(fc.energy_min) as energy_min,
				SUM(fc.energy_max) as energy_max
			FROM units u
			INNER JOIN filtered_consumption fc ON u.id = fc.tower_id
			GROUP BY u.project_id
		)
		SELECT
			p.id,
			pc.co2_min,
			pc.co2_max,
			pc.energy_min,
			pc.energy_max
		FROM projects p
		LEFT JOIN project_consumption pc ON p.id = pc.project_id`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, args...)
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
