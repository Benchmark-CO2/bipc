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
	CO2      BenchmarkCategory `json:"co2"`
	Energy   BenchmarkCategory `json:"energy"`
	Material []BenchmarkValue  `json:"material"`
}

// BenchmarkSeries groups all benchmark series for a project query.
type BenchmarkSeries struct {
	CO2Min    []BenchmarkValue
	CO2Max    []BenchmarkValue
	EnergyMin []BenchmarkValue
	EnergyMax []BenchmarkValue
	Material  []BenchmarkValue
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

// separateConsumption fans out a flat slice of BenchmarkData into BenchmarkSeries.
func separateConsumption(points []*data.BenchmarkData) BenchmarkSeries {
	return separateConsumptionCommon(len(points), func(i int) benchmarkValueInput {
		p := points[i]
		return benchmarkValueInput{
			consumption: p.Consumption,
			id:          p.ID,
		}
	})
}

// separateProjectConsumption does the same as separateConsumption but for the projects
// endpoint, where each point carries extra unit metadata (floors, technology, location).
func separateProjectConsumption(points []*data.ProjectBenchmarkData) BenchmarkSeries {
	return separateConsumptionCommon(len(points), func(i int) benchmarkValueInput {
		p := points[i]
		return benchmarkValueInput{
			consumption: p.Consumption,
			id:          p.ID,
			floors:      p.Floors,
			technology:  p.Technology,
			state:       p.State,
			city:        p.City,
		}
	})
}

// benchmarkValueInput carries the per-point fields shared by the two benchmark
// fan-out helpers; metadata fields are empty for the floors endpoint.
type benchmarkValueInput struct {
	consumption *data.Consumption
	id          uuid.UUID
	floors      int
	technology  []string
	state       string
	city        string
}

// separateConsumptionCommon fans out a flat benchmark payload into the per-metric
// series. Points without consumption are skipped; zero material values are
// excluded from the Material series.
func separateConsumptionCommon(n int, inputAt func(i int) benchmarkValueInput) BenchmarkSeries {
	co2Min := []BenchmarkValue{}
	co2Max := []BenchmarkValue{}
	energyMin := []BenchmarkValue{}
	energyMax := []BenchmarkValue{}
	material := []BenchmarkValue{}

	for i := 0; i < n; i++ {
		in := inputAt(i)
		if in.consumption == nil {
			continue
		}
		if in.consumption.CO2Min != nil {
			co2Min = append(co2Min, BenchmarkValue{ID: in.id, Value: *in.consumption.CO2Min, Floors: in.floors, Technology: in.technology, State: in.state, City: in.city})
			co2Max = append(co2Max, BenchmarkValue{ID: in.id, Value: *in.consumption.CO2Max, Floors: in.floors, Technology: in.technology, State: in.state, City: in.city})
		}
		if in.consumption.EnergyMin != nil {
			energyMin = append(energyMin, BenchmarkValue{ID: in.id, Value: *in.consumption.EnergyMin, Floors: in.floors, Technology: in.technology, State: in.state, City: in.city})
			energyMax = append(energyMax, BenchmarkValue{ID: in.id, Value: *in.consumption.EnergyMax, Floors: in.floors, Technology: in.technology, State: in.state, City: in.city})
		}
		if in.consumption.Material != nil {
			if *in.consumption.Material == 0 {
				continue
			}

			material = append(material, BenchmarkValue{ID: in.id, Value: *in.consumption.Material, Floors: in.floors, Technology: in.technology, State: in.state, City: in.city})
		}
	}

	return BenchmarkSeries{
		CO2Min:    co2Min,
		CO2Max:    co2Max,
		EnergyMin: energyMin,
		EnergyMax: energyMax,
		Material:  material,
	}
}

// buildBenchmarkData sorts and ranks all benchmark lists then packs them into a BenchmarkData.
func buildBenchmarkData(co2Min, co2Max, energyMin, energyMax, material []BenchmarkValue) BenchmarkData {
	calculateGiniRank(co2Min)
	calculateGiniRank(co2Max)
	calculateGiniRank(energyMin)
	calculateGiniRank(energyMax)
	calculateGiniRank(material)

	return BenchmarkData{
		CO2:      BenchmarkCategory{Min: co2Min, Max: co2Max},
		Energy:   BenchmarkCategory{Min: energyMin, Max: energyMax},
		Material: material,
	}
}

func (app *application) readProjectsBenchmarkFilters(r *http.Request, v *validator.Validator) data.GetProjectsBenchmarkFilters {
	filters := data.GetProjectsBenchmarkFilters{}

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

	return filters
}

func (app *application) getProjectBenchmarkSeries(filters data.GetProjectsBenchmarkFilters) (BenchmarkSeries, error) {
	projects, err := app.models.Benchmark.GetProjectsBenchmark(filters)
	if err != nil {
		return BenchmarkSeries{}, err
	}

	return separateProjectConsumption(projects), nil
}

func (app *application) getFloorsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	floors, err := app.models.Benchmark.GetFloorsBenchmark()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	emptyCategory := BenchmarkCategory{Min: []BenchmarkValue{}, Max: []BenchmarkValue{}}
	benchmarkData := BenchmarkData{CO2: emptyCategory, Energy: emptyCategory, Material: []BenchmarkValue{}}

	if len(floors) != 0 {
		series := separateConsumption(floors)
		benchmarkData = buildBenchmarkData(series.CO2Min, series.CO2Max, series.EnergyMin, series.EnergyMax, series.Material)
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
	benchmarkData := BenchmarkData{CO2: emptyCategory, Energy: emptyCategory, Material: []BenchmarkValue{}}

	if len(units) != 0 {
		series := separateConsumption(units)
		benchmarkData = buildBenchmarkData(series.CO2Min, series.CO2Max, series.EnergyMin, series.EnergyMax, series.Material)
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getProjectsBenchmarkHandler(w http.ResponseWriter, r *http.Request) {
	v := validator.New()
	projectFilters := app.readProjectsBenchmarkFilters(r, v)

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	series, err := app.getProjectBenchmarkSeries(projectFilters)
	if err != nil {
		if errors.Is(err, data.ErrInvalidFloorFilter) {
			app.badRequestResponse(w, r, err)
			return
		}

		app.serverErrorResponse(w, r, err)
		return
	}

	benchmarkData := buildBenchmarkData(series.CO2Min, series.CO2Max, series.EnergyMin, series.EnergyMax, series.Material)

	err = app.writeJSON(w, http.StatusOK, envelope{"benchmark": benchmarkData}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
