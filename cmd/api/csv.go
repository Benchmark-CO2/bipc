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

	"module_grout_horizontal_15",
	"module_grout_horizontal_20",
	"module_grout_horizontal_25",
	"module_grout_horizontal_30",

	"module_grout_vertical_steel_50",
	"module_grout_vertical_steel_60",

	"module_grout_horizontal_steel_50",
	"module_grout_horizontal_steel_60",

	"module_mortar_4_5",
	"module_mortar_8",
	"module_mortar_14",

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

	"module_form_columns",
	"module_form_beams",
	"module_form_slabs",
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

	"module_form_columns",
	"module_form_beams",
	"module_form_slabs",
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
	UnitName string `json:"unit_name,omitempty"`

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
	ModuleWallThickness float64                 `json:"module_wall_thickness,omitempty"`
	ModuleSlabThickness float64                 `json:"module_slab_thickness,omitempty"`
	ModuleWallArea      float64                 `json:"module_wall_area,omitempty"`
	ModuleSlabArea      float64                 `json:"module_slab_area,omitempty"`
	ModuleWallFormArea  float64                 `json:"module_wall_form_area,omitempty"`
	ModuleSlabFormArea  float64                 `json:"module_slab_form_area,omitempty"`
	WallConcrete        modules.ConcreteElement `json:"wall_concrete"`
	SlabConcrete        modules.ConcreteElement `json:"slab_concrete"`
}

func (r ConcreteWallCSVRow) GetProjectName() string      { return r.ProjectName }
func (r ConcreteWallCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

// StructuralMasonryCSVRow holds data specific to structural masonry modules
type StructuralMasonryCSVRow struct {
	BaseCSVRowData
	ModuleFormColumns *float64                `json:"module_form_columns,omitempty"`
	ModuleFormBeams   *float64                `json:"module_form_beams,omitempty"`
	ModuleFormSlabs   *float64                `json:"module_form_slabs,omitempty"`
	ModuleBlockFbk    int                     `json:"module_block_fbk,omitempty"`
	Blocks            []modules.BlockInfo     `json:"blocks,omitempty"`
	ColumnConcrete    modules.ConcreteElement `json:"column_concrete"`
	BeamConcrete      modules.ConcreteElement `json:"beam_concrete"`
	SlabConcrete      modules.ConcreteElement `json:"slab_concrete"`
	GroutVertical     modules.GroutInfo       `json:"grout_vertical"`
	GroutHorizontal   modules.GroutInfo       `json:"grout_horizontal"`
	Mortar            []modules.MortarItem    `json:"mortar"`
}

func (r StructuralMasonryCSVRow) GetProjectName() string      { return r.ProjectName }
func (r StructuralMasonryCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

// BeamColumnCSVRow holds data specific to beam column modules
type BeamColumnCSVRow struct {
	BaseCSVRowData
	ModuleFormColumns *float64                `json:"module_form_columns,omitempty"`
	ModuleFormBeams   *float64                `json:"module_form_beams,omitempty"`
	ModuleFormSlabs   *float64                `json:"module_form_slabs,omitempty"`
	ColumnConcrete    modules.ConcreteElement `json:"column_concrete"`
	BeamConcrete      modules.ConcreteElement `json:"beam_concrete"`
	SlabConcrete      modules.ConcreteElement `json:"slab_concrete"`
}

func (r BeamColumnCSVRow) GetProjectName() string      { return r.ProjectName }
func (r BeamColumnCSVRow) GetBaseData() BaseCSVRowData { return r.BaseCSVRowData }

type ProjectFromCSV struct {
	Project data.Project     `json:"project"`
	Unit    data.Unit        `json:"unit"`
	Option  data.Option      `json:"option"`
	Modules []modules.Module `json:"modules"`
}

// parseFloat is a helper to parse string to float64, handling comma as decimal separator.
func parseFloat(s string) (float64, error) {
	if s == "" {
		return 0, nil
	}
	s = strings.Replace(s, ",", ".", -1)
	return strconv.ParseFloat(s, 64)
}

// parseInt is a helper to parse string to int.
func parseInt(s string) (int, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.Atoi(s)
}

// parseFieldStringRequired safely parses a required string field from a record
func parseFieldStringRequired(fieldName string, record []string, headerMap map[string]int) string {
	idx, ok := headerMap[fieldName]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

// parseFieldStringOptional safely parses an optional string field from a record
func parseFieldStringOptional(fieldName string, record []string, headerMap map[string]int) string {
	idx, ok := headerMap[fieldName]
	if !ok || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

// generateConcreteWallRows generates ConcreteWallCSVRow from CSV data
func (app *application) generateConcreteWallRows(dataRows [][]string, headerMap map[string]int) []ConcreteWallCSVRow {
	allCSVRows := []ConcreteWallCSVRow{}
	for i, record := range dataRows {
		// Helper for parsing with error logging
		parseFieldFloat := func(fieldName string) float64 {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseFloat(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse float", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseFieldInt := func(fieldName string) int {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseInt(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse int", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseOptionalField := func(fieldName string) *string {
			idx, ok := headerMap[fieldName]
			if !ok || idx >= len(record) {
				return nil
			}
			val := strings.TrimSpace(record[idx])
			if val == "" {
				return nil
			}
			return &val
		}

		FloorName := ""
		if idx, ok := headerMap["floor_name"]; ok && idx < len(record) {
			FloorName = record[idx]
		}
		if FloorName == "" {
			FloorName = "unique_floor"
		}

		unitName := ""
		if idx, ok := headerMap["unit_name"]; ok && idx < len(record) {
			unitName = record[idx]
		}
		if unitName == "" {
			unitName = "unit"
		}

		row := ConcreteWallCSVRow{
			BaseCSVRowData: BaseCSVRowData{
				ProjectName:         parseFieldStringRequired("project_name", record, headerMap),
				ProjectCEP:          parseOptionalField("project_cep"),
				ProjectState:        parseFieldStringRequired("project_state", record, headerMap),
				ProjectCity:         parseFieldStringRequired("project_city", record, headerMap),
				ProjectNeighborhood: parseOptionalField("project_neighborhood"),
				ProjectStreet:       parseOptionalField("project_street"),
				ProjectNumber:       parseOptionalField("project_number"),
				ProjectPhase:        parseFieldStringOptional("project_phase", record, headerMap),
				UnitName:            unitName,
				FloorName:           FloorName,
				FloorArea:           parseFieldFloat("floor_area"),
				FloorCategory:       parseFieldStringOptional("floor_category", record, headerMap),
				FloorHeight:         parseFieldFloat("floor_height"),
				FloorRepetition:     parseFieldInt("floor_repetition"),
			},
			ModuleWallThickness: parseFieldFloat("module_wall_thickness"),
			ModuleSlabThickness: parseFieldFloat("module_slab_thickness"),
			ModuleWallArea:      parseFieldFloat("module_wall_area"),
			ModuleSlabArea:      parseFieldFloat("module_slab_area"),
			ModuleWallFormArea:  parseFieldFloat("module_wall_form_area"),
			ModuleSlabFormArea:  parseFieldFloat("module_slab_form_area"),
			WallConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			SlabConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
		}

		// Parse concrete and steel volumes for concrete wall
		// NOTE: This includes aggregation from stairs and structure elements as per business rules
		// module_wall_concrete_XX now includes: wall + stairs + structure concrete
		// module_wall_steel_XX now includes: wall + stairs + structure steel
		for headerName := range headerMap {
			if strings.HasPrefix(headerName, "module_wall_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_wall_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					// Aggregate wall + stairs + structure concrete
					volume := parseFieldFloat(headerName)
					
					// Add stairs concrete if present
					stairsHeaderName := strings.Replace(headerName, "module_wall_concrete_", "module_stairs_concrete_", 1)
					stairsVolume := parseFieldFloat(stairsHeaderName)
					
					// Add structure concrete if present
					structureHeaderName := strings.Replace(headerName, "module_wall_concrete_", "module_structure_concrete_", 1)
					structureVolume := parseFieldFloat(structureHeaderName)
					
					totalVolume := volume + stairsVolume + structureVolume
					if totalVolume > 0 {
						row.WallConcrete.Volumes = append(row.WallConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: totalVolume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_wall_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_wall_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					// Aggregate wall + stairs + structure steel
					mass := parseFieldFloat(headerName)
					
					// Add stairs steel if present
					stairsHeaderName := strings.Replace(headerName, "module_wall_steel_", "module_stairs_steel_", 1)
					stairsMass := parseFieldFloat(stairsHeaderName)
					
					// Add structure steel if present
					structureHeaderName := strings.Replace(headerName, "module_wall_steel_", "module_structure_steel_", 1)
					structureMass := parseFieldFloat(structureHeaderName)
					
					totalMass := mass + stairsMass + structureMass
					if totalMass > 0 {
						row.WallConcrete.Steel = append(row.WallConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: totalMass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_slab_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.SlabConcrete.Volumes = append(row.SlabConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_slab_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.SlabConcrete.Steel = append(row.SlabConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			}
		}

		allCSVRows = append(allCSVRows, row) // Add to the slice
	}
	return allCSVRows
}

// generateStructuralMasonryRows generates StructuralMasonryCSVRow from CSV data
func (app *application) generateStructuralMasonryRows(dataRows [][]string, headerMap map[string]int) []StructuralMasonryCSVRow {
	allCSVRows := []StructuralMasonryCSVRow{}
	for i, record := range dataRows {
		// Helper for parsing with error logging
		parseFieldFloat := func(fieldName string) float64 {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseFloat(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse float", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseFieldInt := func(fieldName string) int {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseInt(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse int", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseOptionalField := func(fieldName string) *string {
			idx, ok := headerMap[fieldName]
			if !ok || idx >= len(record) {
				return nil
			}
			val := strings.TrimSpace(record[idx])
			if val == "" {
				return nil
			}
			return &val
		}

		// Helper to safely parse optional float fields
		parseOptionalFieldFloat := func(fieldName string) *float64 {
			idx, ok := headerMap[fieldName]
			if !ok {
				return nil
			}
			if idx >= len(record) {
				return nil
			}
			val, err := parseFloat(record[idx])
			if err != nil || val == 0 {
				return nil
			}
			return &val
		}

		FloorName := ""
		if idx, ok := headerMap["floor_name"]; ok && idx < len(record) {
			FloorName = record[idx]
		}
		if FloorName == "" {
			FloorName = "unique_floor"
		}

		unitName := ""
		if idx, ok := headerMap["unit_name"]; ok && idx < len(record) {
			unitName = record[idx]
		}
		if unitName == "" {
			unitName = "unit"
		}

		row := StructuralMasonryCSVRow{
			BaseCSVRowData: BaseCSVRowData{
				ProjectName:         parseFieldStringRequired("project_name", record, headerMap),
				ProjectCEP:          parseOptionalField("project_cep"),
				ProjectState:        parseFieldStringRequired("project_state", record, headerMap),
				ProjectCity:         parseFieldStringRequired("project_city", record, headerMap),
				ProjectNeighborhood: parseOptionalField("project_neighborhood"),
				ProjectStreet:       parseOptionalField("project_street"),
				ProjectNumber:       parseOptionalField("project_number"),
				ProjectPhase:        parseFieldStringOptional("project_phase", record, headerMap),
				UnitName:            unitName,
				FloorName:           FloorName,
				FloorArea:           parseFieldFloat("floor_area"),
				FloorCategory:       parseFieldStringOptional("floor_category", record, headerMap),
				FloorHeight:         parseFieldFloat("floor_height"),
				FloorRepetition:     parseFieldInt("floor_repetition"),
			},
			ModuleFormColumns: parseOptionalFieldFloat("module_form_columns"),
			ModuleFormBeams:   parseOptionalFieldFloat("module_form_beams"),
			ModuleFormSlabs:   parseOptionalFieldFloat("module_form_slabs"),
			ModuleBlockFbk:    parseFieldInt("module_block_fbk"),
			Blocks:            []modules.BlockInfo{},
			ColumnConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			BeamConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			SlabConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			GroutVertical: modules.GroutInfo{
				Volumes: []modules.GroutVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			GroutHorizontal: modules.GroutInfo{
				Volumes: []modules.GroutVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			Mortar: []modules.MortarItem{},
		}

		// Parse concrete, steel, grout, mortar, and blocks for structural masonry
		for headerName := range headerMap {
			if strings.HasPrefix(headerName, "module_column_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_column_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.ColumnConcrete.Volumes = append(row.ColumnConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_column_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_column_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.ColumnConcrete.Steel = append(row.ColumnConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_beam_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_beam_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.BeamConcrete.Volumes = append(row.BeamConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_beam_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_beam_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.BeamConcrete.Steel = append(row.BeamConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_slab_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.SlabConcrete.Volumes = append(row.SlabConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_slab_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.SlabConcrete.Steel = append(row.SlabConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_grout_vertical_") && !strings.Contains(headerName, "steel") {
				fgkStr := strings.TrimPrefix(headerName, "module_grout_vertical_")
				fgk, _ := strconv.Atoi(fgkStr)
				if fgk > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.GroutVertical.Volumes = append(row.GroutVertical.Volumes, modules.GroutVolumeItem{Fgk: fgk, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_grout_vertical_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_grout_vertical_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.GroutVertical.Steel = append(row.GroutVertical.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_grout_horizontal_") && !strings.Contains(headerName, "steel") {
				fgkStr := strings.TrimPrefix(headerName, "module_grout_horizontal_")
				fgk, _ := strconv.Atoi(fgkStr)
				if fgk > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.GroutHorizontal.Volumes = append(row.GroutHorizontal.Volumes, modules.GroutVolumeItem{Fgk: fgk, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_grout_horizontal_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_grout_horizontal_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.GroutHorizontal.Steel = append(row.GroutHorizontal.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_mortar_") {
				fakStr := strings.TrimPrefix(headerName, "module_mortar_")
				// Replace underscore with dot for 4_5 -> 4.5
				fakStr = strings.Replace(fakStr, "_", ".", -1)
				fak, _ := strconv.ParseFloat(fakStr, 64)
				if fak > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.Mortar = append(row.Mortar, modules.MortarItem{Fak: fak, Volume: volume})
					}
				}
			}
		}

		// Parse block data
		blockTypeMap := map[string]string{
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

		for columnName, blockType := range blockTypeMap {
			qtyIdx, hasQty := headerMap[columnName]
			if hasQty {
				qty, _ := parseInt(record[qtyIdx])
				if qty > 0 && row.ModuleBlockFbk > 0 {
					row.Blocks = append(row.Blocks, modules.BlockInfo{
						Type:     blockType,
						Fbk:      row.ModuleBlockFbk,
						Quantity: qty,
					})
				}
			}
		}

		allCSVRows = append(allCSVRows, row)
	}
	return allCSVRows
}

// generateBeamColumnRows generates BeamColumnCSVRow from CSV data
func (app *application) generateBeamColumnRows(dataRows [][]string, headerMap map[string]int) []BeamColumnCSVRow {
	allCSVRows := []BeamColumnCSVRow{}

	for i, record := range dataRows {
		// Helper for parsing with error logging
		parseFieldFloat := func(fieldName string) float64 {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseFloat(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse float", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseFieldInt := func(fieldName string) int {
			idx, ok := headerMap[fieldName]
			if !ok {
				return 0
			}
			if idx >= len(record) {
				return 0
			}
			val, err := parseInt(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse int", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseOptionalField := func(fieldName string) *string {
			idx, ok := headerMap[fieldName]
			if !ok || idx >= len(record) {
				return nil
			}
			val := strings.TrimSpace(record[idx])
			if val == "" {
				return nil
			}
			return &val
		}

		// Helper to safely parse optional float fields
		parseOptionalFieldFloat := func(fieldName string) *float64 {
			idx, ok := headerMap[fieldName]
			if !ok {
				return nil
			}
			if idx >= len(record) {
				return nil
			}
			val, err := parseFloat(record[idx])
			if err != nil || val == 0 {
				return nil
			}
			return &val
		}

		FloorName := ""
		if idx, ok := headerMap["floor_name"]; ok && idx < len(record) {
			FloorName = record[idx]
		}
		if FloorName == "" {
			FloorName = "unique_floor"
		}

		unitName := ""
		if idx, ok := headerMap["unit_name"]; ok && idx < len(record) {
			unitName = record[idx]
		}
		if unitName == "" {
			unitName = "unit"
		}

		row := BeamColumnCSVRow{
			BaseCSVRowData: BaseCSVRowData{
				ProjectName:         parseFieldStringRequired("project_name", record, headerMap),
				ProjectCEP:          parseOptionalField("project_cep"),
				ProjectState:        parseFieldStringRequired("project_state", record, headerMap),
				ProjectCity:         parseFieldStringRequired("project_city", record, headerMap),
				ProjectNeighborhood: parseOptionalField("project_neighborhood"),
				ProjectStreet:       parseOptionalField("project_street"),
				ProjectNumber:       parseOptionalField("project_number"),
				ProjectPhase:        parseFieldStringOptional("project_phase", record, headerMap),
				UnitName:            unitName,
				FloorName:           FloorName,
				FloorArea:           parseFieldFloat("floor_area"),
				FloorCategory:       parseFieldStringOptional("floor_category", record, headerMap),
				FloorHeight:         parseFieldFloat("floor_height"),
				FloorRepetition:     parseFieldInt("floor_repetition"),
			},
			ModuleFormColumns: parseOptionalFieldFloat("module_form_columns"),
			ModuleFormBeams:   parseOptionalFieldFloat("module_form_beams"),
			ModuleFormSlabs:   parseOptionalFieldFloat("module_form_slabs"),
			ColumnConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			BeamConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			SlabConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
		}

		// Parse concrete and steel for beam_column
		for headerName := range headerMap {
			if strings.HasPrefix(headerName, "module_column_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_column_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.ColumnConcrete.Volumes = append(row.ColumnConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_column_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_column_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.ColumnConcrete.Steel = append(row.ColumnConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_beam_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_beam_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.BeamConcrete.Volumes = append(row.BeamConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_beam_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_beam_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.BeamConcrete.Steel = append(row.BeamConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_slab_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.SlabConcrete.Volumes = append(row.SlabConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_slab_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.SlabConcrete.Steel = append(row.SlabConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			}
		}

		allCSVRows = append(allCSVRows, row)
	}
	return allCSVRows
}

// generateRowsByType dispatches to the appropriate generation function based on module type
func (app *application) generateRowsByType(moduleType string, dataRows [][]string, headerMap map[string]int) []CSVRowData {
	switch moduleType {
	case "concrete_wall":
		rows := app.generateConcreteWallRows(dataRows, headerMap)
		result := make([]CSVRowData, len(rows))
		for i := range rows {
			result[i] = rows[i]
		}
		return result
	case "structural_masonry":
		rows := app.generateStructuralMasonryRows(dataRows, headerMap)
		result := make([]CSVRowData, len(rows))
		for i := range rows {
			result[i] = rows[i]
		}
		return result
	case "beam_column":
		rows := app.generateBeamColumnRows(dataRows, headerMap)
		result := make([]CSVRowData, len(rows))
		for i := range rows {
			result[i] = rows[i]
		}
		return result
	default:
		return []CSVRowData{}
	}
}

func toProjectsFromCSVData(rows []CSVRowData, userID uuid.UUID, moduleType string) ([]ProjectFromCSV, error) {
	projects := []ProjectFromCSV{}
	var currentProjectFormCSV *ProjectFromCSV
	projectNameToUnit := make(map[string]*data.Unit) // To store the Unit associated with each ProjectName

	for _, row := range rows {
		// Get base data from interface
		baseData := row.GetBaseData()

		// Check if it's a new project row
		isNewProjectRow := row.GetProjectName() != "" && (currentProjectFormCSV == nil || row.GetProjectName() != currentProjectFormCSV.Project.Name)

		if isNewProjectRow {
			// New project
			if currentProjectFormCSV != nil {
				projects = append(projects, *currentProjectFormCSV)
			}

			// Generate all IDs upfront - consistent with application pattern
			projectID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate project ID: %w", err)
			}
			unitID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate unit ID: %w", err)
			}
			optionID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate option ID: %w", err)
			}

			currentProjectFormCSV = &ProjectFromCSV{
				Project: data.Project{
					ID:           projectID,
					Name:         baseData.ProjectName,
					CEP:          baseData.ProjectCEP,
					State:        baseData.ProjectState,
					City:         baseData.ProjectCity,
					Neighborhood: baseData.ProjectNeighborhood,
					Street:       baseData.ProjectStreet,
					Number:       baseData.ProjectNumber,
					Phase:        baseData.ProjectPhase,
					Benchmark:    true, // Mark as benchmark project from CSV
				},
				Unit: data.Unit{
					ID:        unitID,
					ProjectID: projectID,
					Name:      baseData.UnitName,
					Type:      "tower",        // Assuming it's a tower if it has floors/modules
					Floors:    []data.Floor{}, // Initialize floors slice
				},
				Option: data.Option{
					ID:      optionID,
					UnitID:  unitID,
					Name:    fmt.Sprintf("Option for %s", baseData.UnitName), // Default name
					Active:  true,
					Modules: []data.ModuleInfo{},
				},
				Modules: []modules.Module{},
			}
			projectNameToUnit[row.GetProjectName()] = &currentProjectFormCSV.Unit
		} else {
			// Row belongs to the current project
			if currentProjectFormCSV == nil {
				return nil, errors.New("CSV data error: row with empty ProjectName found before any project was defined")
			}
		}

		// Retrieve the unit for the current project
		unit := projectNameToUnit[currentProjectFormCSV.Project.Name]
		if unit == nil {
			return nil, errors.New("internal error: unit not found for current project")
		}

		// Floor Handling - generate Floor ID upfront
		floorID, err := uuid.NewV7()
		if err != nil {
			return nil, fmt.Errorf("failed to generate floor ID: %w", err)
		}

		// Cria o Floor com ID pré-gerado
		floor := data.Floor{
			ID:         floorID,
			UnitID:     unit.ID,
			FloorGroup: baseData.FloorName,
			Category:   "standard_floor", // Default category for CSV imports
			Area:       baseData.FloorArea,
			Height:     baseData.FloorHeight,
			Index:      len(unit.Floors), // usa ordem como index
		}
		unit.Floors = append(unit.Floors, floor)

		// Create module based on type with type assertions
		var module modules.Module
		switch moduleType {
		case "concrete_wall":
			concreteWallRow, ok := row.(ConcreteWallCSVRow)
			if !ok {
				return nil, fmt.Errorf("type assertion failed: expected ConcreteWallCSVRow")
			}
			module = &modules.ConcreteWall{
				BasicModuleData: modules.BasicModuleData{Type: "concrete_wall"},
				ConcreteWalls:   concreteWallRow.WallConcrete,
				ConcreteSlabs:   concreteWallRow.SlabConcrete,
				WallThickness:   &concreteWallRow.ModuleWallThickness,
				SlabThickness:   &concreteWallRow.ModuleSlabThickness,
				WallArea:        &concreteWallRow.ModuleWallArea,
				SlabArea:        &concreteWallRow.ModuleSlabArea,
				WallFormArea:    &concreteWallRow.ModuleWallFormArea,
				SlabFormArea:    &concreteWallRow.ModuleSlabFormArea,
				FloorIDs:        []uuid.UUID{floorID},
			}
		case "structural_masonry":
			masonryRow, ok := row.(StructuralMasonryCSVRow)
			if !ok {
				return nil, fmt.Errorf("type assertion failed: expected StructuralMasonryCSVRow")
			}
			// Build grout array
			groutArray := []modules.GroutInfo{}
			if len(masonryRow.GroutVertical.Volumes) > 0 || len(masonryRow.GroutVertical.Steel) > 0 {
				groutArray = append(groutArray, masonryRow.GroutVertical)
			}
			if len(masonryRow.GroutHorizontal.Volumes) > 0 || len(masonryRow.GroutHorizontal.Steel) > 0 {
				groutArray = append(groutArray, masonryRow.GroutHorizontal)
			}

			module = &modules.StructuralMasonry{
				BasicModuleData: modules.BasicModuleData{Type: "structural_masonry"},
				ConcreteColumns: masonryRow.ColumnConcrete,
				ConcreteBeams:   masonryRow.BeamConcrete,
				ConcreteSlabs:   masonryRow.SlabConcrete,
				FormColumns:     masonryRow.ModuleFormColumns,
				FormBeams:       masonryRow.ModuleFormBeams,
				FormSlabs:       masonryRow.ModuleFormSlabs,
				Masonry: modules.MasonryElement{
					Grout:  groutArray,
					Mortar: masonryRow.Mortar,
					Blocks: masonryRow.Blocks,
				},
				FloorIDs: []uuid.UUID{floorID},
			}
		case "beam_column":
			beamColumnRow, ok := row.(BeamColumnCSVRow)
			if !ok {
				return nil, fmt.Errorf("type assertion failed: expected BeamColumnCSVRow")
			}
			module = &modules.BeamColumn{
				BasicModuleData: modules.BasicModuleData{Type: "beam_column"},
				ConcreteColumns: beamColumnRow.ColumnConcrete,
				ConcreteBeams:   beamColumnRow.BeamConcrete,
				ConcreteSlabs:   beamColumnRow.SlabConcrete,
				FormColumns:     beamColumnRow.ModuleFormColumns,
				FormBeams:       beamColumnRow.ModuleFormBeams,
				FormSlabs:       beamColumnRow.ModuleFormSlabs,
				FloorIDs:        []uuid.UUID{floorID},
			}
		default:
			return nil, fmt.Errorf("unsupported module type: %s", moduleType)
		}
		currentProjectFormCSV.Modules = append(currentProjectFormCSV.Modules, module)
	}

	// Append the last project if it exists
	if currentProjectFormCSV != nil {
		projects = append(projects, *currentProjectFormCSV)
	}

	return projects, nil
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

// getOrCreateBenchmarkUser gets or creates the default benchmark user
func (app *application) getOrCreateBenchmarkUser() (uuid.UUID, error) {
	benchmarkEmail := "benchmark@bipc.org.br"

	// Try to get existing user
	existingUser, err := app.models.Users.GetByEmail(benchmarkEmail)
	if err == nil {
		// User exists, return their ID
		return existingUser.ID, nil
	}

	// User doesn't exist, create it
	if !errors.Is(err, data.ErrRecordNotFound) {
		// Unexpected error
		return uuid.Nil, err
	}

	// Create new benchmark user
	newUser := &data.User{
		Name:      "Benchmark User",
		Email:     benchmarkEmail,
		Activated: true,
	}

	// Set password
	err = newUser.Password.Set("benchmark0123")
	if err != nil {
		return uuid.Nil, err
	}

	// Insert user
	err = app.models.Users.Insert(newUser)
	if err != nil {
		return uuid.Nil, err
	}

	return newUser.ID, nil
}

func (app *application) createProjectsFromCSVHandler(w http.ResponseWriter, r *http.Request) {
	// Get or create benchmark user
	benchmarkUserID, err := app.getOrCreateBenchmarkUser()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	user := &data.User{ID: benchmarkUserID}

	err = r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Get module type from form data
	moduleType := r.FormValue("type")
	if moduleType == "" {
		moduleType = "concrete_wall" // Default to concrete_wall
	}

	// Validate module type
	validTypes := []string{"concrete_wall", "structural_masonry", "beam_column"}
	isValidType := false
	for _, validType := range validTypes {
		if moduleType == validType {
			isValidType = true
			break
		}
	}
	if !isValidType {
		app.badRequestResponse(w, r, fmt.Errorf("invalid module type: %s. Must be one of: concrete_wall, structural_masonry, beam_column", moduleType))
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
		app.badRequestResponse(w, r, fmt.Errorf("CSV file must have at least a header and one data row"))
		return
	}

	header := records[0]
	headerMap := make(map[string]int)
	for i, h := range header {
		if h != "" {
			headerMap[strings.TrimSpace(h)] = i
		}
	}

	// Validate all required headers at once
	err = validateCSVHeaders(headerMap, moduleType)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	dataRows := records[1:]

	allCSVRows := app.generateRowsByType(moduleType, dataRows, headerMap)

	projectsFormCSV, err := toProjectsFromCSVData(allCSVRows, user.ID, moduleType)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a map to easily find the rows for a given project
	rowsByProject := make(map[string][]CSVRowData)
	for _, row := range allCSVRows {
		rowsByProject[row.GetProjectName()] = append(rowsByProject[row.GetProjectName()], row)
	}

	for i, projectData := range projectsFormCSV {
		// Insert Project
		err = app.models.Projects.Insert(&projectData.Project, user.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Convert Unit.Floors to FloorCreate slice
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

		// Insert Unit with floors (IDs already generated)
		err = app.models.Units.Insert(&projectData.Unit, floorCreates)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Create role "Estrutura" for the project
		roleEstruturaName := "Estrutura"
		roleID, err := uuid.NewV7()
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
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
			app.serverErrorResponse(w, r, err)
			return
		}

		app.logger.Info("Role created successfully", "roleID", roleID, "roleName", roleEstruturaName, "projectID", projectData.Project.ID)

		// Set the role_id for the option before inserting
		projectsFormCSV[i].Option.RoleID = roleID

		app.logger.Info("Inserting option", "optionID", projectsFormCSV[i].Option.ID, "roleID", projectsFormCSV[i].Option.RoleID, "unitID", projectsFormCSV[i].Option.UnitID)

		// Insert Option (ID already generated)
		err = app.models.Options.Insert(&projectsFormCSV[i].Option)
		if err != nil {
			app.logger.Error("Failed to insert option", "error", err, "optionID", projectsFormCSV[i].Option.ID, "roleID", projectsFormCSV[i].Option.RoleID)
			app.serverErrorResponse(w, r, err)
			return
		}

		// Process modules - FloorIDs already set correctly
		for _, module := range projectData.Modules {
			// Calculate consumption
			result, err := module.Calculate()
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			_, err = module.Insert(app.models, projectsFormCSV[i].Option.ID, result)
			if err != nil {
				switch {
				case errors.Is(err, data.ErrInvalidOptionID):
					app.badRequestResponse(w, r, err)
				case errors.Is(err, data.ErrInvalidFloorID):
					app.badRequestResponse(w, r, err)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}
		}
		projectsFormCSV[i].Unit.Floors = nil
	}

	err = app.writeJSON(w, http.StatusAccepted, envelope{"projects": projectsFormCSV}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
