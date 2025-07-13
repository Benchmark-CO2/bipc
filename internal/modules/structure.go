package modules

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type Concrete struct {
	Fck    string  `json:"fck"`
	Volume float64 `json:"volume"`
}

// type Block struct {
// 	Type     string `json:"type"`
// 	Fbk      string `json:"fbk"`
// 	Quantity int    `json:"quantity"`
// }

type BasicModuleData struct {
	Name            string  `json:"name"`
	StructureType   string  `json:"structure_type"`
	FloorRepetition int     `json:"floor_repetition"`
	FloorArea       float64 `json:"floor_area"`
	FloorHeight     float64 `json:"floor_height"`
}

type ModuleResponseData struct {
	CO2Min    *float64 `json:"co2_min,omitempty"`
	CO2Max    *float64 `json:"co2_max,omitempty"`
	EnergyMin *float64 `json:"energy_min,omitempty"`
	EnergyMax *float64 `json:"energy_max,omitempty"`
	InUse     bool     `json:"in_use"`
	Version   int32    `json:"version"`
}

type BeamColumn struct {
	BasicModuleData
	ModuleResponseData
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
	ModuleResponseData
	ConcreteWalls []Concrete `json:"concrete_walls"`
	ConcreteSlabs []Concrete `json:"concrete_slabs"`
	SteelCA50     float64    `json:"steel_ca50"`
	SteelCA60     float64    `json:"steel_ca60"`
	WallThickness *float64   `json:"wall_thickness,omitempty"`
	SlabThickness *float64   `json:"slab_thickness,omitempty"`
	FormArea      *float64   `json:"form_area,omitempty"`
	WallArea      *float64   `json:"wall_area,omitempty"`
}

// type StructuralMasonry struct {
// 	BasicModuleData
// 	VerticalGrout   []Concrete `json:"vertical_grout"`
// 	HorizontalGrout []Concrete `json:"horizontal_grout"`
// 	SteelCA50       float64    `json:"steel_ca50"`
// 	SteelCA60       float64    `json:"steel_ca60"`
// 	Blocks          []Block    `json:"blocks"`
// }

type Consuption struct {
	CO2Min    float64 `json:"co2_min"`
	CO2Max    float64 `json:"co2_max"`
	EnergyMin float64 `json:"energy_min"`
	EnergyMax float64 `json:"energy_max"`
}

func (c *Consuption) sum(value Consuption) {
	c.CO2Min += value.CO2Min
	c.CO2Max += value.CO2Max
	c.EnergyMin += value.EnergyMin
	c.EnergyMax += value.EnergyMax
}

func (c *Consuption) divideByArea(area float64) {
	if area == 0 {
		return
	}
	c.CO2Min /= area
	c.CO2Max /= area
	c.EnergyMin /= area
	c.EnergyMax /= area
}

type ModuleStructure interface {
	Type() string
	Validate(v *validator.Validator)
	Calculate() (Consuption, error)
	Insert(models data.Models, unitID int64, result Consuption, opts *InsertOptions) error
	GetLatestVersion(models data.Models, moduleID int64) (int32, error)
}

func (b *BeamColumn) Type() string   { return b.StructureType }
func (w *ConcreteWall) Type() string { return w.StructureType }

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Name != "", "name", "must be provided")
	v.Check(w.StructureType != "", "structure_type", "must be provided")
	v.Check(w.FloorRepetition > 0, "floor_repetition", "must be greater than 0")
	v.Check(w.FloorArea > 0, "floor_area", "must be greater than 0")
	v.Check(w.FloorHeight > 0, "floor_height", "must be greater than 0")

	validateConcreteList(v, w.ConcreteWalls, "concrete_walls")
	validateConcreteList(v, w.ConcreteSlabs, "concrete_slabs")

	v.Check(w.SteelCA50 >= 0, "steel_ca50", "cannot be negative")
	v.Check(w.SteelCA60 >= 0, "steel_ca60", "cannot be negative")
	v.Check(w.SteelCA50 > 0 || w.SteelCA60 > 0, "steel", "at least one steel value must be greater than 0")

	if w.WallThickness != nil {
		v.Check(*w.WallThickness >= 0, "wall_thickness", "cannot be negative")
	}
	if w.SlabThickness != nil {
		v.Check(*w.SlabThickness >= 0, "slab_thickness", "cannot be negative")
	}
	if w.FormArea != nil {
		v.Check(*w.FormArea >= 0, "form_area", "cannot be negative")
	}
	if w.WallArea != nil {
		v.Check(*w.WallArea >= 0, "wall_area", "cannot be negative")
	}
}

func (b *BeamColumn) Validate(v *validator.Validator) {
	v.Check(b.Name != "", "name", "must be provided")
	v.Check(b.StructureType != "", "structure_type", "must be provided")
	v.Check(b.FloorRepetition > 0, "floor_repetition", "must be greater than 0")
	v.Check(b.FloorArea > 0, "floor_area", "must be greater than 0")
	v.Check(b.FloorHeight > 0, "floor_height", "must be greater than 0")

	validateConcreteList(v, b.ConcreteColumns, "concrete_columns")
	validateConcreteList(v, b.ConcreteBeams, "concrete_beams")
	validateConcreteList(v, b.ConcreteSlabs, "concrete_slabs")

	v.Check(b.SteelCA50 >= 0, "steel_ca50", "cannot be negative")
	v.Check(b.SteelCA60 >= 0, "steel_ca60", "cannot be negative")
	v.Check(b.SteelCA50 > 0 || b.SteelCA60 > 0, "steel", "at least one steel value must be greater than 0")

	if b.FormColumns != nil {
		v.Check(*b.FormColumns >= 0, "form_columns", "cannot be negative")
	}
	if b.FormBeams != nil {
		v.Check(*b.FormBeams >= 0, "form_beams", "cannot be negative")
	}
	if b.FormSlabs != nil {
		v.Check(*b.FormSlabs >= 0, "form_slabs", "cannot be negative")
	}
	if b.FormTotal != nil {
		v.Check(*b.FormTotal >= 0, "form_total", "cannot be negative")
	}
	if b.ColumnNumber != nil {
		v.Check(*b.ColumnNumber >= 0, "column_number", "cannot be negative")
	}
	if b.AvgBeamSpan != nil {
		v.Check(*b.AvgBeamSpan >= 0, "avg_beam_span", "cannot be negative")
	}
	if b.AvgSlabSpan != nil {
		v.Check(*b.AvgSlabSpan >= 0, "avg_slab_span", "cannot be negative")
	}
}

func validateConcreteList(v *validator.Validator, list []Concrete, fieldPrefix string) {
	fckSet := make(map[string]struct{})
	for _, c := range list {
		v.Check(c.Volume > 0, fieldPrefix+".volume", "must be greater than 0")
		v.Check(c.Fck != "", fieldPrefix+".fck", "must be provided")
		if _, exists := fckSet[c.Fck]; exists {
			v.Check(false, fieldPrefix+".fck", "duplicate fck value: "+c.Fck)
		} else {
			fckSet[c.Fck] = struct{}{}
		}
	}
	v.Check(len(list) > 0, fieldPrefix, "must have at least one item")
}

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
	// case "structural_masonry":
	// 	var m StructuralMasonry
	// 	if err := json.Unmarshal(data, &m); err != nil {
	// 		return nil, err
	// 	}
	// 	return &m, nil
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

func calculateConcrete(list []Concrete, sidac SidacMaterial) (Consuption, error) {
	var result Consuption
	for _, c := range list {
		val, ok := sidac.KgCO2[c.Fck]
		if !ok {
			return result, errors.New("fck not found in sidacConcreteData: " + c.Fck)
		}
		result.CO2Min += val.Min * c.Volume
		result.CO2Max += val.Max * c.Volume
	}
	for _, c := range list {
		val, ok := sidac.MJ[c.Fck]
		if !ok {
			return result, errors.New("fck not found in sidacConcreteData: " + c.Fck)
		}
		result.EnergyMin += val.Min * c.Volume
		result.EnergyMax += val.Max * c.Volume
	}
	return result, nil
}

func calculateSteel(ca50, ca60 float64, sidac SidacMaterial) (Consuption, error) {
	var result Consuption

	val, ok := sidac.KgCO2["50"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 50")
	}
	result.CO2Min += val.Min * ca50
	result.CO2Max += val.Max * ca50

	val, ok = sidac.MJ["50"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 50")
	}
	result.EnergyMin += val.Min * ca50
	result.EnergyMax += val.Max * ca50

	val, ok = sidac.KgCO2["60"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 60")
	}
	result.CO2Min += val.Min * ca60
	result.CO2Max += val.Max * ca60

	val, ok = sidac.MJ["60"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 60")
	}
	result.EnergyMin += val.Min * ca60
	result.EnergyMax += val.Max * ca60

	return result, nil
}

func addConcreteList(total *Consuption, list []Concrete, sidac SidacMaterial) error {
	result, err := calculateConcrete(list, sidac)
	if err != nil {
		return err
	}
	total.sum(result)
	return nil
}

func (w *ConcreteWall) Calculate() (Consuption, error) {
	total := Consuption{}

	if err := addConcreteList(&total, w.ConcreteWalls, sidacConcreteData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteList(&total, w.ConcreteSlabs, sidacConcreteData); err != nil {
		return Consuption{}, err
	}
	steel, err := calculateSteel(w.SteelCA50, w.SteelCA60, sidacSteelData)
	if err != nil {
		return Consuption{}, err
	}
	total.sum(steel)

	total.divideByArea(w.FloorArea)
	return total, nil
}

func (b *BeamColumn) Calculate() (Consuption, error) {
	total := Consuption{}

	if err := addConcreteList(&total, b.ConcreteColumns, sidacConcreteData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteList(&total, b.ConcreteBeams, sidacConcreteData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteList(&total, b.ConcreteSlabs, sidacConcreteData); err != nil {
		return Consuption{}, err
	}
	steel, err := calculateSteel(b.SteelCA50, b.SteelCA60, sidacSteelData)
	if err != nil {
		return Consuption{}, err
	}
	total.sum(steel)

	total.divideByArea(b.FloorArea)
	return total, nil
}

type InsertOptions struct {
	Version *int32
	ID      *int64
}

func (b *BeamColumn) Insert(models data.Models, unitID int64, result Consuption, opts *InsertOptions) error {
	columns := aggregateConcreteVolumes(b.ConcreteColumns)
	beams := aggregateConcreteVolumes(b.ConcreteBeams)
	slabs := aggregateConcreteVolumes(b.ConcreteSlabs)

	module := &data.BeamColumnModule{
		UnitID:          unitID,
		Name:            b.Name,
		FloorRepetition: b.FloorRepetition,
		FloorArea:       b.FloorArea,
		FloorHeight:     b.FloorHeight,
		ConcreteColumns: *columns,
		ConcreteBeams:   *beams,
		ConcreteSlabs:   *slabs,
		SteelCA50:       b.SteelCA50,
		SteelCA60:       b.SteelCA60,
		FormColumns:     b.FormColumns,
		FormBeams:       b.FormBeams,
		FormSlabs:       b.FormSlabs,
		FormTotal:       b.FormTotal,
		ColumnNumber:    b.ColumnNumber,
		AvgBeamSpan:     b.AvgBeamSpan,
		AvgSlabSpan:     b.AvgSlabSpan,
		TotalCO2Min:     &result.CO2Min,
		TotalCO2Max:     &result.CO2Max,
		TotalEnergyMin:  &result.EnergyMin,
		TotalEnergyMax:  &result.EnergyMax,
		Version:         1,
		InUse:           true,
	}

	if opts != nil {
		if opts.ID != nil && *opts.ID > 0 {
			module.ID = *opts.ID
		}
		
		if opts.Version != nil && *opts.Version > 0 {
			module.Version = *opts.Version
		}
	}
	
	return models.BeamColumnModules.Insert(module)
}

func (w *ConcreteWall) Insert(models data.Models, unitID int64, result Consuption, opts *InsertOptions) error {
	walls := aggregateConcreteVolumes(w.ConcreteWalls)
	slabs := aggregateConcreteVolumes(w.ConcreteSlabs)

	module := &data.ConcreteWallModule{
		UnitID:          unitID,
		Name:            w.Name,
		FloorRepetition: w.FloorRepetition,
		FloorArea:       w.FloorArea,
		FloorHeight:     w.FloorHeight,
		ConcreteWalls:   *walls,
		ConcreteSlabs:   *slabs,
		SteelCA50:       w.SteelCA50,
		SteelCA60:       w.SteelCA60,
		WallThickness:   w.WallThickness,
		SlabThickness:   w.SlabThickness,
		FormArea:        w.FormArea,
		WallArea:        w.WallArea,
		TotalCO2Min:     &result.CO2Min,
		TotalCO2Max:     &result.CO2Max,
		TotalEnergyMin:  &result.EnergyMin,
		TotalEnergyMax:  &result.EnergyMax,
		Version:         1,
		InUse:           true,
	}

	if opts != nil {
		if opts.ID != nil && *opts.ID > 0 {
			module.ID = *opts.ID
		}
		if opts.Version != nil && *opts.Version > 0 {
			module.Version = *opts.Version
		}
	}
	return models.ConcreteWallModules.Insert(module)
}

func (w *ConcreteWall) GetLatestVersion(models data.Models, moduleID int64) (int32, error) {
	return models.ConcreteWallModules.GetLatestVersion(moduleID)
}

func (w *BeamColumn) GetLatestVersion(models data.Models, moduleID int64) (int32, error) {
	return models.BeamColumnModules.GetLatestVersion(moduleID)
}

func aggregateConcreteVolumes(list []Concrete) *data.Concrete {
	c := &data.Concrete{}
	for _, item := range list {
		switch item.Fck {
		case "20":
			c.VolumeFck20 += item.Volume
		case "25":
			c.VolumeFck25 += item.Volume
		case "30":
			c.VolumeFck30 += item.Volume
		case "35":
			c.VolumeFck35 += item.Volume
		case "40":
			c.VolumeFck40 += item.Volume
		case "45":
			c.VolumeFck45 += item.Volume
		}
	}
	return c
}

func toConcrete(c data.Concrete) []Concrete {
	var concretes []Concrete
	if c.VolumeFck20 > 0 {
		concretes = append(concretes, Concrete{Fck: "20", Volume: c.VolumeFck20})
	}
	if c.VolumeFck25 > 0 {
		concretes = append(concretes, Concrete{Fck: "25", Volume: c.VolumeFck25})
	}
	if c.VolumeFck30 > 0 {
		concretes = append(concretes, Concrete{Fck: "30", Volume: c.VolumeFck30})
	}
	if c.VolumeFck35 > 0 {
		concretes = append(concretes, Concrete{Fck: "35", Volume: c.VolumeFck35})
	}
	if c.VolumeFck40 > 0 {
		concretes = append(concretes, Concrete{Fck: "40", Volume: c.VolumeFck40})
	}
	if c.VolumeFck45 > 0 {
		concretes = append(concretes, Concrete{Fck: "45", Volume: c.VolumeFck45})
	}
	return concretes
}

func toBeamColumnResponse(m *data.BeamColumnModule) *BeamColumn {
	return &BeamColumn{
		BasicModuleData: BasicModuleData{
			Name:            m.Name,
			StructureType:   "beam_column",
			FloorRepetition: m.FloorRepetition,
			FloorArea:       m.FloorArea,
			FloorHeight:     m.FloorHeight,
		},
		ModuleResponseData: ModuleResponseData{
			CO2Min:    m.TotalCO2Min,
			CO2Max:    m.TotalCO2Max,
			EnergyMin: m.TotalEnergyMin,
			EnergyMax: m.TotalEnergyMax,
			InUse:     m.InUse,
			Version:   m.Version,
		},
		ConcreteColumns: toConcrete(m.ConcreteColumns),
		ConcreteBeams:   toConcrete(m.ConcreteBeams),
		ConcreteSlabs:   toConcrete(m.ConcreteSlabs),
		SteelCA50:       m.SteelCA50,
		SteelCA60:       m.SteelCA60,
		FormColumns:     m.FormColumns,
		FormBeams:       m.FormBeams,
		FormSlabs:       m.FormSlabs,
		FormTotal:       m.FormTotal,
		ColumnNumber:    m.ColumnNumber,
		AvgBeamSpan:     m.AvgBeamSpan,
		AvgSlabSpan:     m.AvgSlabSpan,
	}
}

func toConcreteWallResponse(m *data.ConcreteWallModule) *ConcreteWall {
	return &ConcreteWall{
		BasicModuleData: BasicModuleData{
			Name:            m.Name,
			StructureType:   "concrete_wall",
			FloorRepetition: m.FloorRepetition,
			FloorArea:       m.FloorArea,
			FloorHeight:     m.FloorHeight,
		},
		ModuleResponseData: ModuleResponseData{
			CO2Min:    m.TotalCO2Min,
			CO2Max:    m.TotalCO2Max,
			EnergyMin: m.TotalEnergyMin,
			EnergyMax: m.TotalEnergyMax,
			InUse:     m.InUse,
			Version:   m.Version,
		},
		ConcreteWalls: toConcrete(m.ConcreteWalls),
		ConcreteSlabs: toConcrete(m.ConcreteSlabs),
		SteelCA50:     m.SteelCA50,
		SteelCA60:     m.SteelCA60,
		WallThickness: m.WallThickness,
		SlabThickness: m.SlabThickness,
		FormArea:      m.FormArea,
		WallArea:      m.WallArea,
	}
}

func GetModule(models data.Models, id int64) (any, error) {
	
	concreteWallModules, err := models.ConcreteWallModules.GetById(id)
	if err != nil {
		return nil, err
	}
	if len(concreteWallModules) > 0 {
		var res []*ConcreteWall
		for _, v := range concreteWallModules {
			res = append(res, toConcreteWallResponse(v))
		}
		return res, nil
	}

	beamColumnModules, err := models.BeamColumnModules.GetById(id)
	if err != nil {
		return nil, err
	}
	if len(beamColumnModules) > 0 {
		var res []*BeamColumn
		for _, v := range beamColumnModules {
			res = append(res, toBeamColumnResponse(v))
		}
		return res, nil
	}

	return nil, data.ErrRecordNotFound
}
