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
	UnitID         int     `json:"unit_id"`
	Name           string  `json:"name"`
	StructureType  string  `json:"structure_type"`
	FloorRepetition int    `json:"floor_repetition"`
	FloorArea      float64 `json:"floor_area"`
	FloorHeight    float64 `json:"floor_height"`
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

type CO2Consuption struct {
    Min float64 `json:"min"`
    Max float64 `json:"max"`
}

type ModuleStructure interface {
	Type() string
	Calculate() (CO2Consuption, error)
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
	case "beam_column":
		var b BeamColumn
		if err := json.Unmarshal(data, &b); err != nil {
			return nil, err
		}
		return &b, nil
	case "concrete_wall":
		var w ConcreteWall
		if err := json.Unmarshal(data, &w); err != nil {
			return nil, err
		}
		return &w, nil
	case "structural_masonry":
		var m StructuralMasonry
		if err := json.Unmarshal(data, &m); err != nil {
			return nil, err
		}
		return &m, nil
	default:
		return nil, errors.New("invalid structure_type")
	}
}

type SidacValue struct {
    Min float64 `json:"min"`
    Max float64 `json:"max"`
}

type SidacMaterial struct {
    KgCO2 map[string]SidacValue `json:"kgCO2"`
    MJ    map[string]SidacValue `json:"MJ"`
}

var sidacConcreteData = SidacMaterial{
    KgCO2: map[string]SidacValue{
        "20": {Min: 168.8, Max: 283.5},
        "25": {Min: 200.0, Max: 306.4},
        "30": {Min: 228.2, Max: 339.4},
        "35": {Min: 256.6, Max: 373.6},
        "40": {Min: 283.4, Max: 395.5},
    },
    MJ: map[string]SidacValue{
        "20": {Min: 1325, Max: 2244},
        "25": {Min: 1488, Max: 2408},
        "30": {Min: 1650, Max: 2629},
        "35": {Min: 1797, Max: 2849},
        "40": {Min: 1928, Max: 3002},
    },
}

var sidacSteelData = SidacMaterial{
	KgCO2: map[string]SidacValue{
        "50": {Min: 0.4259, Max: 1.061},
        "60": {Min: 0.5, Max: 1.1},
    },
    MJ: map[string]SidacValue{
        "50": {Min: 8.025, Max: 16.05},
        "60": {Min: 8.1, Max: 16.1},
    },
}

func calculateConcrete(list []Concrete, sidac SidacMaterial, result CO2Consuption) (CO2Consuption, error) {
    for _, c := range list {
        val, ok := sidac.KgCO2[c.Fck]
        if !ok {
            return result, errors.New("fck not found in sidacConcreteData: " + c.Fck)
        }
        result.Min += val.Min * c.Volume
        result.Max += val.Max * c.Volume
    }
    return result, nil
}

func calculateSteel(ca50, ca60 float64, sidac SidacMaterial, result CO2Consuption) (CO2Consuption, error) {
    val, ok := sidac.KgCO2["50"]
    if !ok {
        return result, errors.New("steel type not found in sidacSteelData: 50")
    }
    result.Min += val.Min * ca50
    result.Max += val.Max * ca50

    val, ok = sidac.KgCO2["60"]
    if !ok {
        return result, errors.New("steel type not found in sidacSteelData: 60")
    }
    result.Min += val.Min * ca60
    result.Max += val.Max * ca60

    return result, nil
}

func (w *ConcreteWall) Calculate() (CO2Consuption, error) {
    result := CO2Consuption{}

    result, err := calculateConcrete(w.ConcreteWalls, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateConcrete(w.ConcreteSlabs, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

	result, err = calculateSteel(w.SteelCA50, w.SteelCA60, sidacSteelData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

	// to obtain consuption per area CO2/m2
	result.Max = result.Max / float64(w.FloorArea)
	result.Min = result.Min / float64(w.FloorArea)

    return result, nil
}

func (b *BeamColumn) Calculate() (CO2Consuption, error) {
    result := CO2Consuption{}

    result, err := calculateConcrete(b.ConcreteColumns, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateConcrete(b.ConcreteBeams, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateConcrete(b.ConcreteSlabs, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateSteel(b.SteelCA50, b.SteelCA60, sidacSteelData, result)
    if err != nil {
        return CO2Consuption{}, err
    }
	
	// to obtain consuption per area (CO2/m2)
	result.Max = result.Max / float64(b.FloorArea)
	result.Min = result.Min / float64(b.FloorArea)

    return result, nil
}

func (m *StructuralMasonry) Calculate() (CO2Consuption, error) {
	result := CO2Consuption{}

    result, err := calculateConcrete(m.VerticalGrout, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateConcrete(m.HorizontalGrout, sidacConcreteData, result)
    if err != nil {
        return CO2Consuption{}, err
    }

    result, err = calculateSteel(m.SteelCA50, m.SteelCA60, sidacSteelData, result)
    if err != nil {
        return CO2Consuption{}, err
    }
	
	// to obtain consuption per area (CO2/m2)
	result.Max = result.Max / float64(m.FloorArea)
	result.Min = result.Min / float64(m.FloorArea)

    return result, nil
}
