package main

import (
	"errors"
	"fmt"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/google/uuid"
)

var (
	errProjectTotalConsumptionUnavailable = errors.New("project total consumption is unavailable")
	errBenchmarkReferenceUnavailable      = errors.New("benchmark reference could not be calculated")
)

type Percentile float64

const (
	benchmarkBestProjectsY Percentile = 0.05
	benchmarkBaselineY     Percentile = 0.50
)

type metricBounds struct {
	Min float64
	Max float64
}

type metricPairBounds struct {
	CO2    metricBounds
	Energy metricBounds
}

type ReportMetricResult struct {
	Value float64 `json:"value"`
	Total float64 `json:"total"`
}

type RangeWithOptionalReference[T any] struct {
	Min       T  `json:"min"`
	Max       T  `json:"max"`
	Reference *T `json:"reference,omitempty"`
}

type MetricPair[R any] struct {
	CO2    R `json:"co2"`
	Energy R `json:"energy"`
}

type ProjectRangeResult = RangeWithOptionalReference[ReportMetricResult]
type ProjectMetrics = MetricPair[ProjectRangeResult]
type BenchmarkRangeResult = RangeWithOptionalReference[float64]
type BenchmarkMetrics = MetricPair[BenchmarkRangeResult]

type ProjectRank struct {
	Y          float64 `json:"y"`
	CountBelow int     `json:"count_below"`
	Total      int     `json:"total"`
}

type ProjectBenchmarkReport struct {
	ProjectID    uuid.UUID               `json:"project_id"`
	Area         float64                 `json:"area"`
	Rank         MetricPair[ProjectRank] `json:"rank"`
	Project      ProjectMetrics          `json:"project"`
	Reductions   ProjectMetrics          `json:"reductions"`
	BestProjects BenchmarkMetrics        `json:"bestProjects"`
	Baseline     BenchmarkMetrics        `json:"baseline"`
}

// buildProjectBenchmarkReport builds the project report payload using the same
// ranking behavior used by /benchmark/projects (y = (i+1)/n after sorting).
func (app *application) buildProjectBenchmarkReport(projectID uuid.UUID) (*ProjectBenchmarkReport, error) {
	project, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		return nil, err
	}
	if project.Area <= 0 {
		return nil, data.ErrZeroArea
	}

	totalConsumption, ok := project.Consumptions["total"]
	if !ok {
		return nil, errProjectTotalConsumptionUnavailable
	}
	if totalConsumption == nil {
		return nil, errProjectTotalConsumptionUnavailable
	}

	projectBounds, err := readProjectBounds(
		totalConsumption.CO2Min,
		totalConsumption.CO2Max,
		totalConsumption.EnergyMin,
		totalConsumption.EnergyMax,
	)
	if err != nil {
		return nil, err
	}

	series, err := app.getProjectBenchmarkSeries(data.GetProjectsBenchmarkFilters{})
	if err != nil {
		return nil, err
	}

	co2MinPoints := series.CO2Min
	co2MaxPoints := series.CO2Max
	energyMinPoints := series.EnergyMin
	energyMaxPoints := series.EnergyMax

	calculateGiniRank(co2MinPoints)
	calculateGiniRank(co2MaxPoints)
	calculateGiniRank(energyMinPoints)
	calculateGiniRank(energyMaxPoints)

	bestProjectsBounds, err := app.metricPairAtY(co2MinPoints, co2MaxPoints, energyMinPoints, energyMaxPoints, benchmarkBestProjectsY)
	if err != nil {
		return nil, err
	}

	baselineBounds, err := app.metricPairAtY(co2MinPoints, co2MaxPoints, energyMinPoints, energyMaxPoints, benchmarkBaselineY)
	if err != nil {
		return nil, err
	}

	err = validateMetricPairBounds(bestProjectsBounds)
	if err != nil {
		return nil, err
	}
	err = validateMetricPairBounds(baselineBounds)
	if err != nil {
		return nil, err
	}

	reductionsBounds := calculateReductionsBounds(projectBounds, baselineBounds)
	rank := MetricPair[ProjectRank]{
		CO2:    projectRankInSeries(co2MinPoints, projectBounds.CO2.Min),
		Energy: projectRankInSeries(energyMinPoints, projectBounds.Energy.Min),
	}

	report := &ProjectBenchmarkReport{
		ProjectID:  projectID,
		Area:       project.Area,
		Rank:       rank,
		Project:    buildProjectsReportMetrics(projectBounds, project.Area),
		Reductions: buildProjectsReportMetrics(reductionsBounds, project.Area),
		BestProjects: BenchmarkMetrics{
			CO2:    buildPerAreaRange(bestProjectsBounds.CO2.Min, bestProjectsBounds.CO2.Max),
			Energy: buildPerAreaRange(bestProjectsBounds.Energy.Min, bestProjectsBounds.Energy.Max),
		},
		Baseline: BenchmarkMetrics{
			CO2:    buildPerAreaRange(baselineBounds.CO2.Min, baselineBounds.CO2.Max),
			Energy: buildPerAreaRange(baselineBounds.Energy.Min, baselineBounds.Energy.Max),
		},
	}

	return report, nil
}

func requiredConsumptionValue(value *float64, field string) (float64, error) {
	if value != nil {
		return *value, nil
	}
	return 0, fmt.Errorf("%w: %s", errProjectTotalConsumptionUnavailable, field)
}

func readProjectBounds(co2Min, co2Max, energyMin, energyMax *float64) (metricPairBounds, error) {
	co2MinValue, err := requiredConsumptionValue(co2Min, "co2_min")
	if err != nil {
		return metricPairBounds{}, err
	}

	co2MaxValue, err := requiredConsumptionValue(co2Max, "co2_max")
	if err != nil {
		return metricPairBounds{}, err
	}

	energyMinValue, err := requiredConsumptionValue(energyMin, "energy_min")
	if err != nil {
		return metricPairBounds{}, err
	}

	energyMaxValue, err := requiredConsumptionValue(energyMax, "energy_max")
	if err != nil {
		return metricPairBounds{}, err
	}

	return metricPairBounds{
		CO2:    metricBounds{Min: co2MinValue, Max: co2MaxValue},
		Energy: metricBounds{Min: energyMinValue, Max: energyMaxValue},
	}, nil
}

func (app *application) metricValueAtY(points []BenchmarkValue, targetY Percentile) (float64, error) {
	if len(points) == 0 {
		return 0, errBenchmarkReferenceUnavailable
	}

	for _, point := range points {
		if point.Y >= float64(targetY) {
			return point.Value, nil
		}
	}

	return points[len(points)-1].Value, nil
}

func (app *application) metricPairAtY(co2MinPoints, co2MaxPoints, energyMinPoints, energyMaxPoints []BenchmarkValue, targetY Percentile) (metricPairBounds, error) {
	co2MinValue, err := app.metricValueAtY(co2MinPoints, targetY)
	if err != nil {
		return metricPairBounds{}, err
	}

	co2MaxValue, err := app.metricValueAtY(co2MaxPoints, targetY)
	if err != nil {
		return metricPairBounds{}, err
	}

	energyMinValue, err := app.metricValueAtY(energyMinPoints, targetY)
	if err != nil {
		return metricPairBounds{}, err
	}

	energyMaxValue, err := app.metricValueAtY(energyMaxPoints, targetY)
	if err != nil {
		return metricPairBounds{}, err
	}

	return metricPairBounds{
		CO2:    metricBounds{Min: co2MinValue, Max: co2MaxValue},
		Energy: metricBounds{Min: energyMinValue, Max: energyMaxValue},
	}, nil
}

func validateMetricPairBounds(bounds metricPairBounds) error {
	err := validateMetricBounds(bounds.CO2)
	if err != nil {
		return err
	}

	err = validateMetricBounds(bounds.Energy)
	if err != nil {
		return err
	}

	return nil
}

func validateMetricBounds(bounds metricBounds) error {
	if bounds.Min <= bounds.Max {
		return nil
	}

	return errBenchmarkReferenceUnavailable
}

func buildProjectsReportMetrics(bounds metricPairBounds, area float64) ProjectMetrics {
	referenceCO2 := calculateReference(bounds.CO2.Min, bounds.CO2.Max)
	referenceEnergy := calculateReference(bounds.Energy.Min, bounds.Energy.Max)

	return ProjectMetrics{
		CO2:    buildRange(bounds.CO2.Min, bounds.CO2.Max, referenceCO2, area),
		Energy: buildRange(bounds.Energy.Min, bounds.Energy.Max, referenceEnergy, area),
	}
}

func calculateReductionsBounds(projectBounds, baselineBounds metricPairBounds) metricPairBounds {
	return metricPairBounds{
		CO2: metricBounds{
			Min: baselineBounds.CO2.Min - projectBounds.CO2.Min,
			Max: baselineBounds.CO2.Max - projectBounds.CO2.Max,
		},
		Energy: metricBounds{
			Min: baselineBounds.Energy.Min - projectBounds.Energy.Min,
			Max: baselineBounds.Energy.Max - projectBounds.Energy.Max,
		},
	}
}

func buildRange(minPerArea, maxPerArea, referencePerArea, area float64) ProjectRangeResult {
	reference := buildMetric(referencePerArea, area)

	return ProjectRangeResult{
		Min:       buildMetric(minPerArea, area),
		Max:       buildMetric(maxPerArea, area),
		Reference: &reference,
	}
}

func buildPerAreaRange(minPerArea, maxPerArea float64) BenchmarkRangeResult {
	reference := calculateReference(minPerArea, maxPerArea)
	return BenchmarkRangeResult{
		Min:       minPerArea,
		Max:       maxPerArea,
		Reference: &reference,
	}
}

func calculateReference(minValue, maxValue float64) float64 {
	return (minValue + maxValue) / 2
}

func buildMetric(perArea, area float64) ReportMetricResult {
	return ReportMetricResult{
		Value: perArea,
		Total: perArea * area,
	}
}

func projectRankInSeries(points []BenchmarkValue, projectValue float64) ProjectRank {
	if len(points) == 0 {
		return ProjectRank{}
	}

	countBelow := 0
	for _, p := range points {
		if p.Value < projectValue {
			countBelow++
		}
	}

	return ProjectRank{
		Y:          float64(countBelow) / float64(len(points)),
		CountBelow: countBelow,
		Total:      len(points),
	}
}
