package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

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

func queryFloorConsumptionByTech(ctx context.Context, db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	query := `
		SELECT 
			fc.technology,
			SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
			SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
			SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
			SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
		FROM element_consumption fc
		INNER JOIN floor f ON fc.floor_id = f.id
		WHERE f.unit_id = $1 
		  AND fc.role_id = $2 
		  AND fc.option_id = $3
		GROUP BY fc.technology`

	rows, err := db.QueryContext(ctx, query, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanConsumptionRows(rows)
}

func queryUnitConsumptionByTech(ctx context.Context, db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	query := `
		SELECT 
			technology,
			co2_min,
			co2_max,
			energy_min,
			energy_max
		FROM element_consumption
		WHERE unit_id = $1 
		  AND role_id = $2 
		  AND option_id = $3`

	rows, err := db.QueryContext(ctx, query, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanConsumptionRows(rows)
}

func queryFloorConsumptionTotal(ctx context.Context, db *sql.DB, unitID, roleID, optionID uuid.UUID) (co2Min, co2Max, energyMin, energyMax float64, found bool, err error) {
	query := `
		SELECT 
			SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
			SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
			SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
			SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
		FROM element_consumption fc
		INNER JOIN floor f ON fc.floor_id = f.id
		WHERE f.unit_id = $1 
		  AND fc.role_id = $2 
		  AND fc.option_id = $3`

	var nullCO2Min, nullCO2Max, nullEnergyMin, nullEnergyMax sql.NullFloat64
	err = db.QueryRowContext(ctx, query, unitID, roleID, optionID).Scan(
		&nullCO2Min, &nullCO2Max, &nullEnergyMin, &nullEnergyMax,
	)
	if err != nil && err != sql.ErrNoRows {
		return 0, 0, 0, 0, false, err
	}

	if nullCO2Min.Valid {
		return nullCO2Min.Float64, nullCO2Max.Float64, nullEnergyMin.Float64, nullEnergyMax.Float64, true, nil
	}

	return 0, 0, 0, 0, false, nil
}

func queryUnitConsumptionTotal(ctx context.Context, db *sql.DB, unitID, roleID, optionID uuid.UUID) (co2Min, co2Max, energyMin, energyMax float64, err error) {
	query := `
		SELECT 
			COALESCE(SUM(co2_min), 0) as co2_min,
			COALESCE(SUM(co2_max), 0) as co2_max,
			COALESCE(SUM(energy_min), 0) as energy_min,
			COALESCE(SUM(energy_max), 0) as energy_max
		FROM element_consumption
		WHERE unit_id = $1 
		  AND role_id = $2 
		  AND option_id = $3`

	err = db.QueryRowContext(ctx, query, unitID, roleID, optionID).Scan(
		&co2Min, &co2Max, &energyMin, &energyMax,
	)
	if err != nil && err != sql.ErrNoRows {
		return 0, 0, 0, 0, err
	}

	return co2Min, co2Max, energyMin, energyMax, nil
}

func getConsumptionByTechnology(db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	floorConsumptions, err := queryFloorConsumptionByTech(ctx, db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	unitConsumptions, err := queryUnitConsumptionByTech(ctx, db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	for tech, cons := range unitConsumptions {
		floorConsumptions[tech] = cons
	}

	return floorConsumptions, nil
}

func calculateTotalConsumption(db *sql.DB, unitID, roleID, optionID uuid.UUID) (*Consumption, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	total := &Consumption{
		CO2Min:    new(float64),
		CO2Max:    new(float64),
		EnergyMin: new(float64),
		EnergyMax: new(float64),
	}

	floorCO2Min, floorCO2Max, floorEnergyMin, floorEnergyMax, found, err := queryFloorConsumptionTotal(ctx, db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}
	if found {
		*total.CO2Min += floorCO2Min
		*total.CO2Max += floorCO2Max
		*total.EnergyMin += floorEnergyMin
		*total.EnergyMax += floorEnergyMax
	}

	unitCO2Min, unitCO2Max, unitEnergyMin, unitEnergyMax, err := queryUnitConsumptionTotal(ctx, db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	*total.CO2Min += unitCO2Min
	*total.CO2Max += unitCO2Max
	*total.EnergyMin += unitEnergyMin
	*total.EnergyMax += unitEnergyMax

	if *total.CO2Min == 0 && *total.CO2Max == 0 {
		return nil, nil
	}

	return total, nil
}

func GetFullConsumption(db *sql.DB, unitID, roleID, optionID uuid.UUID) (map[string]*Consumption, error) {
	consumptions, err := getConsumptionByTechnology(db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	total, err := calculateTotalConsumption(db, unitID, roleID, optionID)
	if err != nil {
		return nil, err
	}

	if total != nil {
		consumptions["total"] = total
	}

	return consumptions, nil
}

func GetUnitConsumptionByTechnology(db *sql.DB, unitID uuid.UUID) (map[string]*Consumption, float64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var totalArea float64
	areaQuery := `SELECT COALESCE(SUM(area), 0) FROM floor WHERE unit_id = $1`
	err := db.QueryRowContext(ctx, areaQuery, unitID).Scan(&totalArea)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT 
			fc.technology,
			SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
			SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
			SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
			SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
		FROM element_consumption fc
		INNER JOIN floor f ON fc.floor_id = f.id
		INNER JOIN options opt ON fc.option_id = opt.id AND fc.role_id = opt.role_id
		WHERE f.unit_id = $1 
		  AND opt.active = TRUE
		GROUP BY fc.technology`

	rows, err := db.QueryContext(ctx, query, unitID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	consumptions, err := scanConsumptionRows(rows)
	if err != nil {
		return nil, 0, err
	}

	addTotalToConsumptions(consumptions)

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

	addTotalToConsumptions(projectConsumptions)

	return projectConsumptions, projectArea
}
