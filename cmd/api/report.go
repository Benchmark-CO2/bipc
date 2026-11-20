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
	"strings"
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

// buildGCPoints maps a ranked Material benchmark series into the "Impacto de
// CUM por tecnologia" scatter plot: x = CUM value (m³/m²), y = fraction of
// better projects, with the selected project highlighted.
func buildGCPoints(points []BenchmarkValue, selectedID uuid.UUID) []GCPonto {
	gc := make([]GCPonto, 0, len(points))
	for _, p := range points {
		gc = append(gc, GCPonto{
			X:        p.Value,
			Y:        p.Y,
			Destaque: p.ID == selectedID,
		})
	}
	return gc
}

// buildSBCLinhas builds the "Consumo total de energia por tecnologia" (energy)
// and "Total de Emissões por tecnologia" (co2) stacked-bar charts. Each line is
// a project unit; each series is a technology with its average consumption
// ((min+max)/2), matching the same values already computed for the project GET
// and the benchmark report.
func buildSBCLinhas(units []data.ProjectUnit, metric string) []SBCLinha {
	linhas := make([]SBCLinha, 0, len(units))
	for _, unit := range units {
		serie := make([]SBCSerie, 0, len(unit.Consumptions))
		for tech, cons := range unit.Consumptions {
			if tech == "total" {
				continue
			}
			var valor float64
			switch metric {
			case "energy":
				if cons.EnergyMin != nil && cons.EnergyMax != nil {
					valor = (*cons.EnergyMin + *cons.EnergyMax) / 2
				} else if cons.EnergyMax != nil {
					valor = *cons.EnergyMax
				}
			case "co2":
				if cons.CO2Min != nil && cons.CO2Max != nil {
					valor = (*cons.CO2Min + *cons.CO2Max) / 2
				} else if cons.CO2Max != nil {
					valor = *cons.CO2Max
				}
			}
			if valor <= 0 {
				continue
			}
			serie = append(serie, SBCSerie{Nome: technologyDisplayName(tech), Valor: math.Round(valor*100) / 100})
		}
		if len(serie) == 0 {
			continue
		}
		sort.Slice(serie, func(i, j int) bool {
			return serie[i].Valor > serie[j].Valor
		})
		linhas = append(linhas, SBCLinha{Nome: unit.Name, Series: serie})
	}
	return linhas
}

// buildUnits builds the "Composição e impacto de cada tecnologia por material"
// chart data: one entry per tower unit, each with one Tecnology per module type
// and one Material per material class. Values are average CO₂ ((min+max)/2)
// normalized per m² of the unit's floor area, matching the Kg CO₂/m² unit shown
// in the report; percentages reflect the share within each level.
func buildUnits(units []data.ProjectUnit, emissionsFor func(uuid.UUID) ([]data.ProjectMaterialEmissions, error)) ([]Unit, error) {
	result := make([]Unit, 0, len(units))
	for _, unit := range units {
		emissions, err := emissionsFor(unit.ID)
		if err != nil {
			return nil, err
		}
		if len(emissions) == 0 {
			continue
		}

		techs := aggregateMaterialEmissions(emissions)

		area := unit.Area
		if area <= 0 {
			area = 1
		}
		var unitTotal float64
		for _, agg := range techs {
			unitTotal += agg.total
		}

		tecnologies := make([]Tecnology, 0, len(techs))
		for _, agg := range techs {
			materials := make([]Material, 0, len(agg.byMat))
			for mat, kg := range agg.byMat {
				if kg <= 0 {
					continue
				}
				materials = append(materials, Material{
					Name:    mat,
					Value:   kg / area,
					Percent: kg / agg.total * 100,
				})
			}
			sort.Slice(materials, func(i, j int) bool {
				return materials[i].Value > materials[j].Value
			})
			percent := 0.0
			if unitTotal > 0 {
				percent = agg.total / unitTotal * 100
			}
			tecnologies = append(tecnologies, Tecnology{Name: agg.name, Percent: percent, Materials: materials})
		}
		sort.Slice(tecnologies, func(i, j int) bool {
			return tecnologies[i].Percent > tecnologies[j].Percent
		})

		result = append(result, Unit{Name: unit.Name, Tecnologies: tecnologies})
	}
	return result, nil
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
	"grout":    "Graute",
}

// technologyDisplayName returns the report display name for a module type,
// falling back to the raw storage key when unknown.
func technologyDisplayName(key string) string {
	if name, ok := moduleTypeDisplayNames[key]; ok && name != "" {
		return name
	}
	return key
}

// materialDisplayName returns the report display name for a material class,
// falling back to the raw storage key when unknown.
func materialDisplayName(key string) string {
	if name, ok := materialDisplayNames[key]; ok && name != "" {
		return name
	}
	return key
}

// resistanceDisplayNames maps the stored resistance category keys to their
// report display suffixes (PT-BR). Keys follow the storage format, e.g.
// "fck_25", "ca_CA50", "fak_14", "fbk_26", "fgk_30". Display matches the
// report layout: "FCK25", "CA50", "FAK14", "FBK26", "FGK30".
func resistanceDisplayName(key string) string {
	prefix, value, found := strings.Cut(key, "_")
	if !found {
		return key
	}
	switch prefix {
	case "fck":
		return "FCK" + value
	case "fgk":
		return "FGK" + value
	case "fak":
		return "FAK" + value
	case "fbk":
		return "FBK" + value
	case "ca":
		if strings.HasPrefix(value, "other_") {
			return "CA" + strings.TrimPrefix(value, "other_")
		}
		return value
	default:
		return key
	}
}

// materialTechAggregation aggregates embodied CO₂ rows by technology and
// material class, using the mean of the min/max bounds. It is shared by the
// charts that present a per-technology/per-material breakdown.
type materialTechAggregation struct {
	name  string
	byMat map[string]float64
	total float64
}

// aggregateMaterialEmissions groups emissions rows by technology (display name)
// and material class (display name), skipping rows without CO₂ data. The value
// stored is the average of the min/max bounds.
func aggregateMaterialEmissions(emissions []data.ProjectMaterialEmissions) map[string]*materialTechAggregation {
	techs := make(map[string]*materialTechAggregation)
	for _, e := range emissions {
		if e.CO2Min <= 0 && e.CO2Max <= 0 {
			continue
		}
		techName := technologyDisplayName(e.Technology)
		matName := materialDisplayName(e.Material)
		co2Avg := (e.CO2Min + e.CO2Max) / 2

		agg, ok := techs[techName]
		if !ok {
			agg = &materialTechAggregation{name: techName, byMat: make(map[string]float64)}
			techs[techName] = agg
		}
		agg.byMat[matName] += co2Avg
		agg.total += co2Avg
	}
	return techs
}

// buildGMCategorias groups the project-level emissions by technology and
// material into the stacked-bar data of the "Total de Emissões por tecnologia
// e material" chart. Kg uses the mean of the min/max bounds. Resistance
// categories are aggregated into their material class. Categories and their
// materials are ordered by Kg descending.
func buildGMCategorias(emissions []data.ProjectMaterialEmissions) []GMCategoria {
	categories := aggregateMaterialEmissions(emissions)

	gm := make([]GMCategoria, 0, len(categories))
	for _, agg := range categories {
		itens := make([]GMItem, 0, len(agg.byMat))
		for material, kg := range agg.byMat {
			if kg <= 0 {
				continue
			}
			itens = append(itens, GMItem{Material: material, Kg: kg})
		}
		sort.Slice(itens, func(i, j int) bool {
			return itens[i].Kg > itens[j].Kg
		})
		gm = append(gm, GMCategoria{Nome: agg.name, Itens: itens})
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

// buildTableCarbonEnergy renders the "Detalhamento do Carbono Embutido e da
// Energia por Tecnologia Construtiva e Material" table. The first group
// consolidates all technologies ("Geral"), followed by one group per technology
// (module type). Each group opens with a header row holding its totals, then
// one row per material class and resistance category. Values are normalized per
// m² of total tower area; the "prov" (most likely) column uses the mean of the
// min/max bounds; CUM is the material quantity per m².
func buildTableCarbonEnergy(emissions []data.ProjectMaterialEmissions, totalArea float64) []TableRow {
	type materialRow struct {
		row TableRow
	}
	type techAgg struct {
		display   string
		materials []materialRow
		total     TableRow
	}

	techs := make(map[string]*techAgg)
	var geral TableRow
	geralByKey := make(map[string]*materialRow)

	makeMaterialRow := func(e data.ProjectMaterialEmissions) TableRow {
		row := TableRow{
			Type:       "material",
			Name:       materialDisplayName(e.Material) + " " + resistanceDisplayName(e.Resistance),
			Co2Min:     e.CO2Min,
			Co2Max:     e.CO2Max,
			EnergyMin:  e.EnergyMin,
			EnergyMax:  e.EnergyMax,
			Cum:        e.Quantity,
		}
		row.Co2Prov = (row.Co2Min + row.Co2Max) / 2
		row.EnergyProv = (row.EnergyMin + row.EnergyMax) / 2
		return row
	}

	addRow := func(target *TableRow, row TableRow) {
		target.Co2Min += row.Co2Min
		target.Co2Max += row.Co2Max
		target.Co2Prov = (target.Co2Min + target.Co2Max) / 2
		target.EnergyMin += row.EnergyMin
		target.EnergyMax += row.EnergyMax
		target.EnergyProv = (target.EnergyMin + target.EnergyMax) / 2
		target.Cum += row.Cum
	}

	addMaterial := func(target *techAgg, e data.ProjectMaterialEmissions) {
		row := makeMaterialRow(e)
		target.materials = append(target.materials, materialRow{row: row})
		addRow(&target.total, row)
	}

	for _, e := range emissions {
		if e.CO2Min <= 0 && e.CO2Max <= 0 && e.EnergyMin <= 0 && e.EnergyMax <= 0 {
			continue
		}

		techName := technologyDisplayName(e.Technology)
		agg, ok := techs[techName]
		if !ok {
			agg = &techAgg{display: techName}
			techs[techName] = agg
		}
		addMaterial(agg, e)

		geral.Co2Min += e.CO2Min
		geral.Co2Max += e.CO2Max
		geral.EnergyMin += e.EnergyMin
		geral.EnergyMax += e.EnergyMax
		geral.Cum += e.Quantity

		matKey := e.Material + "\x00" + e.Resistance
		mr, ok := geralByKey[matKey]
		if !ok {
			row := makeMaterialRow(e)
			mr = &materialRow{row: row}
			geralByKey[matKey] = mr
		} else {
			addRow(&mr.row, makeMaterialRow(e))
		}
	}

	techList := make([]*techAgg, 0, len(techs))
	for _, agg := range techs {
		sort.Slice(agg.materials, func(i, j int) bool {
			return agg.materials[i].row.Co2Max > agg.materials[j].row.Co2Max
		})
		agg.total.Co2Prov = (agg.total.Co2Min + agg.total.Co2Max) / 2
		agg.total.EnergyProv = (agg.total.EnergyMin + agg.total.EnergyMax) / 2
		techList = append(techList, agg)
	}

	sort.Slice(techList, func(i, j int) bool {
		return techList[i].total.Co2Max > techList[j].total.Co2Max
	})

	rows := make([]TableRow, 0, len(techList)*2+2)
	geralHeader := geral
	geralHeader.Type = "tecnologia"
	geralHeader.Name = "Geral"
	geralHeader.Co2Prov = (geralHeader.Co2Min + geralHeader.Co2Max) / 2
	geralHeader.EnergyProv = (geralHeader.EnergyMin + geralHeader.EnergyMax) / 2
	rows = append(rows, geralHeader)

	geralMaterials := make([]materialRow, 0, len(geralByKey))
	for _, mr := range geralByKey {
		geralMaterials = append(geralMaterials, *mr)
	}
	sort.Slice(geralMaterials, func(i, j int) bool {
		return geralMaterials[i].row.Co2Max > geralMaterials[j].row.Co2Max
	})
	for _, m := range geralMaterials {
		rows = append(rows, m.row)
	}

	for _, agg := range techList {
		header := agg.total
		header.Type = "tecnologia"
		header.Name = agg.display
		rows = append(rows, header)
		for _, m := range agg.materials {
			rows = append(rows, m.row)
		}
	}

	area := totalArea
	if area <= 0 {
		area = 1
	}
	for i := range rows {
		rows[i].Co2Min /= area
		rows[i].Co2Prov /= area
		rows[i].Co2Max /= area
		rows[i].EnergyMin /= area
		rows[i].EnergyProv /= area
		rows[i].EnergyMax /= area
		rows[i].Cum /= area
	}

	return rows
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

	benchmarkProjects, err := app.models.Benchmark.GetProjectsBenchmark(data.GetProjectsBenchmarkFilters{})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	benchmarkSeries := separateProjectConsumption(benchmarkProjects)

	report, err := app.buildProjectBenchmarkReportWithSeries(projectID, benchmarkSeries)
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

	type benchmarkPair struct {
		points *[]BenchmarkValue
		value  float64
	}

	benchmarkPairs := []benchmarkPair{
		{&benchmarkSeries.CO2Min, report.Project.CO2.Min.Value},
		{&benchmarkSeries.CO2Max, report.Project.CO2.Max.Value},
		{&benchmarkSeries.EnergyMin, report.Project.Energy.Min.Value},
		{&benchmarkSeries.EnergyMax, report.Project.Energy.Max.Value},
	}
	for _, pair := range benchmarkPairs {
		*pair.points = addSelectedBenchmarkPoint(*pair.points, projectID, pair.value)
		calculateGiniRank(*pair.points)
	}
	co2Points := normalizeScreenshotBenchmarkPoints(benchmarkSeries.CO2Min, benchmarkSeries.CO2Max)
	energyPoints := normalizeScreenshotBenchmarkPoints(benchmarkSeries.EnergyMin, benchmarkSeries.EnergyMax)

	var projectCUM float64
	if totalConsumption, ok := project.Consumptions["total"]; ok && totalConsumption != nil && totalConsumption.Material != nil {
		projectCUM = *totalConsumption.Material
	}
	benchmarkSeries.Material = addSelectedBenchmarkPoint(
		benchmarkSeries.Material,
		projectID,
		projectCUM,
	)
	calculateGiniRank(benchmarkSeries.Material)
	gcPoints := buildGCPoints(benchmarkSeries.Material, projectID)

	projectCUMY := 0.0
	for _, point := range benchmarkSeries.Material {
		if point.ID == projectID {
			projectCUMY = point.Y
			break
		}
	}

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

		CumClass: classificationLetter(projectCUMY),
		CumTotal: len(benchmarkSeries.Material),

		UserModulesTable: buildUserModulesTable(project.UnknownModules),

		TableCarbonEnergy: buildTableCarbonEnergy(projectMaterialEmissions, totalUCArea),
		UnitsDetails:      []unitDetail{},
	}

	unitsData, err := buildUnits(project.Units, app.models.Modules.GetUnitMaterialEmissionsByTechnology)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	var jsonData = JSONData{
		Sources: sources,
		GM:      gm,
		GC:      gcPoints,
		SBC1:    buildSBCLinhas(project.Units, "energy"),
		SBC2:    buildSBCLinhas(project.Units, "co2"),
		CO2Chart:    co2Points,
		EnergyChart: energyPoints,
		SelectedIDs: []string{projectID.String()},
		Units:       unitsData,
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
