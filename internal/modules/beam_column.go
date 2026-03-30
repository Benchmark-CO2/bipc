package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BeamColumn struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption     *Consumption    `json:"consumption,omitempty"`
	ConcreteColumns ConcreteElement `json:"concrete_columns,omitempty"`
	ConcreteBeams   ConcreteElement `json:"concrete_beams,omitempty"`
	ConcreteSlabs   ConcreteElement `json:"concrete_slabs,omitempty"`
	FormColumns     *float64        `json:"form_columns,omitempty"`
	FormBeams       *float64        `json:"form_beams,omitempty"`
	FormSlabs       *float64        `json:"form_slabs,omitempty"`
	FormTotal       *float64        `json:"form_total,omitempty"`
	ColumnNumber    *int            `json:"column_number,omitempty"`
	AvgBeamSpan     *float64        `json:"avg_beam_span,omitempty"`
	AvgSlabSpan     *float64        `json:"avg_slab_span,omitempty"`
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

func (b *BeamColumn) Calculate() (Consumption, error) {
	total := Consumption{}

	if err := addConcreteElement(&total, b.ConcreteColumns, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}
	if err := addConcreteElement(&total, b.ConcreteBeams, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}
	if err := addConcreteElement(&total, b.ConcreteSlabs, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}

	return total, nil
}

func (b *BeamColumn) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := b.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, b.FloorIDs, nil,
	)
	if err != nil {
		return nil, err
	}

	insertedModule, err := models.Modules.Insert(moduleToInsert, targets)
	if err != nil {
		return nil, err
	}

	return b.fromDataModule(insertedModule), nil
}

func (b *BeamColumn) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (b *BeamColumn) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return b.fromDataModule(dataModule), nil
}

func (b *BeamColumn) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := b.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, b.FloorIDs, nil,
	)
	if err != nil {
		return err
	}

	return models.Modules.Update(module, targets)
}

func (b *BeamColumn) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"concrete_columns": b.ConcreteColumns,
		"concrete_beams":   b.ConcreteBeams,
		"concrete_slabs":   b.ConcreteSlabs,
		"form_columns":     b.FormColumns,
		"form_beams":       b.FormBeams,
		"form_slabs":       b.FormSlabs,
		"form_total":       b.FormTotal,
		"column_number":    b.ColumnNumber,
		"avg_beam_span":    b.AvgBeamSpan,
		"avg_slab_span":    b.AvgSlabSpan,
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "beam_column",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		FloorIDs:       b.FloorIDs,
	}
}

func (b *BeamColumn) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	var concreteColumns, concreteBeams, concreteSlabs ConcreteElement

	if colData, ok := d.Data["concrete_columns"].(map[string]interface{}); ok {
		concreteColumns = concreteElementFromMap(colData)
	}
	if beamData, ok := d.Data["concrete_beams"].(map[string]interface{}); ok {
		concreteBeams = concreteElementFromMap(beamData)
	}
	if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
		concreteSlabs = concreteElementFromMap(slabData)
	}

	return &BeamColumn{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "beam_column", Outdated: d.Outdated},
		Consumption:     consumption,
		ConcreteColumns: concreteColumns,
		ConcreteBeams:   concreteBeams,
		ConcreteSlabs:   concreteSlabs,
		FormColumns:     extractFloat64Pointer(d.Data, "form_columns"),
		FormBeams:       extractFloat64Pointer(d.Data, "form_beams"),
		FormSlabs:       extractFloat64Pointer(d.Data, "form_slabs"),
		FormTotal:       extractFloat64Pointer(d.Data, "form_total"),
		ColumnNumber:    extractIntPointer(d.Data, "column_number"),
		AvgBeamSpan:     extractFloat64Pointer(d.Data, "avg_beam_span"),
		AvgSlabSpan:     extractFloat64Pointer(d.Data, "avg_slab_span"),
		FloorIDs:        d.FloorIDs,
	}
}
