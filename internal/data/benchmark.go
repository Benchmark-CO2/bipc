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
			COALESCE(SUM(mtc.co2_min), 0) as co2_min,
			COALESCE(SUM(mtc.co2_max), 0) as co2_max,
			COALESCE(SUM(mtc.energy_min), 0) as energy_min,
			COALESCE(SUM(mtc.energy_max), 0) as energy_max
		FROM floor f
		INNER JOIN units u ON f.unit_id = u.id
		INNER JOIN projects p ON u.project_id = p.id
		LEFT JOIN module_target_consumption mtc ON f.id = mtc.target_id AND mtc.target_type = 'floor'
		WHERE p.benchmark = true
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
		WITH floor_consumption AS (
			SELECT
				f.id as floor_id,
				f.unit_id,
				f.area,
				m.type as technology,
				SUM(mtc.co2_min) as floor_co2_min,
				SUM(mtc.co2_max) as floor_co2_max,
				SUM(mtc.energy_min) as floor_energy_min,
				SUM(mtc.energy_max) as floor_energy_max
			FROM floor f
			INNER JOIN units u ON f.unit_id = u.id
			INNER JOIN projects p ON u.project_id = p.id
			INNER JOIN module_target_consumption mtc ON f.id = mtc.target_id
			INNER JOIN module m ON mtc.module_id = m.id
			WHERE mtc.target_type = 'floor' AND p.benchmark = true
			GROUP BY f.id, f.unit_id, f.area, m.type
		),
		unit_consumption_by_tech AS (
			SELECT
				unit_id,
				SUM(floor_co2_min * area) / NULLIF(SUM(area), 0) as co2_min,
				SUM(floor_co2_max * area) / NULLIF(SUM(area), 0) as co2_max,
				SUM(floor_energy_min * area) / NULLIF(SUM(area), 0) as energy_min,
				SUM(floor_energy_max * area) / NULLIF(SUM(area), 0) as energy_max
			FROM floor_consumption
			GROUP BY unit_id, technology
		),
		tower_total_consumption AS (
			SELECT
				unit_id,
				SUM(co2_min) as co2_min,
				SUM(co2_max) as co2_max,
				SUM(energy_min) as energy_min,
				SUM(energy_max) as energy_max
			FROM unit_consumption_by_tech
			GROUP BY unit_id
		)
		SELECT
			u.id,
			ttc.co2_min,
			ttc.co2_max,
			ttc.energy_min,
			ttc.energy_max
		FROM units u
		INNER JOIN projects p ON u.project_id = p.id
		LEFT JOIN tower_total_consumption ttc ON u.id = ttc.unit_id
		WHERE p.benchmark = true`

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
	Floors     *string `json:"floors,omitempty"`
	Technology *string `json:"technology,omitempty"`
}

type FloorRange struct {
	Min           int
	Max           int
	IsGreaterThan bool
}

var validFloorFilters = map[string]FloorRange{
	"1":    {Min: 1, Max: 1, IsGreaterThan: false},
	"2":    {Min: 2, Max: 2, IsGreaterThan: false},
	"3-4":  {Min: 3, Max: 4, IsGreaterThan: false},
	"5-10": {Min: 5, Max: 10, IsGreaterThan: false},
	"11+":  {Min: 11, Max: 0, IsGreaterThan: true},
}

func getValidFloorFilterValues() string {
	values := make([]string, 0, len(validFloorFilters))
	for key := range validFloorFilters {
		values = append(values, key)
	}
	return strings.Join(values, ", ")
}

func parseFloorFilter(value string) (*FloorRange, error) {
	value = strings.TrimSpace(value)

	floorRange, ok := validFloorFilters[value]
	if !ok {
		return nil, fmt.Errorf("%w: '%s' - allowed values are: %s", ErrInvalidFloorFilter, value, getValidFloorFilterValues())
	}

	return &floorRange, nil
}

func (m BenchmarkModel) GetProjectsBenchmark(filters GetProjectsBenchmarkFilters) ([]*BenchmarkData, error) {
	var args []any
	argPosition := 1

	query := `
		WITH floors_per_tower AS (
			SELECT 
				f.unit_id,
				COUNT(DISTINCT f.id) as floor_count
			FROM floor f
			GROUP BY f.unit_id
		),
		filtered_towers AS (
			SELECT DISTINCT unit_id
			FROM floors_per_tower fpt
			WHERE 1=1`

	if filters.Floors != nil {
		floorValues := strings.Split(*filters.Floors, ",")
		var floorConditions []string

		for _, value := range floorValues {
			value = strings.TrimSpace(value)
			if !strings.HasSuffix(value, "+") && len(value) > 0 {
				if num := strings.TrimSpace(value); num != "" {
					if _, exists := validFloorFilters[num+"+"]; exists {
						value = num + "+"
					}
				}
			}

			floorRange, err := parseFloorFilter(value)
			if err != nil {
				return nil, err
			}

			if floorRange.IsGreaterThan {
				floorConditions = append(floorConditions, fmt.Sprintf("floor_count >= $%d", argPosition))
				args = append(args, floorRange.Min)
				argPosition++
			} else if floorRange.Min == floorRange.Max {
				floorConditions = append(floorConditions, fmt.Sprintf("floor_count = $%d", argPosition))
				args = append(args, floorRange.Min)
				argPosition++
			} else {
				floorConditions = append(floorConditions, fmt.Sprintf("(floor_count >= $%d AND floor_count <= $%d)", argPosition, argPosition+1))
				args = append(args, floorRange.Min, floorRange.Max)
				argPosition += 2
			}
		}

		if len(floorConditions) > 0 {
			query += " AND (" + strings.Join(floorConditions, " OR ") + ")"
		}
	} else {
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
	}

	query += `),
		floor_consumption AS (
			SELECT
				f.id as floor_id,
				f.unit_id,
				f.area,
				m.type as technology,
				SUM(mtc.co2_min) as floor_co2_min,
				SUM(mtc.co2_max) as floor_co2_max,
				SUM(mtc.energy_min) as floor_energy_min,
				SUM(mtc.energy_max) as floor_energy_max
			FROM floor f
			INNER JOIN units u ON f.unit_id = u.id
			INNER JOIN projects p ON u.project_id = p.id
			INNER JOIN module_target_consumption mtc ON f.id = mtc.target_id
			INNER JOIN module m ON mtc.module_id = m.id
			WHERE mtc.target_type = 'floor' AND p.benchmark = true`

	if filters.Technology != nil {
		technologies := strings.Split(*filters.Technology, ",")
		techPlaceholders := make([]string, len(technologies))

		for i, _ := range technologies {
			techPlaceholders[i] = fmt.Sprintf("$%d", argPosition)
			args = append(args, strings.TrimSpace(technologies[i]))
			argPosition++
		}

		query += fmt.Sprintf(`
			AND m.type = ANY(ARRAY[%s])`, strings.Join(techPlaceholders, ","))
	}

	query += `
			GROUP BY f.id, f.unit_id, f.area, m.type
		),
		unit_consumption_by_tech AS (
			SELECT
				unit_id,
				SUM(floor_co2_min * area) / NULLIF(SUM(area), 0) as co2_min,
				SUM(floor_co2_max * area) / NULLIF(SUM(area), 0) as co2_max,
				SUM(floor_energy_min * area) / NULLIF(SUM(area), 0) as energy_min,
				SUM(floor_energy_max * area) / NULLIF(SUM(area), 0) as energy_max
			FROM floor_consumption
			GROUP BY unit_id, technology
		),
		filtered_consumption AS (
			SELECT
				unit_id,
				SUM(co2_min) as co2_min,
				SUM(co2_max) as co2_max,
				SUM(energy_min) as energy_min,
				SUM(energy_max) as energy_max
			FROM unit_consumption_by_tech tct
			WHERE EXISTS (
				SELECT 1 FROM filtered_towers ft
				WHERE ft.unit_id = tct.unit_id
			)
			GROUP BY unit_id
		),
		project_consumption AS (
			SELECT
				u.project_id,
				SUM(fc.co2_min * u.repetition_count) / NULLIF(SUM(u.repetition_count), 0) as co2_min,
				SUM(fc.co2_max * u.repetition_count) / NULLIF(SUM(u.repetition_count), 0) as co2_max,
				SUM(fc.energy_min * u.repetition_count) / NULLIF(SUM(u.repetition_count), 0) as energy_min,
				SUM(fc.energy_max * u.repetition_count) / NULLIF(SUM(u.repetition_count), 0) as energy_max
			FROM units u
			INNER JOIN filtered_consumption fc ON u.id = fc.unit_id
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
		WHERE p.benchmark = true`

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
