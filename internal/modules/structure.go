package modules

import (
	"encoding/json"
	"errors"
	"strings"
)

type Concrete struct {
	Fck    string  `json:"fck"`
	Volume float64 `json:"volume"`
}

type Block struct {
	Type     string `json:"type"`
	Fbk      string `json:"fbk"`
	Quantity int    `json:"quantity"`
}

type BasicModuleData struct {
	UnitID        int     `json:"unit_id"`
	Name          string  `json:"name"`
	StructureType string  `json:"structure_type"`
	Repetition    int     `json:"repetition"`
	Area          float64 `json:"area"`
	Height        float64 `json:"height"`
}

type BeamColumn struct {
	BasicModuleData
	ConcreteColumns []Concrete `json:"concrete_columns"`
	ConcreteBeams   []Concrete `json:"concrete_beams"`
	ConcreteSlabs   []Concrete `json:"concrete_slabs"`
	SteelCA50       float64    `json:"steel_ca50"`
	SteelCA60       float64    `json:"steel_ca60"`
	FormColumns     *float64   `json:"form_columns,omitempty"`
	FormBeams       *float64   `json:"form_beams,omitempty"`
	FormSlabs       *float64   `json:"form_slabs,omitempty"`
	FormTotal       *float64   `json:"form_total,omitempty"`
	ColumnNumber    *int       `json:"column_number,omitempty"`
	AvgBeamSpan     *int       `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *int       `json:"avg_slab_span,omitempty"`
}

type ConcreteWall struct {
	BasicModuleData
	ConcreteWalls []Concrete `json:"concrete_walls"`
	ConcreteSlabs []Concrete `json:"concrete_slabs"`
	SteelCA50     float64    `json:"steel_ca50"`
	SteelCA60     float64    `json:"steel_ca60"`
	WallThickness *float64   `json:"wall_thickness,omitempty"`
	SlabThickness *float64   `json:"slab_thickness,omitempty"`
	FormArea      *float64   `json:"form_area,omitempty"`
	WallArea      *float64   `json:"wall_area,omitempty"`
}

type StructuralMasonry struct {
	BasicModuleData
	VerticalGrout   []Concrete `json:"vertical_grout"`
	HorizontalGrout []Concrete `json:"horizontal_grout"`
	SteelCA50       float64    `json:"steel_ca50"`
	SteelCA60       float64    `json:"steel_ca60"`
	Blocks          []Block    `json:"blocks"`
}

type ModuleStructure interface {
	Type() string
}

func (b *BeamColumn) Type() string        { return b.StructureType }
func (w *ConcreteWall) Type() string      { return w.StructureType }
func (m *StructuralMasonry) Type() string { return m.StructureType }

func UnmarshalModuleStructure(data []byte) (ModuleStructure, error) {
	var basic BasicModuleData
	if err := json.Unmarshal(data, &basic); err != nil {
		return nil, err
	}
	switch strings.ToLower(basic.StructureType) {
	case "viga pilar":
		var b BeamColumn
		if err := json.Unmarshal(data, &b); err != nil {
			return nil, err
		}
		return &b, nil
	case "parede de concreto":
		var w ConcreteWall
		if err := json.Unmarshal(data, &w); err != nil {
			return nil, err
		}
		return &w, nil
	case "alvenaria estrutural":
		var m StructuralMasonry
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, err
		}
		return &m, nil
	default:
		return nil, errors.New("invalid structure_type")
	}
}
