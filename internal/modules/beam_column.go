package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var beamColumnValidPositions = []ElementPosition{
	ElementPositionColumn,
	ElementPositionBeam,
	ElementPositionSlab,
	ElementPositionStair,
}

type BeamColumn struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`
	Form     []FormAreaItem       `json:"form,omitempty"`

	// Legacy compatibility fields.
	ConcreteColumns ConcreteElement `json:"concrete_columns,omitempty"`
	ConcreteBeams   ConcreteElement `json:"concrete_beams,omitempty"`
	ConcreteSlabs   ConcreteElement `json:"concrete_slabs,omitempty"`

	SlabType     *string     `json:"slab_type,omitempty"`
	FormColumns  *float64    `json:"form_columns,omitempty"`
	FormBeams    *float64    `json:"form_beams,omitempty"`
	FormSlabs    *float64    `json:"form_slabs,omitempty"`
	FormTotal    *float64    `json:"form_total,omitempty"`
	BeamNumber   *int        `json:"beam_number,omitempty"`
	SlabNumber   *int        `json:"slab_number,omitempty"`
	ColumnNumber *int        `json:"column_number,omitempty"`
	AvgBeamSpan  *float64    `json:"avg_beam_span,omitempty"`
	AvgSlabSpan  *float64    `json:"avg_slab_span,omitempty"`
	FloorIDs     []uuid.UUID `json:"floor_ids"`
	FloorIndexes []int       `json:"floor_indexes,omitempty"`
}

func (b *BeamColumn) GetType() string { return b.Type }

func (b *BeamColumn) VersionContract() moduleVersionContract {
	return moduleVersionContract{
		v1Disallowed: []string{"concrete", "steel", "form"},
		v2Disallowed: []string{"concrete_columns", "concrete_beams", "concrete_slabs", "form_columns", "form_beams", "form_slabs", "form_total"},
		toV1:         applyV1LegacyResponse,
		toV2: func(moduleMap map[string]any) {
			removeKeys(moduleMap, "concrete_columns", "concrete_beams", "concrete_slabs")
		},
	}
}

func (b *BeamColumn) validPositions() []ElementPosition {
	return append([]ElementPosition(nil), beamColumnValidPositions...)
}

func (b *BeamColumn) hasNewFormat() bool {
	return len(b.Concrete) > 0 || len(b.Steel) > 0
}

func (b *BeamColumn) normalizeToNewFormat() {
	if !b.hasNewFormat() {
		elementsByPosition := map[ElementPosition]ConcreteElement{
			ElementPositionColumn: b.ConcreteColumns,
			ElementPositionBeam:   b.ConcreteBeams,
			ElementPositionSlab:   b.ConcreteSlabs,
		}
		b.Concrete = flattenConcreteByPosition(b.validPositions(), elementsByPosition)
		b.Steel = flattenSteelByPosition(b.validPositions(), elementsByPosition)
	}

	if len(b.Form) > 0 {
		return
	}

	if b.FormColumns != nil {
		b.Form = append(b.Form, FormAreaItem{Area: *b.FormColumns, Position: ElementPositionColumn})
	}
	if b.FormBeams != nil {
		b.Form = append(b.Form, FormAreaItem{Area: *b.FormBeams, Position: ElementPositionBeam})
	}
	if b.FormSlabs != nil {
		b.Form = append(b.Form, FormAreaItem{Area: *b.FormSlabs, Position: ElementPositionSlab})
	}
	if b.FormTotal != nil {
		b.Form = append(b.Form, FormAreaItem{Area: *b.FormTotal})
	}
}

func (b *BeamColumn) Validate(v *validator.Validator) {
	v.Check(b.Type != "", "type", "must be provided")
	v.Check(len(b.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(b.FloorIDs), "floor_ids", "must not contain duplicate values")

	validateSlabType(v, b.SlabType)

	b.normalizeToNewFormat()
	validatePositionedConcrete(v, b.Concrete, b.validPositions())
	validatePositionedSteel(v, b.Steel, b.validPositions())
	validatePositionedForm(v, b.Form, b.validPositions())
	v.Check(len(b.Steel) > 0, "steel", "must have at least one item")

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
	if b.BeamNumber != nil {
		v.Check(*b.BeamNumber >= 0, "beam_number", "cannot be negative")
	}
	if b.SlabNumber != nil {
		v.Check(*b.SlabNumber >= 0, "slab_number", "cannot be negative")
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
	b.normalizeToNewFormat()

	total := CalculateConcreteConsumption(b.Concrete)

	steelConsumption, err := CalculateSteelConsumption(b.Steel)
	if err != nil {
		return Consumption{}, err
	}
	total.sum(steelConsumption)

	total.Material += concreteVolumeFromItems(b.Concrete)

	return total, nil
}

func (b *BeamColumn) Insert(models data.Models, optionID uuid.UUID, result Consumption, source string, completed bool) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	b.normalizeToNewFormat()
	moduleToInsert := b.toDataModule(moduleID, optionID, result, source, completed)

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

func (b *BeamColumn) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption, source string, completed bool) error {
	b.normalizeToNewFormat()
	module := b.toDataModule(moduleID, optionID, result, source, completed)

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

func (b *BeamColumn) toDataModule(moduleID, optionID uuid.UUID, result Consumption, source string, completed bool) *data.Module {
	moduleData := map[string]interface{}{
		"concrete":      b.Concrete,
		"steel":         b.Steel,
		"form":          b.Form,
		"slab_type":     normalizeSlabType(b.SlabType),
		"form_columns":  b.FormColumns,
		"form_beams":    b.FormBeams,
		"form_slabs":    b.FormSlabs,
		"form_total":    b.FormTotal,
		"beam_number":   b.BeamNumber,
		"slab_number":   b.SlabNumber,
		"column_number": b.ColumnNumber,
		"avg_beam_span": b.AvgBeamSpan,
		"avg_slab_span": b.AvgSlabSpan,
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "beam_column",
		OptionID:       optionID,
		Data:           moduleData,
		Source:         source,
		Completed:      completed,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		TotalMaterial:  &result.Material,
		FloorIDs:       b.FloorIDs,
	}
}

func (b *BeamColumn) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	concreteItems := concreteVolumesFromInterface(d.Data["concrete"])
	steelItems := steelMaterialsFromInterface(d.Data["steel"])
	formItems := formAreasFromInterface(d.Data["form"])

	if len(concreteItems) == 0 && len(steelItems) == 0 {
		var legacyColumns, legacyBeams, legacySlabs ConcreteElement

		if colData, ok := d.Data["concrete_columns"].(map[string]interface{}); ok {
			legacyColumns = concreteElementFromMap(colData)
		}
		if beamData, ok := d.Data["concrete_beams"].(map[string]interface{}); ok {
			legacyBeams = concreteElementFromMap(beamData)
		}
		if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
			legacySlabs = concreteElementFromMap(slabData)
		}

		legacyByPosition := map[ElementPosition]ConcreteElement{
			ElementPositionColumn: legacyColumns,
			ElementPositionBeam:   legacyBeams,
			ElementPositionSlab:   legacySlabs,
		}
		concreteItems = flattenConcreteByPosition(b.validPositions(), legacyByPosition)
		steelItems = flattenSteelByPosition(b.validPositions(), legacyByPosition)
	}

	elementsByPosition := groupConcreteByPosition(concreteItems)
	elementsByPosition = groupSteelByPosition(elementsByPosition, steelItems)
	legacyColumns := elementsByPosition[ElementPositionColumn]
	legacyBeams := elementsByPosition[ElementPositionBeam]
	legacySlabs := elementsByPosition[ElementPositionSlab]

	if len(formItems) == 0 {
		if formColumns := extractFloat64Pointer(d.Data, "form_columns"); formColumns != nil {
			formItems = append(formItems, FormAreaItem{Area: *formColumns, Position: ElementPositionColumn})
		}
		if formBeams := extractFloat64Pointer(d.Data, "form_beams"); formBeams != nil {
			formItems = append(formItems, FormAreaItem{Area: *formBeams, Position: ElementPositionBeam})
		}
		if formSlabs := extractFloat64Pointer(d.Data, "form_slabs"); formSlabs != nil {
			formItems = append(formItems, FormAreaItem{Area: *formSlabs, Position: ElementPositionSlab})
		}
		if formTotal := extractFloat64Pointer(d.Data, "form_total"); formTotal != nil {
			formItems = append(formItems, FormAreaItem{Area: *formTotal})
		}
	}

	return &BeamColumn{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "beam_column", Outdated: d.Outdated, Completed: d.Completed},
		Consumption:     consumption,
		Concrete:        concreteItems,
		Steel:           steelItems,
		Form:            formItems,
		ConcreteColumns: legacyColumns,
		ConcreteBeams:   legacyBeams,
		ConcreteSlabs:   legacySlabs,
		SlabType:        extractStringPointer(d.Data, "slab_type"),
		FormColumns:     extractFloat64Pointer(d.Data, "form_columns"),
		FormBeams:       extractFloat64Pointer(d.Data, "form_beams"),
		FormSlabs:       extractFloat64Pointer(d.Data, "form_slabs"),
		FormTotal:       extractFloat64Pointer(d.Data, "form_total"),
		BeamNumber:      extractIntPointer(d.Data, "beam_number"),
		SlabNumber:      extractIntPointer(d.Data, "slab_number"),
		ColumnNumber:    extractIntPointer(d.Data, "column_number"),
		AvgBeamSpan:     extractFloat64Pointer(d.Data, "avg_beam_span"),
		AvgSlabSpan:     extractFloat64Pointer(d.Data, "avg_slab_span"),
		FloorIDs:        d.FloorIDs,
		FloorIndexes:    d.FloorIndexes,
	}
}
