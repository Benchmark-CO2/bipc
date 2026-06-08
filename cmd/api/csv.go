package main

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/google/uuid" // Import uuid package
)

// convertCAToSteelMaterial converts a CA (resistance) value to SteelMaterial format
func convertCAToSteelMaterial(ca int, mass float64) modules.SteelMaterial {
	resistance, otherResistance := modules.ConvertCAToResistance(ca)
	material := "rebar"
	if ca == 190 {
		material = "strand"
	}

	return modules.SteelMaterial{
		Material:        material,
		Resistance:      resistance,
		OtherResistance: otherResistance,
		Mass:            mass,
	}
}

// normalizeCEP converts a raw CEP string to the expected format XXXXX-XXX.
// Accepts digits-only input (e.g. "45810000") and returns "45810-000".
// Already-formatted or nil values are returned unchanged.
func normalizeCEP(raw *string) *string {
	if raw == nil {
		return nil
	}
	digits := strings.ReplaceAll(*raw, "-", "")
	digits = strings.TrimSpace(digits)
	if len(digits) != 8 {
		return raw
	}
	formatted := digits[:5] + "-" + digits[5:]
	return &formatted
}

func normalizeLookupKey(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ToUpper(value)
	replacer := strings.NewReplacer(
		"Á", "A", "À", "A", "Â", "A", "Ã", "A", "Ä", "A",
		"É", "E", "È", "E", "Ê", "E", "Ë", "E",
		"Í", "I", "Ì", "I", "Î", "I", "Ï", "I",
		"Ó", "O", "Ò", "O", "Ô", "O", "Õ", "O", "Ö", "O",
		"Ú", "U", "Ù", "U", "Û", "U", "Ü", "U",
		"Ç", "C",
	)
	value = replacer.Replace(value)
	value = strings.NewReplacer(" ", "", "-", "", ".", "", "_", "", "/", "").Replace(value)
	return value
}

var brazilianStateCodes = map[string]string{
	"AC": "AC", "ACRE": "AC",
	"AL": "AL", "ALAGOAS": "AL",
	"AP": "AP", "AMAPA": "AP",
	"AM": "AM", "AMAZONAS": "AM",
	"BA": "BA", "BAHIA": "BA",
	"CE": "CE", "CEARA": "CE",
	"DF": "DF", "DISTRITOFEDERAL": "DF",
	"ES": "ES", "ESPIRITOSANTO": "ES",
	"GO": "GO", "GOIAS": "GO",
	"MA": "MA", "MARANHAO": "MA",
	"MT": "MT", "MATOGROSSO": "MT",
	"MS": "MS", "MATOGROSSODOSUL": "MS",
	"MG": "MG", "MINASGERAIS": "MG",
	"PA": "PA", "PARA": "PA",
	"PB": "PB", "PARAIBA": "PB",
	"PR": "PR", "PARANA": "PR",
	"PE": "PE", "PERNAMBUCO": "PE",
	"PI": "PI", "PIAUI": "PI",
	"RJ": "RJ", "RIODEJANEIRO": "RJ",
	"RN": "RN", "RIOGRANDEDONORTE": "RN",
	"RS": "RS", "RIOGRANDEDOSUL": "RS",
	"RO": "RO", "RONDONIA": "RO",
	"RR": "RR", "RORAIMA": "RR",
	"SC": "SC", "SANTACATARINA": "SC",
	"SP": "SP", "SAOPAULO": "SP",
	"SE": "SE", "SERGIPE": "SE",
	"TO": "TO", "TOCANTINS": "TO",
}

func normalizeBrazilianState(raw string) string {
	key := normalizeLookupKey(raw)
	if state, ok := brazilianStateCodes[key]; ok {
		return state
	}

	return strings.ToUpper(strings.TrimSpace(raw))
}

func normalizeProjectPhase(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "not_defined"
	}

	return raw
}

// Define base required headers (common to all module types)
var baseRequiredHeaders = []string{
	"project_name",
	"project_cep",
	"project_state",
	"project_city",
	"project_neighborhood",
	"project_street",
	"project_number",
	"project_phase",

	"unit_name",

	"floor_name",
	"floor_area",
	"floor_category",
	"floor_height",
	"floor_repetition",
}

// Module-specific required headers for concrete_wall
var concreteWallHeaders = []string{
	"module_wall_thickness",
	"module_slab_thickness",
	"module_wall_area",
	"module_slab_area",
	"module_wall_form_area",
	"module_slab_form_area",
	"module_stair_form_area",
	"module_general_form_area",

	"module_wall_concrete_20",
	"module_wall_concrete_25",
	"module_wall_concrete_30",
	"module_wall_concrete_35",
	"module_wall_concrete_40",
	"module_wall_concrete_45",

	"module_slab_concrete_20",
	"module_slab_concrete_25",
	"module_slab_concrete_30",
	"module_slab_concrete_35",
	"module_slab_concrete_40",
	"module_slab_concrete_45",

	"module_wall_steel_50",
	"module_wall_steel_60",

	"module_slab_steel_50",
	"module_slab_steel_60",
}

// Module-specific required headers for structural_masonry
var structuralMasonryHeaders = []string{
	// Concrete elements (columns, beams, slabs)
	"module_column_concrete_20",
	"module_column_concrete_25",
	"module_column_concrete_30",
	"module_column_concrete_35",
	"module_column_concrete_40",
	"module_column_concrete_45",

	"module_beam_concrete_20",
	"module_beam_concrete_25",
	"module_beam_concrete_30",
	"module_beam_concrete_35",
	"module_beam_concrete_40",
	"module_beam_concrete_45",

	"module_slab_concrete_20",
	"module_slab_concrete_25",
	"module_slab_concrete_30",
	"module_slab_concrete_35",
	"module_slab_concrete_40",
	"module_slab_concrete_45",

	"module_column_steel_50",
	"module_column_steel_60",

	"module_beam_steel_50",
	"module_beam_steel_60",

	"module_slab_steel_50",
	"module_slab_steel_60",

	// Masonry elements
	"module_grout_vertical_15",
	"module_grout_vertical_20",
	"module_grout_vertical_25",
	"module_grout_vertical_30",
	"module_grout_vertical_35",
	"module_grout_vertical_40",
	"module_grout_vertical_45",
	"module_grout_vertical_50",

	"module_grout_horizontal_15",
	"module_grout_horizontal_20",
	"module_grout_horizontal_25",
	"module_grout_horizontal_30",
	"module_grout_horizontal_35",
	"module_grout_horizontal_40",
	"module_grout_horizontal_45",
	"module_grout_horizontal_50",

	"module_grout_general_15",
	"module_grout_general_20",
	"module_grout_general_25",
	"module_grout_general_30",
	"module_grout_general_35",
	"module_grout_general_40",
	"module_grout_general_45",
	"module_grout_general_50",

	"module_grout_vertical_steel_50",
	"module_grout_vertical_steel_60",

	"module_grout_horizontal_steel_50",
	"module_grout_horizontal_steel_60",

	"module_grout_general_steel_50",
	"module_grout_general_steel_60",

	"module_mortar_fak",
	"module_mortar_volume",

	// Blocks - one FBK for all blocks, and one column per block type for quantity
	"module_block_fbk",

	// Family 15x30
	"module_block_inteiro_14x19x29",
	"module_block_meio_14x19x14",
	"module_block_amarracao_t_14x19x44",
	"module_block_canaleta_inteira_14x19x29",
	"module_block_meia_canaleta_14x19x14",

	// Family 15x40
	"module_block_inteiro_14x19x39",
	"module_block_meio_14x19x19",
	"module_block_amarracao_t_14x19x54",
	"module_block_amarracao_l_14x19x34",
	"module_block_canaleta_inteira_14x19x39",
	"module_block_canaleta_amarracao_14x19x34",
	"module_block_meia_canaleta_14x19x19",
	"module_block_compensador_1_4_14x19x9",
	"module_block_compensador_1_8_14x19x4",

	// Family 20x40
	"module_block_inteiro_19x19x39",
	"module_block_meio_19x19x19",
	"module_block_canaleta_inteira_19x19x39",
	"module_block_meia_canaleta_19x19x19",
	"module_block_compensador_1_4_19x19x9",
	"module_block_compensador_1_8_19x19x4",

	"module_column_form_area",
	"module_beam_form_area",
	"module_slab_form_area",
	"module_stair_form_area",
	"module_general_form_area",
}

// Module-specific required headers for beam_column
var beamColumnHeaders = []string{
	"module_column_concrete_20",
	"module_column_concrete_25",
	"module_column_concrete_30",
	"module_column_concrete_35",
	"module_column_concrete_40",
	"module_column_concrete_45",

	"module_beam_concrete_20",
	"module_beam_concrete_25",
	"module_beam_concrete_30",
	"module_beam_concrete_35",
	"module_beam_concrete_40",
	"module_beam_concrete_45",

	"module_slab_concrete_20",
	"module_slab_concrete_25",
	"module_slab_concrete_30",
	"module_slab_concrete_35",
	"module_slab_concrete_40",
	"module_slab_concrete_45",

	"module_column_steel_50",
	"module_column_steel_60",

	"module_beam_steel_50",
	"module_beam_steel_60",

	"module_slab_steel_50",
	"module_slab_steel_60",

	"module_column_form_area",
	"module_beam_form_area",
	"module_slab_form_area",
	"module_stair_form_area",
	"module_general_form_area",
}

// getRequiredHeaders returns the required headers for a given module type
func getRequiredHeaders(moduleType string) []string {
	headers := make([]string, len(baseRequiredHeaders))
	copy(headers, baseRequiredHeaders)

	switch moduleType {
	case "concrete_wall":
		headers = append(headers, concreteWallHeaders...)
	case "structural_masonry":
		headers = append(headers, structuralMasonryHeaders...)
	case "beam_column":
		headers = append(headers, beamColumnHeaders...)
	}

	return headers
}

// CSVRowData is an interface for all CSV row types
type CSVRowData interface {
	GetProjectName() string
	GetBaseData() BaseCSVRowData
}

// BaseCSVRowData holds common data for all module types
type BaseCSVRowData struct {
	// Project fields
	ProjectName         string  `json:"project_name,omitempty"`
	ProjectCEP          *string `json:"project_cep,omitempty"`
	ProjectState        string  `json:"project_state,omitempty"`
	ProjectCity         string  `json:"project_city,omitempty"`
	ProjectNeighborhood *string `json:"project_neighborhood,omitempty"`
	ProjectStreet       *string `json:"project_street,omitempty"`
	ProjectNumber       *string `json:"project_number,omitempty"`
	ProjectPhase        string  `json:"project_phase,omitempty"`

	// Unit fields
	UnitName              string `json:"unit_name,omitempty"`
	UnitRepetitionCount   int    `json:"unit_repetition_count,omitempty"`
	UnitHousingUnitsCount *int   `json:"unit_housing_units_count,omitempty"`

	// Floor fields
	FloorName       string  `json:"floor_name,omitempty"`
	FloorArea       float64 `json:"floor_area,omitempty"`
	FloorCategory   string  `json:"floor_category,omitempty"`
	FloorHeight     float64 `json:"floor_height,omitempty"`
	FloorRepetition int     `json:"floor_repetition,omitempty"`
}

// ConcreteWallCSVRow holds data specific to concrete wall modules
type ConcreteWallCSVRow struct {
	BaseCSVRowData
	ModuleWallThickness float64                      `json:"module_wall_thickness,omitempty"`
	ModuleSlabThickness float64                      `json:"module_slab_thickness,omitempty"`
	ModuleWallArea      float64                      `json:"module_wall_area,omitempty"`
	ModuleSlabArea      float64                      `json:"module_slab_area,omitempty"`
	ModuleWallFormArea  float64                      `json:"module_wall_form_area,omitempty"`
	ModuleSlabFormArea  float64                      `json:"module_slab_form_area,omitempty"`
	SlabType            *string                      `json:"slab_type,omitempty"`
	Concrete            []modules.ConcreteVolumeItem `json:"concrete"`
	Steel               []modules.SteelMaterial      `json:"steel"`
	Form                []modules.FormAreaItem       `json:"form"`
}

func (r ConcreteWallCSVRow) GetProjectName() string      { return r.ProjectName }
func (r ConcreteWallCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

// StructuralMasonryCSVRow holds data specific to structural masonry modules
type StructuralMasonryCSVRow struct {
	BaseCSVRowData
	ModuleFormColumns *float64                     `json:"module_form_columns,omitempty"`
	ModuleFormBeams   *float64                     `json:"module_form_beams,omitempty"`
	ModuleFormSlabs   *float64                     `json:"module_form_slabs,omitempty"`
	ModuleFormTotal   *float64                     `json:"module_form_total,omitempty"`
	ModuleBlockFbk    float64                      `json:"module_block_fbk,omitempty"`
	SlabType          *string                      `json:"slab_type,omitempty"`
	Blocks            []modules.BlockInfo          `json:"blocks,omitempty"`
	Concrete          []modules.ConcreteVolumeItem `json:"concrete"`
	Steel             []modules.SteelMaterial      `json:"steel"`
	Form              []modules.FormAreaItem       `json:"form"`
	GroutVertical     modules.GroutInfo            `json:"grout_vertical"`
	GroutHorizontal   modules.GroutInfo            `json:"grout_horizontal"`
	GroutGeneral      modules.GroutInfo            `json:"grout_general"`
	Mortar            []modules.MortarItem         `json:"mortar"`
}

func (r StructuralMasonryCSVRow) GetProjectName() string      { return r.ProjectName }
func (r StructuralMasonryCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

// BeamColumnCSVRow holds data specific to beam column modules
type BeamColumnCSVRow struct {
	BaseCSVRowData
	ModuleFormColumns *float64                     `json:"module_form_columns,omitempty"`
	ModuleFormBeams   *float64                     `json:"module_form_beams,omitempty"`
	ModuleFormSlabs   *float64                     `json:"module_form_slabs,omitempty"`
	ModuleFormTotal   *float64                     `json:"module_form_total,omitempty"`
	SlabType          *string                      `json:"slab_type,omitempty"`
	Concrete          []modules.ConcreteVolumeItem `json:"concrete"`
	Steel             []modules.SteelMaterial      `json:"steel"`
	Form              []modules.FormAreaItem       `json:"form"`
}

func (r BeamColumnCSVRow) GetProjectName() string      { return r.ProjectName }
func (r BeamColumnCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

type ProjectFromCSV struct {
	Project data.Project     `json:"project"`
	Unit    data.Unit        `json:"unit"`
	Option  data.Option      `json:"option"`
	Modules []modules.Module `json:"modules"`
}

// csvParseError represents a data error in the CSV content (user input), distinct
// from internal failures. Returning this type causes the handler to respond 422.
type csvParseError struct {
	message string
}

func (e *csvParseError) Error() string { return e.message }

type csvProjectResult struct {
	ProjectName string            `json:"project"`
	Status      string            `json:"status"`
	Errors      map[string]string `json:"errors,omitempty"`
}

// parseFloat is a helper to parse string to float64, handling comma as decimal separator.
func parseFloat(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	s = strings.Replace(s, ",", ".", -1)
	return strconv.ParseFloat(s, 64)
}

// parseInt is a helper to parse string to int.
func parseInt(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	return strconv.Atoi(s)
}

func parseBlockQuantity(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}

	if commaIndex := strings.Index(s, ","); commaIndex >= 0 {
		s = strings.TrimSpace(s[:commaIndex])
	}

	if s == "" {
		return 0, nil
	}

	return strconv.Atoi(s)
}

func normalizeModuleSlabType(raw *string) *string {
	if raw == nil {
		return nil
	}

	normalized := strings.TrimSpace(*raw)
	if normalized == "" {
		return nil
	}

	if normalized == "0" {
		return nil
	}

	return &normalized
}

// rowParser provides typed field access for a single CSV record, centralising
// the repetitive "find index → parse → warn on error" logic that was previously
// duplicated as inline closures inside each generator function.
type rowParser struct {
	record    []string
	headerMap map[string]int
	rowNum    int // 1-based, used in log messages
	warnf     func(msg string, args ...any)
}

func (p rowParser) str(field string) string {
	idx, ok := p.headerMap[field]
	if !ok || idx >= len(p.record) {
		return ""
	}
	return strings.TrimSpace(p.record[idx])
}

func (p rowParser) optStr(field string) *string {
	s := p.str(field)
	if s == "" {
		return nil
	}
	return &s
}

func (p rowParser) float(field string) float64 {
	idx, ok := p.headerMap[field]
	if !ok || idx >= len(p.record) {
		return 0
	}
	val, err := parseFloat(p.record[idx])
	if err != nil {
		p.warnf("Could not parse float", "field", field, "row", p.rowNum, "error", err)
	}
	return val
}

func (p rowParser) optFloat(field string) *float64 {
	idx, ok := p.headerMap[field]
	if !ok || idx >= len(p.record) {
		return nil
	}
	val, err := parseFloat(p.record[idx])
	if err != nil || val == 0 {
		return nil
	}
	return &val
}

// firstOptFloat returns the first non-zero float found among candidate fields.
// Useful to keep backward compatibility while preferring standardized headers.
func (p rowParser) firstOptFloat(fields ...string) *float64 {
	for _, field := range fields {
		if val := p.optFloat(field); val != nil {
			return val
		}
	}

	return nil
}

func (p rowParser) integer(field string) int {
	idx, ok := p.headerMap[field]
	if !ok || idx >= len(p.record) {
		return 0
	}
	val, err := parseInt(p.record[idx])
	if err != nil {
		p.warnf("Could not parse int", "field", field, "row", p.rowNum, "error", err)
	}
	return val
}

func (p rowParser) optInt(field string) *int {
	idx, ok := p.headerMap[field]
	if !ok || idx >= len(p.record) {
		return nil
	}
	valStr := strings.TrimSpace(p.record[idx])
	if valStr == "" {
		return nil
	}
	val, err := parseInt(valStr)
	if err != nil || val <= 0 {
		return nil
	}
	return &val
}

func parseFloorHeight(p rowParser) float64 {
	raw := p.str("floor_height")
	if raw == "" || raw == "0" {
		return 2.8
	}

	val, err := parseFloat(raw)
	if err != nil {
		p.warnf("Could not parse float", "field", "floor_height", "row", p.rowNum, "error", err)
		return 0
	}

	return val
}

// parseBaseCSVRowData builds the BaseCSVRowData shared by all CSV row types.
func parseBaseCSVRowData(p rowParser) BaseCSVRowData {
	return BaseCSVRowData{
		ProjectName:           p.str("project_name"),
		ProjectCEP:            normalizeCEP(p.optStr("project_cep")),
		ProjectState:          normalizeBrazilianState(p.str("project_state")),
		ProjectCity:           p.str("project_city"),
		ProjectNeighborhood:   p.optStr("project_neighborhood"),
		ProjectStreet:         p.optStr("project_street"),
		ProjectNumber:         p.optStr("project_number"),
		ProjectPhase:          normalizeProjectPhase(p.str("project_phase")),
		UnitName:              p.str("unit_name"),
		UnitRepetitionCount:   p.integer("unit_repetition_count"),
		UnitHousingUnitsCount: p.optInt("unit_housing_units_count"),
		FloorName:             p.str("floor_name"),
		FloorArea:             p.float("floor_area"),
		FloorCategory:         p.str("floor_category"),
		FloorHeight:           parseFloorHeight(p),
		FloorRepetition:       p.integer("floor_repetition"),
	}
}

// parseConcreteAndSteelByPosition scans all headers for the given concrete/steel prefix pair
// and appends positioned items to the provided slices. Both prefixes must include the trailing underscore.
func parseConcreteAndSteelByPosition(
	p rowParser,
	concretePrefix, steelPrefix string,
	position modules.ElementPosition,
	concrete []modules.ConcreteVolumeItem,
	steel []modules.SteelMaterial,
) ([]modules.ConcreteVolumeItem, []modules.SteelMaterial) {
	for h := range p.headerMap {
		if strings.HasPrefix(h, concretePrefix) {
			fck, _ := strconv.Atoi(strings.TrimPrefix(h, concretePrefix))
			if fck > 0 {
				if v := p.float(h); v > 0 {
					concrete = append(concrete, modules.ConcreteVolumeItem{Fck: fck, Volume: v, Position: position})
				}
			}
		} else if strings.HasPrefix(h, steelPrefix) {
			ca, _ := strconv.Atoi(strings.TrimPrefix(h, steelPrefix))
			if ca > 0 {
				if m := p.float(h); m > 0 {
					sm := convertCAToSteelMaterial(ca, m)
					sm.Position = position
					steel = append(steel, sm)
				}
			}
		}
	}
	return concrete, steel
}

type concreteSteelGroup struct {
	concretePrefix string
	steelPrefix    string
	position       modules.ElementPosition
}

type formAreaGroup struct {
	fieldAliases []string
	position     modules.ElementPosition
}

func parseConcreteAndSteelByGroups(
	p rowParser,
	groups []concreteSteelGroup,
) ([]modules.ConcreteVolumeItem, []modules.SteelMaterial) {
	var concrete []modules.ConcreteVolumeItem
	var steel []modules.SteelMaterial

	for _, group := range groups {
		concrete, steel = parseConcreteAndSteelByPosition(
			p,
			group.concretePrefix,
			group.steelPrefix,
			group.position,
			concrete,
			steel,
		)
	}

	return concrete, steel
}

func parseFormByGroups(
	p rowParser,
	groups []formAreaGroup,
) []modules.FormAreaItem {
	form := make([]modules.FormAreaItem, 0, len(groups))

	for _, group := range groups {
		for _, field := range group.fieldAliases {
			area := p.float(field)
			if area <= 0 {
				continue
			}

			form = append(form, modules.FormAreaItem{Area: area, Position: group.position})
			break
		}
	}

	return form
}

// parseGroutGroup scans headers for the given volume/steel prefix pair and builds
// a GroutInfo. steelPrefix is checked first because it is more specific (longer)
// and shares the same leading substring as volumePrefix.
func parseGroutGroup(p rowParser, volumePrefix, steelPrefix string) modules.GroutInfo {
	g := modules.GroutInfo{
		Volumes: []modules.GroutVolumeItem{},
		Steel:   []modules.SteelMaterial{},
	}
	for h := range p.headerMap {
		if strings.HasPrefix(h, steelPrefix) {
			ca, _ := strconv.Atoi(strings.TrimPrefix(h, steelPrefix))
			if ca > 0 {
				if m := p.float(h); m > 0 {
					g.Steel = append(g.Steel, convertCAToSteelMaterial(ca, m))
				}
			}
		} else if strings.HasPrefix(h, volumePrefix) {
			fgk, _ := strconv.Atoi(strings.TrimPrefix(h, volumePrefix))
			if fgk > 0 {
				if v := p.float(h); v > 0 {
					g.Volumes = append(g.Volumes, modules.GroutVolumeItem{Fgk: fgk, Volume: v})
				}
			}
		}
	}
	return g
}

// blockTypeMap maps CSV column names to the human-readable block type strings
// expected by the domain model.
var blockTypeMap = map[string]string{
	"module_block_inteiro_14x19x29":            "inteiro (14x19x29)",
	"module_block_meio_14x19x14":               "meio (14x19x14)",
	"module_block_amarracao_t_14x19x44":        "amarração T (14x19x44)",
	"module_block_canaleta_inteira_14x19x29":   "canaleta inteira (14x19x29)",
	"module_block_meia_canaleta_14x19x14":      "meia canaleta (14x19x14)",
	"module_block_inteiro_14x19x39":            "inteiro (14x19x39)",
	"module_block_meio_14x19x19":               "meio (14x19x19)",
	"module_block_amarracao_t_14x19x54":        "amarração T (14x19x54)",
	"module_block_amarracao_l_14x19x34":        "amarração L (14x19x34)",
	"module_block_canaleta_inteira_14x19x39":   "canaleta  inteira (14x19x39)",
	"module_block_canaleta_amarracao_14x19x34": "canaleta de amarração (14x19x34)",
	"module_block_meia_canaleta_14x19x19":      "meia canaleta (14x19x19)",
	"module_block_compensador_1_4_14x19x9":     "compensador 1/4 (14x19x9)",
	"module_block_compensador_1_8_14x19x4":     "compensador 1/8 (14x19x4)",
	"module_block_inteiro_19x19x39":            "inteiro (19x19x39)",
	"module_block_meio_19x19x19":               "meio (19x19x19)",
	"module_block_canaleta_inteira_19x19x39":   "canaleta inteira (19x19x39)",
	"module_block_meia_canaleta_19x19x19":      "meia canaleta (19x19x19)",
	"module_block_compensador_1_4_19x19x9":     "compensador 1/4 (19x19x9)",
	"module_block_compensador_1_8_19x19x4":     "compensador 1/8 (19x19x4)",
}

func (app *application) generateConcreteWallRows(dataRows [][]string, headerMap map[string]int) []ConcreteWallCSVRow {
	rows := make([]ConcreteWallCSVRow, len(dataRows))
	for i, record := range dataRows {
		p := rowParser{record: record, headerMap: headerMap, rowNum: i + 2, warnf: app.logger.Warn}

		concrete, steel := parseConcreteAndSteelByGroups(p, []concreteSteelGroup{
			{concretePrefix: "module_wall_concrete_", steelPrefix: "module_wall_steel_", position: modules.ElementPositionWall},
			{concretePrefix: "module_slab_concrete_", steelPrefix: "module_slab_steel_", position: modules.ElementPositionSlab},
			{concretePrefix: "module_stair_concrete_", steelPrefix: "module_stair_steel_", position: modules.ElementPositionStair},
			{concretePrefix: "module_general_concrete_", steelPrefix: "module_general_steel_", position: ""},
		})
		form := parseFormByGroups(p, []formAreaGroup{
			{fieldAliases: []string{"module_wall_form_area"}, position: modules.ElementPositionWall},
			{fieldAliases: []string{"module_slab_form_area"}, position: modules.ElementPositionSlab},
			{fieldAliases: []string{"module_stair_form_area", "module_form_stairs"}, position: modules.ElementPositionStair},
			{fieldAliases: []string{"module_general_form_area", "module_form_general", "module_structure_formwork"}, position: ""},
		})

		rows[i] = ConcreteWallCSVRow{
			BaseCSVRowData:      parseBaseCSVRowData(p),
			ModuleWallThickness: p.float("module_wall_thickness"),
			ModuleSlabThickness: p.float("module_slab_thickness"),
			ModuleWallArea:      p.float("module_wall_area"),
			ModuleSlabArea:      p.float("module_slab_area"),
			ModuleWallFormArea:  p.float("module_wall_form_area"),
			ModuleSlabFormArea:  p.float("module_slab_form_area"),
			SlabType:            normalizeModuleSlabType(p.optStr("module_slab_type")),
			Concrete:            concrete,
			Steel:               steel,
			Form:                form,
		}
	}
	return rows
}

func (app *application) generateStructuralMasonryRows(dataRows [][]string, headerMap map[string]int) []StructuralMasonryCSVRow {
	rows := make([]StructuralMasonryCSVRow, len(dataRows))
	for i, record := range dataRows {
		p := rowParser{record: record, headerMap: headerMap, rowNum: i + 2, warnf: app.logger.Warn}

		fbk := modules.NormalizeBlockFbkToFirstSupportedAbove(p.float("module_block_fbk"))
		var blocks []modules.BlockInfo
		for colName, blockType := range blockTypeMap {
			if qtyIdx, ok := headerMap[colName]; ok && qtyIdx < len(record) {
				qty, _ := parseBlockQuantity(record[qtyIdx])
				if qty > 0 && fbk > 0 {
					blocks = append(blocks, modules.BlockInfo{Type: blockType, Fbk: fbk, Quantity: qty})
				}
			}
		}

		var mortar []modules.MortarItem
		if fak := modules.NormalizeMortarFakToFirstSupportedAbove(p.float("module_mortar_fak")); fak > 0 {
			if vol := p.float("module_mortar_volume"); vol > 0 {
				mortar = append(mortar, modules.MortarItem{Fak: fak, Volume: vol})
			}
		}

		concrete, steel := parseConcreteAndSteelByGroups(p, []concreteSteelGroup{
			{concretePrefix: "module_column_concrete_", steelPrefix: "module_column_steel_", position: modules.ElementPositionColumn},
			{concretePrefix: "module_beam_concrete_", steelPrefix: "module_beam_steel_", position: modules.ElementPositionBeam},
			{concretePrefix: "module_slab_concrete_", steelPrefix: "module_slab_steel_", position: modules.ElementPositionSlab},
			{concretePrefix: "module_stair_concrete_", steelPrefix: "module_stair_steel_", position: modules.ElementPositionStair},
			{concretePrefix: "module_general_concrete_", steelPrefix: "module_general_steel_", position: ""},
		})
		form := parseFormByGroups(p, []formAreaGroup{
			{fieldAliases: []string{"module_column_form_area", "module_form_columns"}, position: modules.ElementPositionColumn},
			{fieldAliases: []string{"module_beam_form_area", "module_form_beams"}, position: modules.ElementPositionBeam},
			{fieldAliases: []string{"module_slab_form_area", "module_form_slabs"}, position: modules.ElementPositionSlab},
			{fieldAliases: []string{"module_stair_form_area", "module_form_stairs"}, position: modules.ElementPositionStair},
			{fieldAliases: []string{"module_general_form_area", "module_form_general", "module_form_total"}, position: ""},
		})

		rows[i] = StructuralMasonryCSVRow{
			BaseCSVRowData:    parseBaseCSVRowData(p),
			ModuleFormColumns: p.firstOptFloat("module_column_form_area", "module_form_columns"),
			ModuleFormBeams:   p.firstOptFloat("module_beam_form_area", "module_form_beams"),
			ModuleFormSlabs:   p.firstOptFloat("module_slab_form_area", "module_form_slabs"),
			ModuleFormTotal:   p.firstOptFloat("module_general_form_area", "module_form_general", "module_form_total"),
			ModuleBlockFbk:    fbk,
			SlabType:          normalizeModuleSlabType(p.optStr("module_slab_type")),
			Blocks:            blocks,
			Concrete:          concrete,
			Steel:             steel,
			Form:              form,
			GroutVertical:     parseGroutGroup(p, "module_grout_vertical_", "module_grout_vertical_steel_"),
			GroutHorizontal:   parseGroutGroup(p, "module_grout_horizontal_", "module_grout_horizontal_steel_"),
			GroutGeneral:      parseGroutGroup(p, "module_grout_general_", "module_grout_general_steel_"),
			Mortar:            mortar,
		}
	}
	return rows
}

func (app *application) generateBeamColumnRows(dataRows [][]string, headerMap map[string]int) []BeamColumnCSVRow {
	rows := make([]BeamColumnCSVRow, len(dataRows))
	for i, record := range dataRows {
		p := rowParser{record: record, headerMap: headerMap, rowNum: i + 2, warnf: app.logger.Warn}
		concrete, steel := parseConcreteAndSteelByGroups(p, []concreteSteelGroup{
			{concretePrefix: "module_column_concrete_", steelPrefix: "module_column_steel_", position: modules.ElementPositionColumn},
			{concretePrefix: "module_beam_concrete_", steelPrefix: "module_beam_steel_", position: modules.ElementPositionBeam},
			{concretePrefix: "module_slab_concrete_", steelPrefix: "module_slab_steel_", position: modules.ElementPositionSlab},
			{concretePrefix: "module_stair_concrete_", steelPrefix: "module_stair_steel_", position: modules.ElementPositionStair},
			{concretePrefix: "module_general_concrete_", steelPrefix: "module_general_steel_", position: ""},
		})
		form := parseFormByGroups(p, []formAreaGroup{
			{fieldAliases: []string{"module_column_form_area", "module_form_columns"}, position: modules.ElementPositionColumn},
			{fieldAliases: []string{"module_beam_form_area", "module_form_beams"}, position: modules.ElementPositionBeam},
			{fieldAliases: []string{"module_slab_form_area", "module_form_slabs"}, position: modules.ElementPositionSlab},
			{fieldAliases: []string{"module_stair_form_area", "module_form_stairs"}, position: modules.ElementPositionStair},
			{fieldAliases: []string{"module_general_form_area", "module_form_general", "module_form_total"}, position: ""},
		})

		rows[i] = BeamColumnCSVRow{
			BaseCSVRowData:    parseBaseCSVRowData(p),
			ModuleFormColumns: p.firstOptFloat("module_column_form_area", "module_form_columns"),
			ModuleFormBeams:   p.firstOptFloat("module_beam_form_area", "module_form_beams"),
			ModuleFormSlabs:   p.firstOptFloat("module_slab_form_area", "module_form_slabs"),
			ModuleFormTotal:   p.firstOptFloat("module_general_form_area", "module_form_general", "module_form_total"),
			SlabType:          normalizeModuleSlabType(p.optStr("module_slab_type")),
			Concrete:          concrete,
			Steel:             steel,
			Form:              form,
		}
	}
	return rows
}

// hasDataConcreteWall reports whether a ConcreteWallCSVRow has any module data.
func hasDataConcreteWall(row ConcreteWallCSVRow) bool {
	return len(row.Concrete) > 0 || len(row.Steel) > 0 || len(row.Form) > 0
}

// hasDataStructuralMasonry reports whether a StructuralMasonryCSVRow has any module data.
func hasDataStructuralMasonry(row StructuralMasonryCSVRow) bool {
	return len(row.Concrete) > 0 ||
		len(row.Steel) > 0 ||
		len(row.Form) > 0 ||
		len(row.GroutVertical.Volumes) > 0 ||
		len(row.GroutVertical.Steel) > 0 ||
		len(row.GroutHorizontal.Volumes) > 0 ||
		len(row.GroutHorizontal.Steel) > 0 ||
		len(row.GroutGeneral.Volumes) > 0 ||
		len(row.GroutGeneral.Steel) > 0 ||
		len(row.Mortar) > 0 ||
		len(row.Blocks) > 0
}

// hasDataBeamColumn reports whether a BeamColumnCSVRow has any module data.
func hasDataBeamColumn(row BeamColumnCSVRow) bool {
	return len(row.Concrete) > 0 || len(row.Steel) > 0 || len(row.Form) > 0
}

// generateAutoRows executes all three generators with their respective normalised
// header maps and returns one CSVRowData per raw CSV row. The type emitted is
// determined by which column group has data. Context rows (no data in any type)
// are emitted as ConcreteWallCSVRow so that project/unit/floor context is still
// registered in the downstream consumer.
func (app *application) generateAutoRows(dataRows [][]string, headerMap map[string]int) []CSVRowData {
	cwMap := normalizeHeaderMapForModuleType(headerMap, "concrete_wall")
	smMap := normalizeHeaderMapForModuleType(headerMap, "structural_masonry")
	bcMap := normalizeHeaderMapForModuleType(headerMap, "beam_column")

	cwRows := app.generateConcreteWallRows(dataRows, cwMap)
	smRows := app.generateStructuralMasonryRows(dataRows, smMap)
	bcRows := app.generateBeamColumnRows(dataRows, bcMap)

	result := make([]CSVRowData, len(dataRows))
	for i := range dataRows {
		switch {
		case hasDataConcreteWall(cwRows[i]):
			result[i] = cwRows[i]
		case hasDataStructuralMasonry(smRows[i]):
			result[i] = smRows[i]
		case hasDataBeamColumn(bcRows[i]):
			result[i] = bcRows[i]
		default:
			// Context row: carries project/unit/floor fields but has no module data.
			result[i] = cwRows[i]
		}
	}
	return result
}

func toProjectsFromCSVData(rows []CSVRowData, userID uuid.UUID) ([]ProjectFromCSV, map[string]string, error) {
	projects := []ProjectFromCSV{}
	var currentProjectFormCSV *ProjectFromCSV
	contextToLastFloorIDs := make(map[string][]uuid.UUID)
	projectByName := make(map[string]data.Project)
	parseErrors := make(map[string]string)
	skippedProjects := make(map[string]bool)

	skipCurrentProject := func(projectName, key, msg string) {
		parseErrors[key] = msg
		skippedProjects[projectName] = true
		currentProjectFormCSV = nil
	}

	for _, row := range rows {
		// Get base data from interface
		baseData := row.GetBaseData()
		projectNameKey := strings.ToLower(strings.TrimSpace(baseData.ProjectName))

		// Check if it's a new project row
		isNewProjectRow := row.GetProjectName() != "" && (currentProjectFormCSV == nil || row.GetProjectName() != currentProjectFormCSV.Project.Name)
		isNewUnitRow := false
		if !isNewProjectRow && currentProjectFormCSV != nil {
			incomingUnitName := strings.TrimSpace(baseData.UnitName)
			isNewUnitRow = incomingUnitName != "" && incomingUnitName != currentProjectFormCSV.Unit.Name
		}

		if isNewProjectRow && skippedProjects[baseData.ProjectName] {
			continue
		}

		// Skip rows belonging to a project that already failed parsing.
		if !isNewProjectRow {
			if currentProjectFormCSV == nil {
				// Either no project declared yet, or current project was skipped.
				if len(skippedProjects) == 0 {
					parseErrors["csv"] = "row with empty project_name found before any project was defined"
					return nil, parseErrors, nil
				}
				continue
			}
			if skippedProjects[currentProjectFormCSV.Project.Name] {
				continue
			}
		}

		if isNewProjectRow || isNewUnitRow {
			// Flush the current project before starting a new context.
			if currentProjectFormCSV != nil && !skippedProjects[currentProjectFormCSV.Project.Name] {
				projects = append(projects, *currentProjectFormCSV)
			}

			projectData := data.Project{}
			if isNewProjectRow {
				if existingProject, ok := projectByName[projectNameKey]; ok {
					projectData = existingProject
				} else {
					projectID, err := uuid.NewV7()
					if err != nil {
						return nil, nil, fmt.Errorf("failed to generate project ID: %w", err)
					}

					projectData = data.Project{
						ID:           projectID,
						Name:         baseData.ProjectName,
						CEP:          baseData.ProjectCEP,
						State:        baseData.ProjectState,
						City:         baseData.ProjectCity,
						Neighborhood: baseData.ProjectNeighborhood,
						Street:       baseData.ProjectStreet,
						Number:       baseData.ProjectNumber,
						Phase:        baseData.ProjectPhase,
					}

					unitName := strings.TrimSpace(baseData.UnitName)
					if unitName == "" {
						skipCurrentProject(baseData.ProjectName, fmt.Sprintf("project[%s].unit_name", baseData.ProjectName), fmt.Sprintf("unit_name must be provided for the first row of project '%s'", baseData.ProjectName))
						continue
					}

					projectByName[projectNameKey] = projectData
				}
			} else {
				projectData = currentProjectFormCSV.Project
			}

			unitID, err := uuid.NewV7()
			if err != nil {
				return nil, nil, fmt.Errorf("failed to generate unit ID: %w", err)
			}
			optionID, err := uuid.NewV7()
			if err != nil {
				return nil, nil, fmt.Errorf("failed to generate option ID: %w", err)
			}

			unitName := strings.TrimSpace(baseData.UnitName)
			if unitName == "" {
				unitName = "unit"
			}

			currentProjectFormCSV = &ProjectFromCSV{
				Project: projectData,
				Unit: data.Unit{
					ID:                unitID,
					ProjectID:         projectData.ID,
					Name:              unitName,
					Type:              "tower",
					RepetitionCount:   max(baseData.UnitRepetitionCount, 1),
					HousingUnitsCount: baseData.UnitHousingUnitsCount,
					Floors:            []data.Floor{},
				},
				Option: data.Option{
					ID:      optionID,
					UnitID:  unitID,
					Name:    "Simulação 1",
					Active:  true,
					Modules: []data.ModuleInfo{},
				},
				Modules: []modules.Module{},
			}
		}

		unit := &currentProjectFormCSV.Unit

		// Floor handling by row context.
		// Non-empty floor_name always declares a new floor group, even with repeated names.
		// Empty floor_name keeps using the latest declared floor IDs in the same context.
		var floorIDs []uuid.UUID
		projectName := currentProjectFormCSV.Project.Name
		contextKey := projectName + "|" + unit.ID.String()
		floorNameKey := strings.ToLower(strings.TrimSpace(baseData.FloorName))

		if floorNameKey == "" {
			lastFloorIDs, ok := contextToLastFloorIDs[contextKey]
			if !ok {
				skipCurrentProject(projectName, fmt.Sprintf("project[%s].floor_name", projectName), fmt.Sprintf("floor_name must be provided for the first floor row of project '%s'", projectName))
				continue
			}
			floorIDs = lastFloorIDs
		} else {
			if baseData.FloorArea <= 0 {
				// TODO: Confirm with researcher whether this fallback should remain the default behavior.
				lastFloorIDs, ok := contextToLastFloorIDs[contextKey]
				if !ok {
					skipCurrentProject(projectName, fmt.Sprintf("project[%s].floor_area", projectName), fmt.Sprintf("floor_area is required to declare the first floor '%s' in project '%s'", strings.TrimSpace(baseData.FloorName), projectName))
					continue
				}

				floorIDs = lastFloorIDs
			} else {
				floorGroup := strings.TrimSpace(baseData.FloorName)
				category := baseData.FloorCategory
				if category == "" {
					category = "standard_floor"
				}
				repetition := max(baseData.FloorRepetition, 1)

				for range repetition {
					generatedFloorID, err := uuid.NewV7()
					if err != nil {
						return nil, nil, fmt.Errorf("failed to generate floor ID: %w", err)
					}
					unit.Floors = append(unit.Floors, data.Floor{
						ID:         generatedFloorID,
						UnitID:     unit.ID,
						FloorGroup: floorGroup,
						Category:   category,
						Area:       baseData.FloorArea,
						Height:     baseData.FloorHeight,
						Index:      len(unit.Floors),
					})
					floorIDs = append(floorIDs, generatedFloorID)
				}

				contextToLastFloorIDs[contextKey] = floorIDs
			}
		}

		// Create module via Go type switch on the concrete row type.
		// Rows with no data for their module type (context rows that only set
		// project / unit / floor) are silently skipped — their floor entry is
		// already recorded in the context maps above, so the next row with
		// actual data will inherit the correct floor ID.
		var module modules.Module
		switch typedRow := row.(type) {
		case ConcreteWallCSVRow:
			if hasDataConcreteWall(typedRow) {
				module = &modules.ConcreteWall{
					BasicModuleData: modules.BasicModuleData{Type: "concrete_wall"},
					Concrete:        typedRow.Concrete,
					Steel:           typedRow.Steel,
					Form:            typedRow.Form,
					SlabType:        typedRow.SlabType,
					WallThickness:   &typedRow.ModuleWallThickness,
					SlabThickness:   &typedRow.ModuleSlabThickness,
					WallArea:        &typedRow.ModuleWallArea,
					SlabArea:        &typedRow.ModuleSlabArea,
					WallFormArea:    &typedRow.ModuleWallFormArea,
					SlabFormArea:    &typedRow.ModuleSlabFormArea,
					FloorIDs:        floorIDs,
				}
			}
		case StructuralMasonryCSVRow:
			if hasDataStructuralMasonry(typedRow) {
				// Build grout array with mandatory Position field.
				groutArray := []modules.GroutInfo{}
				if len(typedRow.GroutVertical.Volumes) > 0 {
					typedRow.GroutVertical.Position = "vertical"
					groutArray = append(groutArray, typedRow.GroutVertical)
				}
				if len(typedRow.GroutHorizontal.Volumes) > 0 {
					typedRow.GroutHorizontal.Position = "horizontal"
					groutArray = append(groutArray, typedRow.GroutHorizontal)
				}
				if len(typedRow.GroutGeneral.Volumes) > 0 {
					groutArray = append(groutArray, typedRow.GroutGeneral)
				}

				module = &modules.StructuralMasonry{
					BasicModuleData: modules.BasicModuleData{Type: "structural_masonry"},
					Concrete:        typedRow.Concrete,
					Steel:           typedRow.Steel,
					Form:            typedRow.Form,
					SlabType:        typedRow.SlabType,
					FormColumns:     typedRow.ModuleFormColumns,
					FormBeams:       typedRow.ModuleFormBeams,
					FormSlabs:       typedRow.ModuleFormSlabs,
					FormTotal:       typedRow.ModuleFormTotal,
					Masonry: modules.MasonryElement{
						Grout:  groutArray,
						Mortar: typedRow.Mortar,
						Blocks: typedRow.Blocks,
					},
					FloorIDs: floorIDs,
				}
			}
		case BeamColumnCSVRow:
			if hasDataBeamColumn(typedRow) {
				module = &modules.BeamColumn{
					BasicModuleData: modules.BasicModuleData{Type: "beam_column"},
					Concrete:        typedRow.Concrete,
					Steel:           typedRow.Steel,
					Form:            typedRow.Form,
					SlabType:        typedRow.SlabType,
					FormColumns:     typedRow.ModuleFormColumns,
					FormBeams:       typedRow.ModuleFormBeams,
					FormSlabs:       typedRow.ModuleFormSlabs,
					FormTotal:       typedRow.ModuleFormTotal,
					FloorIDs:        floorIDs,
				}
			}
		}
		if module != nil {
			currentProjectFormCSV.Modules = append(currentProjectFormCSV.Modules, module)
		}
	}

	// Append the last project if it exists and it was not skipped.
	if currentProjectFormCSV != nil && !skippedProjects[currentProjectFormCSV.Project.Name] {
		projects = append(projects, *currentProjectFormCSV)
	}

	return projects, parseErrors, nil
}

// validateCSVHeaders checks if all required headers are present in the provided headerMap.
// It returns an error if any required header is missing.
// Handles both correctly spelled and misspelled headers from CSV files.
func validateCSVHeaders(headerMap map[string]int, moduleType string) error {
	requiredHeaders := getRequiredHeaders(moduleType)

	for _, requiredHeader := range requiredHeaders {
		if _, ok := headerMap[requiredHeader]; !ok {
			return fmt.Errorf("CSV header is missing the required '%s' column", requiredHeader)
		}
	}
	return nil
}

// validateBaseCSVHeaders validates that all project/unit/floor base headers are present.
// Used in "auto" mode where module-type-specific headers are not enforced at request time.
func validateBaseCSVHeaders(headerMap map[string]int) error {
	for _, h := range baseRequiredHeaders {
		if _, ok := headerMap[h]; !ok {
			return fmt.Errorf("CSV header is missing the required '%s' column", h)
		}
	}
	return nil
}

func buildHeaderMap(header []string) map[string]int {
	headerMap := make(map[string]int)

	for i, h := range header {
		name := strings.TrimSpace(h)
		if name == "" {
			continue
		}

		headerMap[name] = i
	}

	return headerMap
}

func findHeaderRow(records [][]string) (int, map[string]int, error) {
	for i, row := range records {
		headerMap := buildHeaderMap(row)

		if _, ok := headerMap["project_name"]; !ok {
			continue
		}

		return i, headerMap, nil
	}

	return -1, nil, errors.New("CSV header row not found: expected a row containing 'project_name'")
}

func normalizeHeaderMapForModuleType(headerMap map[string]int, moduleType string) map[string]int {
	normalized := make(map[string]int, len(headerMap))
	for name, idx := range headerMap {
		normalized[name] = idx
	}

	modulePrefixByType := map[string]string{
		"concrete_wall":      "concrete_wall_",
		"structural_masonry": "structural_masonry_",
		"beam_column":        "beam_column_",
	}

	prefix, ok := modulePrefixByType[moduleType]
	if !ok {
		return normalized
	}

	for name, idx := range headerMap {
		if !strings.HasPrefix(name, prefix) {
			continue
		}

		alias := "module_" + strings.TrimPrefix(name, prefix)
		// Prefer module-scoped columns (e.g. structural_masonry_*) over generic
		// module_* columns when both are present in the same CSV.
		normalized[alias] = idx
	}

	return normalized
}

func (app *application) createProjectsFromCSVHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	file, _, err := r.FormFile("csv")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(records) < 2 {
		app.badRequestResponse(w, r, fmt.Errorf("CSV file must have at least one header row and one data row"))
		return
	}

	headerRowIndex, headerMap, err := findHeaderRow(records)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = validateBaseCSVHeaders(headerMap)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if headerRowIndex+1 >= len(records) {
		app.badRequestResponse(w, r, fmt.Errorf("CSV file must contain at least one data row below the header"))
		return
	}

	dataRows := records[headerRowIndex+1:]

	allCSVRows := app.generateAutoRows(dataRows, headerMap)

	projectsFormCSV, parseErrors, err := toProjectsFromCSVData(allCSVRows, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	insertedProjects := make(map[uuid.UUID]bool)
	projectRoleIDs := make(map[uuid.UUID]uuid.UUID)
	failedProjects := make(map[uuid.UUID]bool)
	projectNames := make(map[uuid.UUID]string)
	projectErrors := make(map[uuid.UUID]map[string]string)
	var projectOrder []uuid.UUID

	addProjectError := func(id uuid.UUID, key, msg string) {
		projectErrors[id][key] = msg
	}

	addValidationErrors := func(id uuid.UUID, prefix string, ve *ValidationError) {
		for k, v := range ve.Errors {
			projectErrors[id][prefix+k] = v
		}
	}

outerLoop:
	for i, projectData := range projectsFormCSV {
		if _, seen := projectNames[projectData.Project.ID]; !seen {
			projectNames[projectData.Project.ID] = projectData.Project.Name
			projectErrors[projectData.Project.ID] = make(map[string]string)
			projectOrder = append(projectOrder, projectData.Project.ID)
		}

		if failedProjects[projectData.Project.ID] {
			continue
		}

		if !insertedProjects[projectData.Project.ID] {
			err = app.insertProject(&projectData.Project, user.ID)
			if err != nil {
				app.logger.Error("Failed to insert project", "error", err, "projectID", projectData.Project.ID, "projectName", projectData.Project.Name)
				var ve *ValidationError
				if errors.As(err, &ve) {
					addValidationErrors(projectData.Project.ID, "", ve)
				} else {
					addProjectError(projectData.Project.ID, "project", err.Error())
				}
				failedProjects[projectData.Project.ID] = true
				continue
			}

			roleEstruturaName := "Estrutura"
			roleID, err := uuid.NewV7()
			if err != nil {
				app.logger.Error("Failed to generate role ID", "error", err, "projectID", projectData.Project.ID)
				addProjectError(projectData.Project.ID, "role", err.Error())
				failedProjects[projectData.Project.ID] = true
				continue
			}

			roleEstrutura := &data.RoleWithUsersPermissions{
				Role: data.Role{
					ID:          roleID,
					ProjectID:   projectData.Project.ID,
					Name:        roleEstruturaName,
					Simulation:  true,
					IsProtected: false,
				},
				PermissionsIDs: []int32{},
				UsersIDs:       []uuid.UUID{user.ID},
			}

			err = app.models.Roles.Insert(roleEstrutura)
			if err != nil {
				app.logger.Error("Failed to insert role", "error", err, "projectID", projectData.Project.ID)
				addProjectError(projectData.Project.ID, "role", err.Error())
				failedProjects[projectData.Project.ID] = true
				continue
			}

			app.logger.Info("Role created successfully", "roleID", roleID, "roleName", roleEstruturaName, "projectID", projectData.Project.ID)
			insertedProjects[projectData.Project.ID] = true
			projectRoleIDs[projectData.Project.ID] = roleID
		}

		floorCreates := make([]data.FloorCreate, len(projectData.Unit.Floors))
		for i, floor := range projectData.Unit.Floors {
			floorCreates[i] = data.FloorCreate{
				ID:         floor.ID,
				FloorGroup: floor.FloorGroup,
				Category:   floor.Category,
				Area:       floor.Area,
				Height:     floor.Height,
				Index:      floor.Index,
			}
		}

		err = app.insertUnit(&projectData.Unit, floorCreates)
		if err != nil {
			app.logger.Error("Failed to insert unit", "error", err, "unitID", projectData.Unit.ID, "unitName", projectData.Unit.Name, "projectID", projectData.Project.ID)
			prefix := fmt.Sprintf("unit[%s].", projectData.Unit.Name)
			var ve *ValidationError
			if errors.As(err, &ve) {
				addValidationErrors(projectData.Project.ID, prefix, ve)
			} else {
				addProjectError(projectData.Project.ID, prefix+"insert", err.Error())
			}
			continue
		}

		roleID, ok := projectRoleIDs[projectData.Project.ID]
		if !ok {
			app.logger.Error("Role not found for project", "projectID", projectData.Project.ID)
			addProjectError(projectData.Project.ID, fmt.Sprintf("unit[%s].role", projectData.Unit.Name), "internal error: role not found")
			continue
		}

		projectsFormCSV[i].Option.RoleID = roleID

		err = app.models.Options.Insert(&projectsFormCSV[i].Option)
		if err != nil {
			app.logger.Error("Failed to insert option", "error", err, "optionID", projectsFormCSV[i].Option.ID)
			addProjectError(projectData.Project.ID, fmt.Sprintf("unit[%s].option", projectData.Unit.Name), err.Error())
			continue
		}

		for _, module := range projectData.Modules {
			_, err = app.insertModule(module, projectsFormCSV[i].Option.ID)
			if err != nil {
				var ve *ValidationError
				if errors.As(err, &ve) {
					addValidationErrors(projectData.Project.ID, fmt.Sprintf("unit[%s].module[%s].", projectData.Unit.Name, module.GetType()), ve)
					continue outerLoop
				}

				app.logger.Error("Failed to insert module", "error", err, "moduleType", module.GetType(), "optionID", projectsFormCSV[i].Option.ID)
				addProjectError(projectData.Project.ID, fmt.Sprintf("unit[%s].module[%s].insert", projectData.Unit.Name, module.GetType()), err.Error())
				continue outerLoop
			}
		}
	}

	results := make([]csvProjectResult, 0, len(projectOrder))
	for _, id := range projectOrder {
		errs := projectErrors[id]
		status := "success"
		if failedProjects[id] {
			status = "error"
		} else if len(errs) > 0 {
			status = "partial"
		}
		result := csvProjectResult{
			ProjectName: projectNames[id],
			Status:      status,
		}
		if len(errs) > 0 {
			result.Errors = errs
		}
		if status != "success" {
			results = append(results, result)
		}
	}

	// Append parse-time failures (projects skipped before insertion).
	for key, msg := range parseErrors {
		// key format: "project[ProjectName].field" — extract project name from between brackets.
		projectName := key
		if start := strings.Index(key, "["); start != -1 {
			if end := strings.Index(key[start:], "]"); end != -1 {
				projectName = key[start+1 : start+end]
			}
		}
		results = append(results, csvProjectResult{
			ProjectName: projectName,
			Status:      "error",
			Errors:      map[string]string{key: msg},
		})
	}

	err = app.writeJSON(w, http.StatusAccepted, envelope{"results": results}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
