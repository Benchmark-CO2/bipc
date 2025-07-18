package modules

import (
	"errors"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

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

func (b *BeamColumn) Type() string { return b.StructureType }

func (b *BeamColumn) Validate(v *validator.Validator) {
	v.Check(b.Name != "", "name", "must be provided")
	v.Check(b.StructureType != "", "structure_type", "must be provided")
	b.ValidateVersion(v)
}

func (b *BeamColumn) ValidateVersion(v *validator.Validator) {
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



func (b *BeamColumn) GetVersions(models data.Models, moduleID int64) (any, error) {
	beamColumnModules, err := models.BeamColumnModules.GetById(moduleID)
	if err != nil {
		return nil, err
	}
	var res []*BeamColumn
	for _, v := range beamColumnModules {
		res = append(res, toBeamColumnResponse(v))
	}
	return res, nil
}

func (w *BeamColumn) MergeModuleData(models data.Models, moduleID int64) (*int32, error) {
	beamColumnModules, err := models.BeamColumnModules.GetById(moduleID)
	if err != nil {
		return nil, err
	}
	var res []*BeamColumn
	for _, v := range beamColumnModules {
		res = append(res, toBeamColumnResponse(v))
	}

	if len(res) == 0 {
		return nil, errors.New("no existing versions found for BeamColumn")
	}
	last := res[len(res)-1]
	w.Version = last.Version + 1
	w.Name = last.Name

	return &w.Version, nil
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
