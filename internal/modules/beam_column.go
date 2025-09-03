package modules

import (
	"github.com/gofrs/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BeamColumn struct {
	BasicModuleData
	ConcreteColumns ConcreteElement `json:"concrete_columns"`
	ConcreteBeams   ConcreteElement `json:"concrete_beams"`
	ConcreteSlabs   ConcreteElement `json:"concrete_slabs"`
	FormColumns     *float64        `json:"form_columns,omitempty"`
	FormBeams       *float64        `json:"form_beams,omitempty"`
	FormSlabs       *float64        `json:"form_slabs,omitempty"`
	FormTotal       *float64        `json:"form_total,omitempty"`
	ColumnNumber    *int            `json:"column_number,omitempty"`
	AvgBeamSpan     *int            `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *int            `json:"avg_slab_span,omitempty"`
	FloorIDs        []uuid.UUID     `json:"floor_ids"`
}

func (b *BeamColumn) GetType() string { return b.Type }

func (b *BeamColumn) Validate(v *validator.Validator) {
	v.Check(b.Type != "", "type", "must be provided")
	v.Check(len(b.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(b.FloorIDs), "floor_ids", "must not contain duplicate values")

	validateConcreteElement(v, b.ConcreteColumns, "concrete_columns")
	validateConcreteElement(v, b.ConcreteBeams, "concrete_beams")
	validateConcreteElement(v, b.ConcreteSlabs, "concrete_slabs")

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

	if err := addConcreteElement(&total, b.ConcreteColumns, sidacConcreteData, sidacSteelData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteElement(&total, b.ConcreteBeams, sidacConcreteData, sidacSteelData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteElement(&total, b.ConcreteSlabs, sidacConcreteData, sidacSteelData); err != nil {
		return Consuption{}, err
	}

	return total, nil
}

func (b *BeamColumn) Insert(models data.Models, optionID uuid.UUID, result Consuption) error {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return err
	}

	module := toBeamColumnModule(b, moduleID, optionID, result)
	module.TowerOptionID = optionID

	err = models.BeamColumnModules.Insert(module)
	if err != nil {
		return err
	}

	return nil
}

func toBeamColumnModule(b *BeamColumn, moduleID uuid.UUID, optionID uuid.UUID, result Consuption) *data.BeamColumnModule {
	return &data.BeamColumnModule{
		ID:              moduleID,
		TowerOptionID:   optionID,
		ConcreteColumns: toDataConcrete(b.ConcreteColumns),
		ConcreteBeams:   toDataConcrete(b.ConcreteBeams),
		ConcreteSlabs:   toDataConcrete(b.ConcreteSlabs),
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
		FloorIDs:        b.FloorIDs,
	}
}
