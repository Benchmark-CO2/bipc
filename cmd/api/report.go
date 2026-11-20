package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"

	"github.com/Benchmark-CO2/bipc/assets"
	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/google/uuid"

	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"html/template"
	"log"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
	"github.com/ysmood/gson"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

func mergePDFsInMemory(pdfs ...[]byte) (*bytes.Buffer, error) {
	readers := make([]io.ReadSeeker, len(pdfs))
	for i, p := range pdfs {
		readers[i] = bytes.NewReader(p)
	}

	var out bytes.Buffer

	if err := api.MergeRaw(readers, &out, false, nil); err != nil {
		return nil, err
	}
	return &out, nil
}

func fontFaceCSS(font []byte, fontName string) string {
	encoded := base64.StdEncoding.EncodeToString(font)

	return `
	@font-face {
		font-family: '` + fontName + `';
		src: url(data:font/ttf;base64,` + encoded + `) format('truetype-variations');
	}
	`
}

func generateDocumentContent(templateFile string, templateName string, reportData ReportData, jsonData any, fontFaceCSS string) (string, error) {
	jsonBytes, err := json.Marshal(jsonData)
	if err != nil {
		return "", err
	}

	t := template.Must(template.New("").ParseFS(assets.TemplateFS, "templates/"+templateFile))

	var buf bytes.Buffer
	err = t.ExecuteTemplate(&buf, templateName, struct {
		ReportData  ReportData
		JSONData    template.JS
		FontFaceCSS template.CSS
	}{
		ReportData:  reportData,
		JSONData:    template.JS(jsonBytes),
		FontFaceCSS: template.CSS(fontFaceCSS),
	})
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

type TableRow struct {
	Type       string // tecnologia ou material
	Name       string
	Co2Min     float64
	Co2Prov    float64
	Co2Max     float64
	EnergyMin  float64
	EnergyProv float64
	EnergyMax  float64
	Cum        float64
}

// UserModuleMaterial is a material row of an unknown module in the report: the
// name plus ready-to-render quantity and unit labels.
type UserModuleMaterial struct {
	Name          string
	Quantity      float64
	Unit          string
	QuantityLabel string
	UnitLabel     string
}

// UserModuleGroup is an unknown module (technology) grouping its materials.
type UserModuleGroup struct {
	Name      string
	Materials []UserModuleMaterial
}

type FloorDetail struct {
	Name              string
	TableCarbonEnergy []TableRow
}

type unitDetail struct {
	Name          string
	FloorsDetails []FloorDetail
}

type ReportData struct {
	ProjectWithUnits *data.ProjectWithUnits
	TotalUH          int
	TotalUC          int
	TotalUCArea      float64

	SourcesTotal float32

	Report                  *ProjectBenchmarkReport
	BaseLineCO2reference    float64
	BestC02Reference        float64
	BaselineEnergyReference float64
	BestEnergyReference     float64
	CO2Class                string
	CO2Total                int
	EnergyClass             string
	EnergyTotal             int

	CumClass string
	CumTotal int

	TableCarbonEnergy []TableRow
	UserModulesTable  []UserModuleGroup

	UnitsDetails []unitDetail
}

type SourceData struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Color string `json:"color"` // hexadecimal color code, e.g., "#FF5733"
}

type GMItem struct {
	Material string  `json:"material"`
	Kg       float64 `json:"kg"`
}

type GMCategoria struct {
	Nome  string   `json:"nome"`
	Itens []GMItem `json:"itens"`
}

type GCPonto struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Destaque bool    `json:"destaque,omitempty"`
}

type SBCSerie struct {
	Nome  string  `json:"nome"`
	Valor float64 `json:"valor"`
}

type SBCLinha struct {
	Nome   string     `json:"nome"`
	Series []SBCSerie `json:"series"`
}

type BenchmarkPoint struct {
	ID    string  `json:"id"`
	Y     float64 `json:"y"`
	Min   float64 `json:"min"`
	Max   float64 `json:"max"`
	Value float64 `json:"value,omitempty"`
	Label string  `json:"label,omitempty"`
}

type Material struct {
	Name    string  `json:"name"`
	Value   float64 `json:"value"`
	Percent float64 `json:"percent"`
}

type Tecnology struct {
	Name      string     `json:"name"`
	Percent   float64    `json:"percent"`
	Materials []Material `json:"materials"`
}

type Unit struct {
	Name        string      `json:"name"`
	Tecnologies []Tecnology `json:"tecnologies"`
}

type JSONData struct {
	Sources     []SourceData     `json:"sources"`
	CO2Chart    []BenchmarkPoint `json:"co2Chart"`
	EnergyChart []BenchmarkPoint `json:"energyChart"`
	SelectedIDs []string         `json:"selectedIds"`
	GM          []GMCategoria    `json:"gm"`    // Total de Emissões por tecnologia e material (% / Kg CO₂)
	GC          []GCPonto        `json:"gc"`    // Impacto de CUM por tecnologia (m³/m²)
	SBC1        []SBCLinha       `json:"sbc1"`  // Consumo total de energia por tecnologia (mj)
	SBC2        []SBCLinha       `json:"sbc2"`  // Total de Emissões por tecnologia (kg CO₂)
	Units       []Unit           `json:"units"` // Composição e impacto de cada tecnologia por material
}

func normalizeScreenshotBenchmarkPoints(minPoints, maxPoints []BenchmarkValue) []BenchmarkPoint {
	sort.Slice(minPoints, func(i, j int) bool {
		return minPoints[i].Y < minPoints[j].Y
	})
	sort.Slice(maxPoints, func(i, j int) bool {
		return maxPoints[i].Y < maxPoints[j].Y
	})

	count := min(len(minPoints), len(maxPoints))
	points := make([]BenchmarkPoint, 0, count)
	for i := 0; i < count; i++ {
		points = append(points, BenchmarkPoint{
			ID:  minPoints[i].ID.String(),
			Y:   minPoints[i].Y,
			Min: minPoints[i].Value,
			Max: maxPoints[i].Value,
		})
	}

	return points
}

func addSelectedBenchmarkPoint(points []BenchmarkValue, id uuid.UUID, value float64) []BenchmarkValue {
	for _, point := range points {
		if point.ID == id {
			return points
		}
	}

	return append(points, BenchmarkValue{ID: id, Value: value})
}

func unknownUnitLabel(unit string) string {
	switch unit {
	case "m2":
		return "m²"
	case "m3":
		return "m³"
	case "other":
		return "Outro"
	default:
		return unit
	}
}

func unknownQuantityLabel(q float64) string {
	if q == 0 {
		return "-"
	}
	return strconv.FormatFloat(q, 'f', -1, 64)
}

// buildUserModulesTable groups the unknown module occurrences of the project by
// technology, deduplicating by module type (same as the project screen) and
// merging repeated materials by name.
func buildUserModulesTable(occurrences []*data.UnknownModuleOccurrence) []UserModuleGroup {
	groups := make([]UserModuleGroup, 0)
	groupIdx := make(map[uuid.UUID]int)

	for _, occurrence := range occurrences {
		if occurrence == nil || occurrence.UnknownModule == nil {
			continue
		}

		gi, ok := groupIdx[occurrence.UnknownModuleID]
		if !ok {
			gi = len(groups)
			groupIdx[occurrence.UnknownModuleID] = gi
			groups = append(groups, UserModuleGroup{Name: occurrence.UnknownModule.Name})
		}
		group := &groups[gi]

		for _, material := range occurrence.Materials {
			found := false
			for i := range group.Materials {
				if group.Materials[i].Name == material.Name {
					group.Materials[i].Quantity += material.Quantity
					found = true
					break
				}
			}
			if !found {
				group.Materials = append(group.Materials, UserModuleMaterial{
					Name:     material.Name,
					Quantity: material.Quantity,
					Unit:     material.Unit,
				})
			}
		}
	}

	for gi := range groups {
		for mi := range groups[gi].Materials {
			groups[gi].Materials[mi].QuantityLabel = unknownQuantityLabel(groups[gi].Materials[mi].Quantity)
			groups[gi].Materials[mi].UnitLabel = unknownUnitLabel(groups[gi].Materials[mi].Unit)
		}
	}

	return groups
}

// buildSourceData converts the per-source percentage distribution returned by
// SourceDistribution into chart-ready segments and the total traceability
// percentage (the sum of all source shares). Sources with no explicit tag are
// already attributed to "manual" by the data layer. Segments are ordered by
// share descending so the largest source renders first on the bar.
func buildSourceData(distribution map[string]float64) ([]SourceData, float32) {
	labels := map[string]string{
		"manual": "Inseridos manualmente",
		"ifc":    "Arquivos IFC (via upload)",
		"tqs":    "Softwares (TQS via plugin)",
		"plugin": "Softwares (TQS via plugin)",
		"altoqi": "Softwares (AltoQi)",
		"csv":    "Arquivos CSV",
	}
	colors := map[string]string{
		"manual": "#d4736b",
		"ifc":    "#1b7a72",
		"tqs":    "#8ab4e8",
		"plugin": "#8ab4e8",
		"altoqi": "#e8a24a",
		"csv":    "#e8a24a",
	}
	fallbackColors := []string{"#5B9BD5", "#E0756C", "#64C85A", "#F8A12B", "#9ECF31", "#EAE61F"}

	rawTotal := 0.0
	sources := make([]SourceData, 0, len(distribution))
	for source, percent := range distribution {
		rawTotal += percent
		label := source
		if l, ok := labels[source]; ok {
			label = l
		}
		color := fallbackColors[len(sources)%len(fallbackColors)]
		if c, ok := colors[source]; ok {
			color = c
		}
		sources = append(sources, SourceData{
			Label: label,
			Value: int(percent + 0.5),
			Color: color,
		})
	}

	sort.Slice(sources, func(i, j int) bool {
		if sources[i].Value != sources[j].Value {
			return sources[i].Value > sources[j].Value
		}
		return sources[i].Label < sources[j].Label
	})

	return sources, float32(math.Round(rawTotal))
}

// moduleTypeDisplayNames maps module types to their report display names
// (PT-BR). Storage keys stay English; only the display is localized.
var moduleTypeDisplayNames = map[string]string{
	"concrete_wall":         "Parede de Concreto",
	"structural_masonry":    "Alvenaria Estrutural",
	"beam_column":           "Viga Pilar",
	"raft_foundation":       "Radier",
	"piles_foundation":      "Estaca",
	"raft_piles_foundation": "Radier Estaqueado",
}

// materialDisplayNames maps the stored material class keys to their report
// display names (PT-BR).
var materialDisplayNames = map[string]string{
	"concrete": "Concreto",
	"steel":    "Aço",
	"mortar":   "Argamassa",
	"blocks":   "Blocos",
}

// buildGMCategorias groups the project-level emissions by technology and
// material into the stacked-bar data of the "Total de Emissões por tecnologia
// e material" chart. Kg uses the mean of the min/max bounds. Categories and
// their materials are ordered by Kg descending.
func buildGMCategorias(emissions []data.ProjectMaterialEmissions) []GMCategoria {
	type techAgg struct {
		total float64
		itens map[string]float64
	}

	categories := make(map[string]*techAgg)
	for _, e := range emissions {
		if e.CO2Avg <= 0 {
			continue
		}
		name := moduleTypeDisplayNames[e.Technology]
		if name == "" {
			name = e.Technology
		}
		material := materialDisplayNames[e.Material]
		if material == "" {
			material = e.Material
		}

		agg, ok := categories[name]
		if !ok {
			agg = &techAgg{itens: make(map[string]float64)}
			categories[name] = agg
		}
		agg.itens[material] += e.CO2Avg
		agg.total += e.CO2Avg
	}

	gm := make([]GMCategoria, 0, len(categories))
	for name, agg := range categories {
		itens := make([]GMItem, 0, len(agg.itens))
		for material, kg := range agg.itens {
			if kg <= 0 {
				continue
			}
			itens = append(itens, GMItem{Material: material, Kg: kg})
		}
		sort.Slice(itens, func(i, j int) bool {
			return itens[i].Kg > itens[j].Kg
		})
		gm = append(gm, GMCategoria{Nome: name, Itens: itens})
	}

	sort.Slice(gm, func(i, j int) bool {
		totalI := 0.0
		for _, item := range gm[i].Itens {
			totalI += item.Kg
		}
		totalJ := 0.0
		for _, item := range gm[j].Itens {
			totalJ += item.Kg
		}
		return totalI > totalJ
	})

	return gm
}

func (app *application) screenshotHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	totalUC := 0
	totalUH := 0
	totalUCArea := 0.0

	for _, unit := range project.Units {
		rep := unit.RepetitionCount
		if rep <= 0 {
			rep = 1
		}

		totalUC += rep

		if unit.HousingUnitsCount != nil {
			totalUH += rep * *unit.HousingUnitsCount
		}

		totalUCArea += unit.Area * float64(rep)
	}

	report, err := app.buildProjectBenchmarkReport(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	co2Class := classificationLetter(report.Rank.CO2.Y)
	co2Total := report.Rank.CO2.Total
	energyClass := classificationLetter(report.Rank.Energy.Y)
	energyTotal := report.Rank.Energy.Total

	sourceDistribution, err := app.models.Modules.SourceDistribution(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	sources, sourcesTotal := buildSourceData(sourceDistribution)

	projectMaterialEmissions, err := app.models.Modules.GetProjectMaterialEmissionsByTechnology(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	gm := buildGMCategorias(projectMaterialEmissions)

	var reportData = ReportData{
		ProjectWithUnits: project,

		TotalUH:     totalUH,
		TotalUC:     totalUC,
		TotalUCArea: totalUCArea,

		SourcesTotal: sourcesTotal,

		Report:                  report,
		BaseLineCO2reference:    *report.Baseline.CO2.Reference,
		BestC02Reference:        *report.BestProjects.CO2.Reference,
		BaselineEnergyReference: *report.Baseline.Energy.Reference,
		BestEnergyReference:     *report.BestProjects.Energy.Reference,
		CO2Class:                co2Class,
		CO2Total:                co2Total,
		EnergyClass:             energyClass,
		EnergyTotal:             energyTotal,

		CumClass: "D",
		CumTotal: 301,

		UserModulesTable: buildUserModulesTable(project.UnknownModules),

		TableCarbonEnergy: []TableRow{
			{Type: "tecnologia", Name: "Tecnologia A", Co2Min: 10.5, Co2Prov: 15.2, Co2Max: 20.0, EnergyMin: 5.0, EnergyProv: 7.5, EnergyMax: 10.0, Cum: 30.0},
			{Type: "material", Name: "Material B", Co2Min: 8.0, Co2Prov: 12.0, Co2Max: 16.0, EnergyMin: 4.0, EnergyProv: 6.0, EnergyMax: 8.0, Cum: 24.0},
			{Type: "material", Name: "Tecnologia C", Co2Min: 12.0, Co2Prov: 18.0, Co2Max: 24.0, EnergyMin: 6.0, EnergyProv: 9.0, EnergyMax: 12.0, Cum: 36.0},
			{Type: "material", Name: "Material D", Co2Min: 10.0, Co2Prov: 15.0, Co2Max: 20.0, EnergyMin: 5.0, EnergyProv: 7.5, EnergyMax: 10.0, Cum: 30.0},
			{Type: "material", Name: "Tecnologia E", Co2Min: 14.0, Co2Prov: 20.0, Co2Max: 26.0, EnergyMin: 7.0, EnergyProv: 10.0, EnergyMax: 14.0, Cum: 42.0},
			{Type: "material", Name: "Material F", Co2Min: 11.0, Co2Prov: 16.0, Co2Max: 22.0, EnergyMin: 5.5, EnergyProv: 8.0, EnergyMax: 11.0, Cum: 33.0},
			{Type: "tecnologia", Name: "Tecnologia A", Co2Min: 10.5, Co2Prov: 15.2, Co2Max: 20.0, EnergyMin: 5.0, EnergyProv: 7.5, EnergyMax: 10.0, Cum: 30.0},
			{Type: "material", Name: "Material B", Co2Min: 8.0, Co2Prov: 12.0, Co2Max: 16.0, EnergyMin: 4.0, EnergyProv: 6.0, EnergyMax: 8.0, Cum: 24.0},
			{Type: "material", Name: "Tecnologia C", Co2Min: 12.0, Co2Prov: 18.0, Co2Max: 24.0, EnergyMin: 6.0, EnergyProv: 9.0, EnergyMax: 12.0, Cum: 36.0},
			{Type: "material", Name: "Material D", Co2Min: 10.0, Co2Prov: 15.0, Co2Max: 20.0, EnergyMin: 5.0, EnergyProv: 7.5, EnergyMax: 10.0, Cum: 30.0},
			{Type: "material", Name: "Tecnologia E", Co2Min: 14.0, Co2Prov: 20.0, Co2Max: 26.0, EnergyMin: 7.0, EnergyProv: 10.0, EnergyMax: 14.0, Cum: 42.0},
			{Type: "material", Name: "Material F", Co2Min: 11.0, Co2Prov: 16.0, Co2Max: 22.0, EnergyMin: 5.5, EnergyProv: 8.0, EnergyMax: 11.0, Cum: 33.0},
		},

		UnitsDetails: []unitDetail{
			{
				Name: "Torre A",
				FloorsDetails: []FloorDetail{
					{
						Name: "Pavimento tipo",
						TableCarbonEnergy: []TableRow{
							{Type: "tecnologia", Name: "Alvenaria estrutural", Co2Min: 48.20, Co2Prov: 52.40, Co2Max: 57.10, EnergyMin: 620.50, EnergyProv: 665.80, EnergyMax: 710.20, Cum: 0.34},
							{Type: "material", Name: "Concreto armado", Co2Min: 72.10, Co2Prov: 78.60, Co2Max: 85.40, EnergyMin: 780.30, EnergyProv: 830.40, EnergyMax: 890.70, Cum: 0.48},
							{Type: "material", Name: "Aco estrutural", Co2Min: 94.30, Co2Prov: 102.20, Co2Max: 111.80, EnergyMin: 920.10, EnergyProv: 980.50, EnergyMax: 1045.00, Cum: 0.62},
						},
					},
					{
						Name: "Cobertura",
						TableCarbonEnergy: []TableRow{
							{Type: "tecnologia", Name: "Sistema de cobertura", Co2Min: 35.40, Co2Prov: 39.80, Co2Max: 44.10, EnergyMin: 410.20, EnergyProv: 455.60, EnergyMax: 502.30, Cum: 0.28},
							{Type: "material", Name: "Impermeabilizacao", Co2Min: 18.70, Co2Prov: 21.30, Co2Max: 24.50, EnergyMin: 205.40, EnergyProv: 228.90, EnergyMax: 251.80, Cum: 0.16},
						},
					},
				},
			},
			{
				Name: "Torre B",
				FloorsDetails: []FloorDetail{
					{
						Name: "Pavimento tipo",
						TableCarbonEnergy: []TableRow{
							{Type: "tecnologia", Name: "Estrutura em concreto", Co2Min: 68.50, Co2Prov: 74.20, Co2Max: 81.30, EnergyMin: 735.00, EnergyProv: 790.40, EnergyMax: 848.60, Cum: 0.45},
							{Type: "material", Name: "Vedacao em alvenaria", Co2Min: 42.30, Co2Prov: 46.70, Co2Max: 51.20, EnergyMin: 580.20, EnergyProv: 625.80, EnergyMax: 680.10, Cum: 0.31},
						},
					},
				},
			},
		},
	}

	benchmarkProjects, err := app.models.Benchmark.GetProjectsBenchmark(data.GetProjectsBenchmarkFilters{})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	benchmarkSeries := separateProjectConsumption(benchmarkProjects)
	benchmarkSeries.CO2Min = addSelectedBenchmarkPoint(
		benchmarkSeries.CO2Min,
		projectID,
		report.Project.CO2.Min.Value,
	)
	benchmarkSeries.CO2Max = addSelectedBenchmarkPoint(
		benchmarkSeries.CO2Max,
		projectID,
		report.Project.CO2.Max.Value,
	)
	benchmarkSeries.EnergyMin = addSelectedBenchmarkPoint(
		benchmarkSeries.EnergyMin,
		projectID,
		report.Project.Energy.Min.Value,
	)
	benchmarkSeries.EnergyMax = addSelectedBenchmarkPoint(
		benchmarkSeries.EnergyMax,
		projectID,
		report.Project.Energy.Max.Value,
	)
	calculateGiniRank(benchmarkSeries.CO2Min)
	calculateGiniRank(benchmarkSeries.CO2Max)
	calculateGiniRank(benchmarkSeries.EnergyMin)
	calculateGiniRank(benchmarkSeries.EnergyMax)
	co2Points := normalizeScreenshotBenchmarkPoints(benchmarkSeries.CO2Min, benchmarkSeries.CO2Max)
	energyPoints := normalizeScreenshotBenchmarkPoints(benchmarkSeries.EnergyMin, benchmarkSeries.EnergyMax)

	var jsonData = JSONData{
		Sources: sources,
		GM:      gm,
		GC: []GCPonto{
			{X: 0.15, Y: 0.0179}, {X: 0.18, Y: 0.0357}, {X: 0.20, Y: 0.0536}, {X: 0.205, Y: 0.0714},
			{X: 0.21, Y: 0.0893}, {X: 0.22, Y: 0.1071}, {X: 0.23, Y: 0.1250}, {X: 0.26, Y: 0.1429},
			{X: 0.30, Y: 0.1607}, {X: 0.31, Y: 0.1786}, {X: 0.33, Y: 0.1964}, {X: 0.335, Y: 0.2143},
			{X: 0.36, Y: 0.2321}, {X: 0.37, Y: 0.2500}, {X: 0.375, Y: 0.2679}, {X: 0.39, Y: 0.2857},
			{X: 0.395, Y: 0.3036}, {X: 0.40, Y: 0.3214}, {X: 0.42, Y: 0.3393}, {X: 0.43, Y: 0.3571},
			{X: 0.44, Y: 0.3750}, {X: 0.45, Y: 0.3929}, {X: 0.47, Y: 0.4107}, {X: 0.48, Y: 0.4286},
			{X: 0.485, Y: 0.4464}, {X: 0.49, Y: 0.4643}, {X: 0.50, Y: 0.4821}, {X: 0.51, Y: 0.5000},
			{X: 0.52, Y: 0.5179}, {X: 0.525, Y: 0.5357}, {X: 0.53, Y: 0.5536}, {X: 0.535, Y: 0.5714},
			{X: 0.54, Y: 0.5893}, {X: 0.55, Y: 0.6071, Destaque: true}, {X: 0.555, Y: 0.6250},
			{X: 0.56, Y: 0.6429}, {X: 0.565, Y: 0.6607}, {X: 0.57, Y: 0.6786}, {X: 0.575, Y: 0.6964},
			{X: 0.58, Y: 0.7143}, {X: 0.62, Y: 0.7321}, {X: 0.63, Y: 0.7500}, {X: 0.64, Y: 0.7679},
			{X: 0.645, Y: 0.7857}, {X: 0.655, Y: 0.8036}, {X: 0.665, Y: 0.8214}, {X: 0.68, Y: 0.8393},
			{X: 0.69, Y: 0.8571}, {X: 0.70, Y: 0.8750}, {X: 0.72, Y: 0.8929}, {X: 0.73, Y: 0.9107},
			{X: 0.74, Y: 0.9286}, {X: 0.755, Y: 0.9464}, {X: 0.76, Y: 0.9643}, {X: 0.90, Y: 0.9821},
		},
		SBC1: []SBCLinha{
			{Nome: "Torre A", Series: []SBCSerie{
				{Nome: "Parede de concreto", Valor: 16}, {Nome: "Fundação radier", Valor: 5}, {Nome: "Cobertura", Valor: 3}}},
			{Nome: "Torre B", Series: []SBCSerie{
				{Nome: "Parede de concreto", Valor: 16}, {Nome: "Fundação radier", Valor: 5}, {Nome: "Cobertura", Valor: 3}}},
			{Nome: "Residencial modelo", Series: []SBCSerie{
				{Nome: "Parede de concreto", Valor: 32}, {Nome: "Fundação radier", Valor: 10}, {Nome: "Cobertura", Valor: 6}, {Nome: "teste", Valor: 15}}},
		},
		SBC2: []SBCLinha{
			{Nome: "Torre A", Series: []SBCSerie{
				{Nome: "Parede de concreto", Valor: 16}, {Nome: "Fundação radier", Valor: 5}, {Nome: "Cobertura", Valor: 3}}},
			{Nome: "Torre B", Series: []SBCSerie{
				{Nome: "Parede de concreto", Valor: 16}, {Nome: "Fundação radier", Valor: 5}, {Nome: "Cobertura", Valor: 3}}},
		},
		CO2Chart:    co2Points,
		EnergyChart: energyPoints,
		SelectedIDs: []string{projectID.String()},
		Units: []Unit{
			{Name: "Torre A", Tecnologies: []Tecnology{
				{Name: "Parede de concreto", Percent: 40, Materials: []Material{
					{Name: "Concreto", Value: 2100, Percent: 60},
					{Name: "Aço", Value: 400, Percent: 20},
					{Name: "Argamassa", Value: 1100, Percent: 20},
				}},
				{Name: "Fundação radier", Percent: 30, Materials: []Material{
					{Name: "Concreto", Value: 4560, Percent: 70},
					{Name: "Aço", Value: 350, Percent: 15},
					{Name: "Argamassa", Value: 70, Percent: 15},
				}},
			}},
			{Name: "Torre B", Tecnologies: []Tecnology{
				{Name: "Parede de concreto", Percent: 40, Materials: []Material{
					{Name: "Concreto", Value: 2100, Percent: 60},
					{Name: "Aço", Value: 400, Percent: 20},
					{Name: "Argamassa", Value: 1100, Percent: 20},
				}},
				{Name: "Fundação radier", Percent: 30, Materials: []Material{
					{Name: "Concreto", Value: 4560, Percent: 70},
					{Name: "Aço", Value: 350, Percent: 15},
					{Name: "Argamassa", Value: 70, Percent: 15},
				}},
			}},
		},
	}

	reportContent, err := generateDocumentContent("caixa.gohtml", "report", reportData, jsonData, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	coverContent, err := generateDocumentContent("caixa.gohtml", "cover", reportData, nil, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := os.WriteFile("reportContent.html", []byte(reportContent), 0644); err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile("coverContent.html", []byte(coverContent), 0644); err != nil {
		log.Fatal(err)
	}

	url := launcher.New().NoSandbox(true).Headless(true).MustLaunch()

	browser := rod.New().ControlURL(url).MustConnect()
	defer browser.MustClose()

	page := browser.MustPage()
	defer page.MustClose()

	page.MustSetDocumentContent(coverContent).MustWaitLoad()

	coverPDF, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:   true,
		MarginTop:         gson.Num(0),
		MarginBottom:      gson.Num(0),
		MarginLeft:        gson.Num(0),
		MarginRight:       gson.Num(0),
		PaperWidth:        gson.Num(8.27), // A4 em polegadas
		PaperHeight:       gson.Num(11.69),
		PreferCSSPageSize: true,
	})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer coverPDF.Close()

	page.MustSetDocumentContent(reportContent).MustWait(`() => window.chartsReady === true`)

	now := time.Now()
	formatted := now.Format("02/01/2006 às 15:04")

	reportPDF, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:     true,
		PaperWidth:          gson.Num(8.27),
		PaperHeight:         gson.Num(11.69),
		DisplayHeaderFooter: true,
		HeaderTemplate: fmt.Sprintf(`
		<style>
			%s
		</style>
		<div style="display: flex; width: 100%%; justify-content: space-between; align-items: center; padding: 0 20px;">
    		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
        		<div style="align-self: stretch; color: #187B8B; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 18px; font-style: normal; font-weight: 600; line-height: 17.5px; letter-spacing: -0.16px;">Relatório de Carbono Embutido de projeto </div>
       			<div style="align-self: stretch; color: #121F21; font-feature-settings: 'calt' off; font-size: 9px; font-style: normal; font-weight: 400; line-height: 13px; letter-spacing: -0.8px;"> <b>Modelo:</b> CAIXA - Emitido digitalmente em %s </div>
    		</div>
			<div style="display: flex; align-items: center; gap: 5px;">
				<div style=" display: flex; width: 160px; padding: 2px; align-items: center; gap: 5px; border: 1px solid #E4E4E7;">
					<div style="width: 50px; height: 50px; flex-shrink: 0;">
						%s
					</div>
					<div style="display: flex; flex-direction: column; align-items: flex-start; flex: 1 0 0;">
						<div style="color: #121F21; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 7px; font-style: normal; font-weight: 400; line-height: 7.5px; letter-spacing: -0.06px;">
							Escaneie para validar a autenticidade deste relatório, ou acesse <span style="color: #078398">app.bipc.org.br/validar</span> e envie este arquivo.
						</div>
					</div>
				</div>
				<div style="width: 150px; height: 40px;">
					%s
				</div>
			</div>
		</div>`, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"), formatted, assets.QRCode, assets.LogoColorFull),
		FooterTemplate: `
			<div style="width: 100%; display: flex; justify-content: center;">
				<div style="display: flex; padding: 1.5px 7.5px; align-items: center; border-bottom: 1.5px solid #187B8B">
					<div style="color: #187B8B; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 7px; font-style: normal; font-weight: 700; line-height: 7.5px; letter-spacing: -0.06px;">
						Página <span class="pageNumber"></span> de <span class="totalPages"></span>
					</div>
				</div>
			</div>`,
		MarginTop:    gson.Num(0.90),
		MarginBottom: gson.Num(0.45),
		MarginLeft:   gson.Num(0.15),
		MarginRight:  gson.Num(0.15),
	})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer reportPDF.Close()

	coverBytes, err := io.ReadAll(coverPDF)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	reportBytes, err := io.ReadAll(reportPDF)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	merged, err := mergePDFsInMemory(coverBytes, assets.PDF1A, reportBytes)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	signed := Sign(merged.Bytes(), []byte(app.config.reportSigningSecret))

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="relatorio.pdf"`)
	if _, err := w.Write(signed); err != nil {
		log.Println("erro ao enviar PDF:", err)
	}
}

func classificationLetter(y float64) string {
	if y <= 0.25 {
		return "A"
	}
	if y <= 0.50 {
		return "B"
	}
	if y <= 0.75 {
		return "C"
	}
	return "D"
}

var marker = []byte("\n%%SYS-SIG:")

const (
	maxSignedPDFSize = 20 << 20
)

func (app *application) validateReportHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxSignedPDFSize+1<<20)

	if err := r.ParseMultipartForm(1 << 20); err != nil {
		app.badRequestResponse(w, r, errors.New("o corpo deve ser um multipart/form-data válido"))
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		app.badRequestResponse(w, r, errors.New(`o campo "file" é obrigatório`))
		return
	}
	defer file.Close()

	signedPDF, err := io.ReadAll(io.LimitReader(file, maxSignedPDFSize+1))
	if err != nil {
		app.badRequestResponse(w, r, errors.New("não foi possível ler o arquivo PDF"))
		return
	}
	if len(signedPDF) > maxSignedPDFSize {
		app.badRequestResponse(w, r, fmt.Errorf("o arquivo PDF não pode ser maior que %d MiB", maxSignedPDFSize>>20))
		return
	}
	if !bytes.HasPrefix(signedPDF, []byte("%PDF-")) {
		app.badRequestResponse(w, r, errors.New("o arquivo enviado não é um PDF válido"))
		return
	}

	valid, err := Verify(signedPDF, []byte(app.config.reportSigningSecret))
	if err != nil {
		valid = false
	}

	if err := app.writeJSON(w, http.StatusOK, envelope{"valid": valid}, nil); err != nil {
		app.logError(r, err)
	}
}

func Sign(pdf []byte, key []byte) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write(pdf)
	sig := hex.EncodeToString(mac.Sum(nil))

	out := make([]byte, 0, len(pdf)+len(marker)+len(sig)+1)
	out = append(out, pdf...)
	out = append(out, marker...)
	out = append(out, sig...)
	out = append(out, '\n')
	return out
}

func Verify(signed []byte, key []byte) (bool, error) {
	idx := bytes.LastIndex(signed, marker)
	if idx < 0 {
		return false, errors.New("assinatura não encontrada")
	}
	pdf := signed[:idx]
	sigHex := bytes.TrimSpace(signed[idx+len(marker):])

	got, err := hex.DecodeString(string(sigHex))
	if err != nil {
		return false, err
	}

	mac := hmac.New(sha256.New, key)
	mac.Write(pdf)
	return hmac.Equal(got, mac.Sum(nil)), nil
}
