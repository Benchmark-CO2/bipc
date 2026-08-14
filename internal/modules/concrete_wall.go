package modules

import (
	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

var concreteWallValidPositions = []ElementPosition{
	ElementPositionWall,
	ElementPositionSlab,
	ElementPositionStair,
}

type ConcreteWall struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`
	Form     []FormAreaItem       `json:"form,omitempty"`

	// Legacy compatibility fields.
	ConcreteWalls ConcreteElement `json:"concrete_walls"`
	ConcreteSlabs ConcreteElement `json:"concrete_slabs"`

	SlabType   *string `json:"slab_type,omitempty"`
	BeamNumber *int    `json:"beam_number,omitempty"`
	SlabNumber *int    `json:"slab_number,omitempty"`

	WallThickness *float64 `json:"wall_thickness,omitempty"`
	SlabThickness *float64 `json:"slab_thickness,omitempty"`
	WallArea      *float64 `json:"wall_area,omitempty"`
	SlabArea      *float64 `json:"slab_area,omitempty"`

	WallFormArea *float64    `json:"wall_form_area,omitempty"`
	SlabFormArea *float64    `json:"slab_form_area,omitempty"`
	FloorIDs     []uuid.UUID `json:"floor_ids"`
	FloorIndexes []int       `json:"floor_indexes,omitempty"`
}

func (w *ConcreteWall) GetType() string { return w.Type }

func (w *ConcreteWall) VersionContract() moduleVersionContract {
	return moduleVersionContract{
		v1Disallowed: []string{"concrete", "steel", "form"},
		v2Disallowed: []string{"concrete_walls", "concrete_slabs", "wall_form_area", "slab_form_area"},
		toV1:         applyV1LegacyResponse,
		toV2: func(moduleMap map[string]any) {
			removeKeys(moduleMap, "concrete_walls", "concrete_slabs", "wall_form_area", "slab_form_area")
		},
	}
}

func (w *ConcreteWall) validPositions() []ElementPosition {
	return append([]ElementPosition(nil), concreteWallValidPositions...)
}

func (w *ConcreteWall) hasNewFormat() bool {
	return len(w.Concrete) > 0 || len(w.Steel) > 0
}

func (w *ConcreteWall) normalizeToNewFormat() {
	if !w.hasNewFormat() {
		elementsByPosition := map[ElementPosition]ConcreteElement{
			ElementPositionWall: w.ConcreteWalls,
			ElementPositionSlab: w.ConcreteSlabs,
		}
		w.Concrete = flattenConcreteByPosition(w.validPositions(), elementsByPosition)
		w.Steel = flattenSteelByPosition(w.validPositions(), elementsByPosition)
	}

	if len(w.Form) > 0 {
		return
	}

	if w.WallFormArea != nil {
		w.Form = append(w.Form, FormAreaItem{Area: *w.WallFormArea, Position: ElementPositionWall})
	}
	if w.SlabFormArea != nil {
		w.Form = append(w.Form, FormAreaItem{Area: *w.SlabFormArea, Position: ElementPositionSlab})
	}
}

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Type != "", "type", "must be provided")
	v.Check(len(w.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(w.FloorIDs), "floor_ids", "must not contain duplicate values")
	validateSlabType(v, w.SlabType)

	w.normalizeToNewFormat()
	validatePositionedConcrete(v, w.Concrete, w.validPositions())
	validatePositionedSteel(v, w.Steel, w.validPositions())
	validatePositionedForm(v, w.Form, w.validPositions())

	if w.WallThickness != nil {
		v.Check(*w.WallThickness >= 0, "wall_thickness", "cannot be negative")
	}
	if w.SlabThickness != nil {
		v.Check(*w.SlabThickness >= 0, "slab_thickness", "cannot be negative")
	}
	if w.WallArea != nil {
		v.Check(*w.WallArea >= 0, "wall_area", "cannot be negative")
	}
	if w.SlabArea != nil {
		v.Check(*w.SlabArea >= 0, "slab_area", "cannot be negative")
	}
	if w.WallFormArea != nil {
		v.Check(*w.WallFormArea >= 0, "wall_form_area", "cannot be negative")
	}
	if w.SlabFormArea != nil {
		v.Check(*w.SlabFormArea >= 0, "slab_form_area", "cannot be negative")
	}
	if w.BeamNumber != nil {
		v.Check(*w.BeamNumber >= 0, "beam_number", "cannot be negative")
	}
	if w.SlabNumber != nil {
		v.Check(*w.SlabNumber >= 0, "slab_number", "cannot be negative")
	}
}

func (w *ConcreteWall) Calculate() (Consumption, error) {
	w.normalizeToNewFormat()

	total := CalculateConcreteConsumption(w.Concrete)

	steelConsumption, err := CalculateSteelConsumption(w.Steel)
	if err != nil {
		return Consumption{}, err
	}
	total.sum(steelConsumption)

	total.Material += concreteVolumeFromItems(w.Concrete)

	return total, nil
}

func (w *ConcreteWall) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	w.normalizeToNewFormat()
	moduleToInsert := w.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, w.FloorIDs, nil,
	)
	if err != nil {
		return nil, err
	}

	insertedModule, err := models.Modules.Insert(moduleToInsert, targets)
	if err != nil {
		return nil, err
	}

	return w.fromDataModule(insertedModule), nil
}

func (w *ConcreteWall) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (w *ConcreteWall) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return w.fromDataModule(dataModule), nil
}

func (w *ConcreteWall) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	w.normalizeToNewFormat()
	module := w.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, w.FloorIDs, nil,
	)
	if err != nil {
		return err
	}

	return models.Modules.Update(module, targets)
}

func (w *ConcreteWall) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"concrete":       w.Concrete,
		"steel":          w.Steel,
		"form":           w.Form,
		"slab_type":      normalizeSlabType(w.SlabType),
		"beam_number":    w.BeamNumber,
		"slab_number":    w.SlabNumber,
		"wall_thickness": w.WallThickness,
		"slab_thickness": w.SlabThickness,
		"wall_area":      w.WallArea,
		"slab_area":      w.SlabArea,
		"wall_form_area": w.WallFormArea,
		"slab_form_area": w.SlabFormArea,
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "concrete_wall",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		TotalMaterial:  &result.Material,
		FloorIDs:       w.FloorIDs,
	}
}

func (w *ConcreteWall) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	concreteItems := concreteVolumesFromInterface(d.Data["concrete"])
	steelItems := steelMaterialsFromInterface(d.Data["steel"])
	formItems := formAreasFromInterface(d.Data["form"])

	if len(concreteItems) == 0 && len(steelItems) == 0 {
		var legacyWalls, legacySlabs ConcreteElement
		if wallData, ok := d.Data["concrete_walls"].(map[string]interface{}); ok {
			legacyWalls = concreteElementFromMap(wallData)
		}
		if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
			legacySlabs = concreteElementFromMap(slabData)
		}

		legacyByPosition := map[ElementPosition]ConcreteElement{
			ElementPositionWall: legacyWalls,
			ElementPositionSlab: legacySlabs,
		}
		concreteItems = flattenConcreteByPosition(w.validPositions(), legacyByPosition)
		steelItems = flattenSteelByPosition(w.validPositions(), legacyByPosition)
	}

	elementsByPosition := groupConcreteByPosition(concreteItems)
	elementsByPosition = groupSteelByPosition(elementsByPosition, steelItems)
	legacyWalls := elementsByPosition[ElementPositionWall]
	legacySlabs := elementsByPosition[ElementPositionSlab]

	if len(formItems) == 0 {
		if wallFormArea := extractFloat64Pointer(d.Data, "wall_form_area"); wallFormArea != nil {
			formItems = append(formItems, FormAreaItem{Area: *wallFormArea, Position: ElementPositionWall})
		}
		if slabFormArea := extractFloat64Pointer(d.Data, "slab_form_area"); slabFormArea != nil {
			formItems = append(formItems, FormAreaItem{Area: *slabFormArea, Position: ElementPositionSlab})
		}
	}

	return &ConcreteWall{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "concrete_wall", Outdated: d.Outdated},
		Consumption:     consumption,
		Concrete:        concreteItems,
		Steel:           steelItems,
		Form:            formItems,
		ConcreteWalls:   legacyWalls,
		ConcreteSlabs:   legacySlabs,
		SlabType:        extractStringPointer(d.Data, "slab_type"),
		BeamNumber:      extractIntPointer(d.Data, "beam_number"),
		SlabNumber:      extractIntPointer(d.Data, "slab_number"),
		WallThickness:   extractFloat64Pointer(d.Data, "wall_thickness"),
		SlabThickness:   extractFloat64Pointer(d.Data, "slab_thickness"),
		WallArea:        extractFloat64Pointer(d.Data, "wall_area"),
		SlabArea:        extractFloat64Pointer(d.Data, "slab_area"),
		WallFormArea:    extractFloat64Pointer(d.Data, "wall_form_area"),
		SlabFormArea:    extractFloat64Pointer(d.Data, "slab_form_area"),
		FloorIDs:        d.FloorIDs,
		FloorIndexes:    d.FloorIndexes,
	}
}
