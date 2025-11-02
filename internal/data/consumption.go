package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

func GetConsumptionByTechnology(db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	query := `
		SELECT 
			fc.technology,
			SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
			SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
			SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
			SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
		FROM floors_consumption fc
		INNER JOIN floor f ON fc.floor_id = f.id
		INNER JOIN floor_group fg ON f.group_id = fg.id
		WHERE fg.unit_id = $1 
		  AND fc.role_id = $2 
		  AND fc.option_id = $3
		GROUP BY fc.technology`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	consumptions := make(map[string]*Consumption)

	for rows.Next() {
		var tech string
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(&tech, &co2Min, &co2Max, &energyMin, &energyMax)
		if err != nil {
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

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return consumptions, nil
}

func CalculateTotalConsumption(db *sql.DB, unitID, roleID, optionID uuid.UUID) (*Consumption, error) {
	query := `
		WITH floor_totals AS (
			SELECT 
				f.id,
				f.area,
				SUM(fc.co2_min) as co2_min,
				SUM(fc.co2_max) as co2_max,
				SUM(fc.energy_min) as energy_min,
				SUM(fc.energy_max) as energy_max
			FROM floors_consumption fc
			INNER JOIN floor f ON fc.floor_id = f.id
			INNER JOIN floor_group fg ON f.group_id = fg.id
			WHERE fg.unit_id = $1 
			  AND fc.role_id = $2 
			  AND fc.option_id = $3
			GROUP BY f.id, f.area
		)
		SELECT 
			SUM(co2_min * area) / NULLIF(SUM(area), 0) as co2_min,
			SUM(co2_max * area) / NULLIF(SUM(area), 0) as co2_max,
			SUM(energy_min * area) / NULLIF(SUM(area), 0) as energy_min,
			SUM(energy_max * area) / NULLIF(SUM(area), 0) as energy_max
		FROM floor_totals`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var co2Min, co2Max, energyMin, energyMax sql.NullFloat64
	err := db.QueryRowContext(ctx, query, unitID, roleID, optionID).Scan(
		&co2Min, &co2Max, &energyMin, &energyMax,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if !co2Min.Valid {
		return nil, nil
	}

	return &Consumption{
		CO2Min:    &co2Min.Float64,
		CO2Max:    &co2Max.Float64,
		EnergyMin: &energyMin.Float64,
		EnergyMax: &energyMax.Float64,
	}, nil
}

func GetFullConsumption(db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	consumptions, err := GetConsumptionByTechnology(db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	total, err := CalculateTotalConsumption(db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	if total != nil {
		consumptions["total"] = total
	}

	return consumptions, nil
}

func GetUnitConsumptionByTechnology(db *sql.DB, unitID uuid.UUID) (map[string]*Consumption, float64, error) {
	query := `
		SELECT 
			fc.technology,
			SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
			SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
			SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
			SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max,
			SUM(f.area) as total_area
		FROM floors_consumption fc
		INNER JOIN floor f ON fc.floor_id = f.id
		INNER JOIN floor_group fg ON f.group_id = fg.id
		INNER JOIN tower_option topt ON fc.option_id = topt.id AND fc.role_id = topt.role_id
		WHERE fg.unit_id = $1 
		  AND topt.active = TRUE
		GROUP BY fc.technology`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	consumptions := make(map[string]*Consumption)
	var totalArea float64

	for rows.Next() {
		var tech string
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64
		var area sql.NullFloat64

		err := rows.Scan(&tech, &co2Min, &co2Max, &energyMin, &energyMax, &area)
		if err != nil {
			return nil, 0, err
		}

		if co2Min.Valid {
			consumptions[tech] = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
			if area.Valid && totalArea == 0 {
				totalArea = area.Float64
			}
		}
	}

	if err = rows.Err(); err != nil {
		return nil, 0, err
	}

	if len(consumptions) > 0 {
		total := &Consumption{
			CO2Min:    new(float64),
			CO2Max:    new(float64),
			EnergyMin: new(float64),
			EnergyMax: new(float64),
		}
		for _, consumption := range consumptions {
			*total.CO2Min += *consumption.CO2Min
			*total.CO2Max += *consumption.CO2Max
			*total.EnergyMin += *consumption.EnergyMin
			*total.EnergyMax += *consumption.EnergyMax
		}
		consumptions["total"] = total
	}

	return consumptions, totalArea, nil
}

func CalculateProjectConsumptions(units []ProjectUnit) (map[string]*Consumption, float64) {
	projectConsumptions := make(map[string]*Consumption)
	var projectArea float64

	for _, unit := range units {
		projectArea += unit.Area
		for tech, cons := range unit.Consumptions {
			if tech == "total" {
				continue
			}
			if _, ok := projectConsumptions[tech]; !ok {
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

	if projectArea > 0 {
		for _, cons := range projectConsumptions {
			*cons.CO2Min /= projectArea
			*cons.CO2Max /= projectArea
			*cons.EnergyMin /= projectArea
			*cons.EnergyMax /= projectArea
		}
	}

	if len(projectConsumptions) > 0 {
		projectTotal := &Consumption{
			CO2Min:    new(float64),
			CO2Max:    new(float64),
			EnergyMin: new(float64),
			EnergyMax: new(float64),
		}
		for _, cons := range projectConsumptions {
			*projectTotal.CO2Min += *cons.CO2Min
			*projectTotal.CO2Max += *cons.CO2Max
			*projectTotal.EnergyMin += *cons.EnergyMin
			*projectTotal.EnergyMax += *cons.EnergyMax
		}
		projectConsumptions["total"] = projectTotal
	}

	return projectConsumptions, projectArea
}
