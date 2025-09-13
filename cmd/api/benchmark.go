package main

import (
	"net/http"
	"sort"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/gofrs/uuid"
)

type BenchmarkPoint struct {
	ID  uuid.UUID `json:"id"`
	Y   float64   `json:"y"`
	Min float64   `json:"min"`
	Max float64   `json:"max"`
}

type BenchmarkData struct {
	CO2    []BenchmarkPoint `json:"co2"`
	Energy []BenchmarkPoint `json:"energy"`
}

func calculateGiniAndSort(points []BenchmarkPoint) {
	sort.Slice(points, func(i, j int) bool {
		return points[i].Min < points[j].Min
	})

	n := float64(len(points))
	for i := range points {
		points[i].Y = (float64(i) + 1) / n
	}
}

func separateConsumption(points []*data.BenchmarkData) ([]BenchmarkPoint, []BenchmarkPoint) {
	var co2Points []BenchmarkPoint
	var energyPoints []BenchmarkPoint

	for _, point := range points {
		if point.Consumption != nil {
			if point.Consumption.CO2Min != nil {
				co2Points = append(co2Points, BenchmarkPoint{
					ID:  point.ID,
					Min: *point.Consumption.CO2Min,
					Max: *point.Consumption.CO2Max,
				})
			}
			if point.Consumption.EnergyMin != nil {
				energyPoints = append(energyPoints, BenchmarkPoint{
					ID:  point.ID,
					Min: *point.Consumption.EnergyMin,
					Max: *point.Consumption.EnergyMax,
				})
			}
		}
	}

	return co2Points, energyPoints
}

func (app *application) getFloorsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	floors, err := app.models.Benchmark.GetFloorsBenchmark()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	benchmarkData := BenchmarkData{
		CO2:    []BenchmarkPoint{},
		Energy: []BenchmarkPoint{},
	}

	if len(floors) != 0 {

		co2Points, energyPoints := separateConsumption(floors)

		calculateGiniAndSort(co2Points)
		calculateGiniAndSort(energyPoints)

		benchmarkData = BenchmarkData{
			CO2:    co2Points,
			Energy: energyPoints,
		}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUnitsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	units, err := app.models.Benchmark.GetUnitsBenchmark()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	benchmarkData := BenchmarkData{
		CO2:    []BenchmarkPoint{},
		Energy: []BenchmarkPoint{},
	}

	if len(units) != 0 {
		co2Points, energyPoints := separateConsumption(units)

		calculateGiniAndSort(co2Points)
		calculateGiniAndSort(energyPoints)

		benchmarkData = BenchmarkData{
			CO2:    co2Points,
			Energy: energyPoints,
		}
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getProjectsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	projects, err := app.models.Benchmark.GetProjectsBenchmark()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	benchmarkData := BenchmarkData{
		CO2:    []BenchmarkPoint{},
		Energy: []BenchmarkPoint{},
	}
	
	if len(projects) != 0 {	
		co2Points, energyPoints := separateConsumption(projects)
		
		calculateGiniAndSort(co2Points)
		calculateGiniAndSort(energyPoints)
		
		benchmarkData = BenchmarkData{
			CO2:    co2Points,
			Energy: energyPoints,
		}	
	}
	
	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
