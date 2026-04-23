package main

import (
	"errors"
	"net/http"
	"sort"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

// BenchmarkValue represents a single ranked data point.
// The Y field holds the Gini/Lorenz rank: (position+1)/total after ascending sort by Value.
// Floors, Technology, State and City are only populated for the /benchmark/projects endpoint.
type BenchmarkValue struct {
	ID         uuid.UUID `json:"id"`
	Y          float64   `json:"y"`
	Value      float64   `json:"value"`
	Floors     int       `json:"floors,omitempty"`
	Technology []string  `json:"technology,omitempty"`
	State      string    `json:"state,omitempty"`
	City       string    `json:"city,omitempty"`
}

// BenchmarkCategory holds two independently sorted lists — one for min consumption
// and one for max consumption — each with its own Gini rank.
type BenchmarkCategory struct {
	Min []BenchmarkValue `json:"min"`
	Max []BenchmarkValue `json:"max"`
}

// BenchmarkData is the top-level response shape for all benchmark endpoints.
type BenchmarkData struct {
	CO2    BenchmarkCategory `json:"co2"`
	Energy BenchmarkCategory `json:"energy"`
}

// calculateGiniRank sorts the slice ascending by Value and assigns each point
// a Gini rank y = (i+1)/n. The sort and rank happen in-place.
func calculateGiniRank(points []BenchmarkValue) {
	sort.Slice(points, func(i, j int) bool {
		return points[i].Value < points[j].Value
	})

	n := float64(len(points))
	for i := range points {
		points[i].Y = (float64(i) + 1) / n
	}
}

// separateConsumption fans out a flat slice of BenchmarkData into four independent
// lists: co2Min, co2Max, energyMin, energyMax. Each list is later sorted and ranked
// independently, which is why min and max are separated from the start.
func separateConsumption(points []*data.BenchmarkData) (co2Min, co2Max, energyMin, energyMax []BenchmarkValue) {
	co2Min = []BenchmarkValue{}
	co2Max = []BenchmarkValue{}
	energyMin = []BenchmarkValue{}
	energyMax = []BenchmarkValue{}

	for _, p := range points {
		if p.Consumption == nil {
			continue
		}
		if p.Consumption.CO2Min != nil {
			co2Min = append(co2Min, BenchmarkValue{ID: p.ID, Value: *p.Consumption.CO2Min})
			co2Max = append(co2Max, BenchmarkValue{ID: p.ID, Value: *p.Consumption.CO2Max})
		}
		if p.Consumption.EnergyMin != nil {
			energyMin = append(energyMin, BenchmarkValue{ID: p.ID, Value: *p.Consumption.EnergyMin})
			energyMax = append(energyMax, BenchmarkValue{ID: p.ID, Value: *p.Consumption.EnergyMax})
		}
	}

	return co2Min, co2Max, energyMin, energyMax
}

// separateProjectConsumption does the same as separateConsumption but for the projects
// endpoint, where each point carries extra unit metadata (floors, technology, location).
func separateProjectConsumption(points []*data.ProjectBenchmarkData) (co2Min, co2Max, energyMin, energyMax []BenchmarkValue) {
	co2Min = []BenchmarkValue{}
	co2Max = []BenchmarkValue{}
	energyMin = []BenchmarkValue{}
	energyMax = []BenchmarkValue{}

	for _, p := range points {
		if p.Consumption == nil {
			continue
		}
		if p.Consumption.CO2Min != nil {
			co2Min = append(co2Min, BenchmarkValue{ID: p.ID, Value: *p.Consumption.CO2Min, Floors: p.Floors, Technology: p.Technology, State: p.State, City: p.City})
			co2Max = append(co2Max, BenchmarkValue{ID: p.ID, Value: *p.Consumption.CO2Max, Floors: p.Floors, Technology: p.Technology, State: p.State, City: p.City})
		}
		if p.Consumption.EnergyMin != nil {
			energyMin = append(energyMin, BenchmarkValue{ID: p.ID, Value: *p.Consumption.EnergyMin, Floors: p.Floors, Technology: p.Technology, State: p.State, City: p.City})
			energyMax = append(energyMax, BenchmarkValue{ID: p.ID, Value: *p.Consumption.EnergyMax, Floors: p.Floors, Technology: p.Technology, State: p.State, City: p.City})
		}
	}

	return co2Min, co2Max, energyMin, energyMax
}

// buildBenchmarkData sorts and ranks all four lists then packs them into a BenchmarkData.
func buildBenchmarkData(co2Min, co2Max, energyMin, energyMax []BenchmarkValue) BenchmarkData {
	calculateGiniRank(co2Min)
	calculateGiniRank(co2Max)
	calculateGiniRank(energyMin)
	calculateGiniRank(energyMax)

	return BenchmarkData{
		CO2:    BenchmarkCategory{Min: co2Min, Max: co2Max},
		Energy: BenchmarkCategory{Min: energyMin, Max: energyMax},
	}
}

func (app *application) getFloorsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	floors, err := app.models.Benchmark.GetFloorsBenchmark()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	emptyCategory := BenchmarkCategory{Min: []BenchmarkValue{}, Max: []BenchmarkValue{}}
	benchmarkData := BenchmarkData{CO2: emptyCategory, Energy: emptyCategory}

	if len(floors) != 0 {
		co2Min, co2Max, energyMin, energyMax := separateConsumption(floors)
		benchmarkData = buildBenchmarkData(co2Min, co2Max, energyMin, energyMax)
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

	emptyCategory := BenchmarkCategory{Min: []BenchmarkValue{}, Max: []BenchmarkValue{}}
	benchmarkData := BenchmarkData{CO2: emptyCategory, Energy: emptyCategory}

	if len(units) != 0 {
		co2Min, co2Max, energyMin, energyMax := separateConsumption(units)
		benchmarkData = buildBenchmarkData(co2Min, co2Max, energyMin, energyMax)
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getProjectsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	var filters struct {
		FloorsFrom *int    `json:"floors_from,omitempty"`
		FloorsTo   *int    `json:"floors_to,omitempty"`
		Floors     *string `json:"floors,omitempty"`
		Technology *string `json:"technology,omitempty"`
	}

	v := validator.New()

	floorsFrom := app.readInt(r.URL.Query(), "floors_from", -1, v)
	if floorsFrom != -1 {
		filters.FloorsFrom = &floorsFrom
	}

	floorsTo := app.readInt(r.URL.Query(), "floors_to", -1, v)
	if floorsTo != -1 {
		filters.FloorsTo = &floorsTo
	}

	floors := app.readString(r.URL.Query(), "floors", "")
	if floors != "" {
		filters.Floors = &floors
	}

	technology := app.readString(r.URL.Query(), "technology", "")
	if technology != "" {
		filters.Technology = &technology
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	projectFilters := data.GetProjectsBenchmarkFilters{
		FloorsFrom: filters.FloorsFrom,
		FloorsTo:   filters.FloorsTo,
		Floors:     filters.Floors,
		Technology: filters.Technology,
	}

	projects, err := app.models.Benchmark.GetProjectsBenchmark(projectFilters)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidFloorFilter):
			app.badRequestResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	co2Min, co2Max, energyMin, energyMax := separateProjectConsumption(projects)
	benchmarkData := buildBenchmarkData(co2Min, co2Max, energyMin, energyMax)

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
