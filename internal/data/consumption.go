package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// scanConsumptionRows extracts consumptions by technology from a ResultSet.
// Returns map[technology]Consumption for easy access by type.
func scanConsumptionRows(rows *sql.Rows) (map[string]*Consumption, error) {
	consumptions := make(map[string]*Consumption)

	for rows.Next() {
		var tech string
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		if err := rows.Scan(&tech, &co2Min, &co2Max, &energyMin, &energyMax); err != nil {
			return nil, err
		}

		if co2Min.Valid {
			consumptions[tech] = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}
	}
	return consumptions, rows.Err()
}

// getModuleConsumptionByOption calculates the area-weighted average consumption of modules for an option.
// Uses each target's area (floor or unit) as weight in the average calculation.
// Example: module in 100m² floor has 2x more weight than in 50m² floor.
func getModuleConsumptionByOption(ctx context.Context, db *sql.DB, optionID uuid.UUID) ([]ModuleInfo, error) {
	query := `
		WITH unit_areas AS (
			SELECT unit_id, SUM(area) AS total_area
			FROM floor
			GROUP BY unit_id
		),
		module_consumption AS (
			SELECT 
				m.id,
				m.type,
				m.outdated,
				mtc.target_id,
				mtc.target_type,
				mtc.co2_min,
				mtc.co2_max,
				mtc.energy_min,
				mtc.energy_max,
				CASE 
					WHEN mtc.target_type = 'floor' THEN f.area
					WHEN mtc.target_type = 'unit'  THEN COALESCE(ua.total_area, 0)
				END AS target_area
			FROM module m
			LEFT JOIN module_target_consumption mtc ON m.id = mtc.module_id
			LEFT JOIN floor f  ON mtc.target_type = 'floor' AND mtc.target_id = f.id
			LEFT JOIN units u  ON mtc.target_type = 'unit'  AND mtc.target_id = u.id
			LEFT JOIN unit_areas ua ON u.id = ua.unit_id
			WHERE m.option_id = $1
		)
		SELECT 
			id,
			type,
			outdated,
			SUM(co2_min * target_area)    / NULLIF(SUM(target_area), 0) AS co2_min,
			SUM(co2_max * target_area)    / NULLIF(SUM(target_area), 0) AS co2_max,
			SUM(energy_min * target_area) / NULLIF(SUM(target_area), 0) AS energy_min,
			SUM(energy_max * target_area) / NULLIF(SUM(target_area), 0) AS energy_max
		FROM module_consumption
		GROUP BY id, type, outdated`

	rows, err := db.QueryContext(ctx, query, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	modules := []ModuleInfo{}
	for rows.Next() {
		var module ModuleInfo
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&module.ID,
			&module.Type,
			&module.Outdated,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
		)
		if err != nil {
			return nil, err
		}

		if !co2Min.Valid {
			continue
		}

		module.Consumption = &Consumption{
			CO2Min:    &co2Min.Float64,
			CO2Max:    &co2Max.Float64,
			EnergyMin: &energyMin.Float64,
			EnergyMax: &energyMax.Float64,
		}

		modules = append(modules, module)
	}

	return modules, rows.Err()
}

// addTotalToConsumptions calculates and adds a "total" entry with the sum of all technologies.
// Useful for displaying aggregated consumption in the API.
func addTotalToConsumptions(consumptions map[string]*Consumption) {
	if len(consumptions) == 0 {
		return
	}

	total := &Consumption{
		CO2Min:    new(float64),
		CO2Max:    new(float64),
		EnergyMin: new(float64),
		EnergyMax: new(float64),
	}

	for tech, cons := range consumptions {
		if tech == "total" {
			continue
		}
		*total.CO2Min += *cons.CO2Min
		*total.CO2Max += *cons.CO2Max
		*total.EnergyMin += *cons.EnergyMin
		*total.EnergyMax += *cons.EnergyMax
	}

	consumptions["total"] = total
}

// GetFullConsumption returns complete consumption by technology + total.
// Calculates area-weighted average of floor consumption and adds direct unit consumption.
func GetFullConsumption(db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	consumptions := make(map[string]*Consumption)

	// 1. Fetch area-weighted floor consumption by technology
	floorQuery := `
		WITH floor_consumption AS (
			SELECT 
				f.id   AS floor_id,
				f.area,
				m.type AS technology,
				SUM(mtc.co2_min)    AS floor_co2_min,
				SUM(mtc.co2_max)    AS floor_co2_max,
				SUM(mtc.energy_min) AS floor_energy_min,
				SUM(mtc.energy_max) AS floor_energy_max
			FROM module_target_consumption mtc
			INNER JOIN floor f ON mtc.target_id = f.id
			INNER JOIN module m ON mtc.module_id = m.id
			WHERE mtc.target_type = 'floor'
			  AND f.unit_id       = $1
			  AND mtc.role_id     = $2
			  AND mtc.option_id   = $3
			GROUP BY f.id, f.area, m.type
		)
		SELECT 
			technology,
			SUM(floor_co2_min * area)    / NULLIF(SUM(area), 0) AS co2_min,
			SUM(floor_co2_max * area)    / NULLIF(SUM(area), 0) AS co2_max,
			SUM(floor_energy_min * area) / NULLIF(SUM(area), 0) AS energy_min,
			SUM(floor_energy_max * area) / NULLIF(SUM(area), 0) AS energy_max
		FROM floor_consumption
		GROUP BY technology`

	rows, err := db.QueryContext(ctx, floorQuery, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	consumptions, err = scanConsumptionRows(rows)
	if err != nil {
		return nil, err
	}

	// 2. Fetch direct unit consumption by technology
	unitQuery := `
		SELECT 
			m.type AS technology,
			mtc.co2_min,
			mtc.co2_max,
			mtc.energy_min,
			mtc.energy_max
		FROM module_target_consumption mtc
		INNER JOIN module m ON mtc.module_id = m.id
		WHERE mtc.target_type = 'unit'
		  AND mtc.target_id   = $1
		  AND mtc.role_id     = $2
		  AND mtc.option_id   = $3`

	unitRows, err := db.QueryContext(ctx, unitQuery, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	defer unitRows.Close()

	unitConsumptions, err := scanConsumptionRows(unitRows)
	if err != nil {
		return nil, err
	}

	// Merge: add unit consumptions to map
	for tech, cons := range unitConsumptions {
		consumptions[tech] = cons
	}

	// 3. Calculate and add total
	addTotalToConsumptions(consumptions)

	return consumptions, nil
}

// GetUnitConsumptionByTechnology returns total unit consumption by technology.
// Includes all modules from all active options (floor + unit).
// Also returns the unit's total area for per-m² consumption calculation.
func GetUnitConsumptionByTechnology(db *sql.DB, unitID uuid.UUID) (map[string]*Consumption, float64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	consumptions := make(map[string]*Consumption)

	// 1. Fetch unit's total area
	var totalArea float64
	areaQuery := `SELECT COALESCE(SUM(area), 0) FROM floor WHERE unit_id = $1`
	err := db.QueryRowContext(ctx, areaQuery, unitID).Scan(&totalArea)
	if err != nil {
		return nil, 0, err
	}

	// 2. Fetch area-weighted floor consumption (active options)
	floorQuery := `
		WITH floor_consumption AS (
			SELECT 
				f.id   AS floor_id,
				f.area,
				m.type AS technology,
				SUM(mtc.co2_min)    AS floor_co2_min,
				SUM(mtc.co2_max)    AS floor_co2_max,
				SUM(mtc.energy_min) AS floor_energy_min,
				SUM(mtc.energy_max) AS floor_energy_max
			FROM module_target_consumption mtc
			INNER JOIN floor f ON mtc.target_id = f.id
			INNER JOIN module m ON mtc.module_id = m.id
			INNER JOIN options opt ON mtc.option_id = opt.id AND mtc.role_id = opt.role_id
			WHERE mtc.target_type = 'floor'
			  AND f.unit_id       = $1
			  AND opt.active      = TRUE
			GROUP BY f.id, f.area, m.type
		)
		SELECT 
			technology,
			SUM(floor_co2_min * area)    / NULLIF(SUM(area), 0) AS co2_min,
			SUM(floor_co2_max * area)    / NULLIF(SUM(area), 0) AS co2_max,
			SUM(floor_energy_min * area) / NULLIF(SUM(area), 0) AS energy_min,
			SUM(floor_energy_max * area) / NULLIF(SUM(area), 0) AS energy_max
		FROM floor_consumption
		GROUP BY technology`

	rows, err := db.QueryContext(ctx, floorQuery, unitID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	consumptions, err = scanConsumptionRows(rows)
	if err != nil {
		return nil, 0, err
	}

	// 3. Fetch direct unit consumption (active options)
	unitQuery := `
		SELECT 
			m.type AS technology,
			SUM(mtc.co2_min)    AS co2_min,
			SUM(mtc.co2_max)    AS co2_max,
			SUM(mtc.energy_min) AS energy_min,
			SUM(mtc.energy_max) AS energy_max
		FROM module_target_consumption mtc
		INNER JOIN module m ON mtc.module_id = m.id
		INNER JOIN options opt ON mtc.option_id = opt.id AND mtc.role_id = opt.role_id
		WHERE mtc.target_type = 'unit'
		  AND mtc.target_id   = $1
		  AND opt.active      = TRUE
		GROUP BY m.type`

	unitRows, err := db.QueryContext(ctx, unitQuery, unitID)
	if err != nil {
		return nil, 0, err
	}
	defer unitRows.Close()

	unitConsumptions, err := scanConsumptionRows(unitRows)
	if err != nil {
		return nil, 0, err
	}

	// 4. Merge: add unit consumptions to floor consumptions
	for tech, unitCons := range unitConsumptions {
		if floorCons, exists := consumptions[tech]; exists {
			*floorCons.CO2Min += *unitCons.CO2Min
			*floorCons.CO2Max += *unitCons.CO2Max
			*floorCons.EnergyMin += *unitCons.EnergyMin
			*floorCons.EnergyMax += *unitCons.EnergyMax
		} else {
			consumptions[tech] = unitCons
		}
	}

	// 5. Add "total" entry
	addTotalToConsumptions(consumptions)

	return consumptions, totalArea, nil
}

// CalculateProjectConsumptions aggregates consumption from multiple units at project level.
// Calculates area-weighted average: sum(unit_consumption × unit_area) / total_area.
// Returns consumption per m² of the project + total project area.
func CalculateProjectConsumptions(units []ProjectUnit) (map[string]*Consumption, float64) {
	projectConsumptions := make(map[string]*Consumption)
	var projectArea float64

	// Accumulate area-weighted consumptions from each unit
	for _, unit := range units {
		projectArea += unit.Area

		for tech, cons := range unit.Consumptions {
			if tech == "total" {
				continue
			}

			if _, exists := projectConsumptions[tech]; !exists {
				projectConsumptions[tech] = &Consumption{
					CO2Min:    new(float64),
					CO2Max:    new(float64),
					EnergyMin: new(float64),
					EnergyMax: new(float64),
				}
			}

			*projectConsumptions[tech].CO2Min += *cons.CO2Min * unit.Area
			*projectConsumptions[tech].CO2Max += *cons.CO2Max * unit.Area
			*projectConsumptions[tech].EnergyMin += *cons.EnergyMin * unit.Area
			*projectConsumptions[tech].EnergyMax += *cons.EnergyMax * unit.Area
		}
	}

	addTotalToConsumptions(projectConsumptions)

	// Normalize by total area (convert to consumption per m²)
	if projectArea > 0 {
		for _, cons := range projectConsumptions {
			*cons.CO2Min /= projectArea
			*cons.CO2Max /= projectArea
			*cons.EnergyMin /= projectArea
			*cons.EnergyMax /= projectArea
		}
	}

	return projectConsumptions, projectArea
}
