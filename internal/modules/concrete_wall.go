package modules

import (
	"fmt"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

const (
	ConcreteWallPositionWall = "wall"
	ConcreteWallPositionSlab = "slab"
)

var concreteWallValidPositions = []string{
	ConcreteWallPositionWall,
	ConcreteWallPositionSlab,
}

type ConcreteWall struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`

	// Legacy compatibility fields.
	ConcreteWalls ConcreteElement `json:"concrete_walls"`
	ConcreteSlabs ConcreteElement `json:"concrete_slabs"`

	SlabType *string `json:"slab_type,omitempty"`

	WallThickness *float64 `json:"wall_thickness,omitempty"`
	SlabThickness *float64 `json:"slab_thickness,omitempty"`
	WallArea      *float64 `json:"wall_area,omitempty"`
	SlabArea      *float64 `json:"slab_area,omitempty"`

	WallFormArea *float64    `json:"wall_form_area,omitempty"`
	SlabFormArea *float64    `json:"slab_form_area,omitempty"`
	FloorIDs     []uuid.UUID `json:"floor_ids"`
}

func (w *ConcreteWall) GetType() string { return w.Type }

func (w *ConcreteWall) hasNewFormat() bool {
	return len(w.Concrete) > 0 || len(w.Steel) > 0
}

func (w *ConcreteWall) normalizeToNewFormat() {
	if w.hasNewFormat() {
		// New format has precedence; ignore legacy payload when both are provided.
		return
	}

	w.Concrete, w.Steel = flattenConcreteAndSteelByPosition(map[string]ConcreteElement{
		ConcreteWallPositionWall: w.ConcreteWalls,
		ConcreteWallPositionSlab: w.ConcreteSlabs,
	})
}

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Type != "", "type", "must be provided")
	v.Check(len(w.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(w.FloorIDs), "floor_ids", "must not contain duplicate values")
	validateSlabType(v, w.SlabType)

	w.normalizeToNewFormat()
	w.validateNewFormat(v)

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
}

func (w *ConcreteWall) validateNewFormat(v *validator.Validator) {
	fckPositionSet := make(map[string]struct{})
	for i, item := range w.Concrete {
		prefix := fmt.Sprintf("concrete[%d]", i)
		v.Check(item.Volume > 0, prefix+".volume", "must be greater than 0")
		v.Check(item.Fck != 0, prefix+".fck", "must be provided")
		v.Check(item.Position != "", prefix+".position", "must be provided")
		v.Check(validator.PermittedValue(item.Position, concreteWallValidPositions...), prefix+".position", fmt.Sprintf("must be one of: %s", strings.Join(concreteWallValidPositions, ", ")))

		key := fmt.Sprintf("%s_%d", item.Position, item.Fck)
		if _, exists := fckPositionSet[key]; exists {
			v.Check(false, prefix+".fck", fmt.Sprintf("duplicate fck %d for position %s", item.Fck, item.Position))
		} else {
			fckPositionSet[key] = struct{}{}
		}
	}
	v.Check(len(w.Concrete) > 0, "concrete", "must have at least one item")

	ValidateSteelMaterials(v, w.Steel, "steel")
	for i, item := range w.Steel {
		prefix := fmt.Sprintf("steel[%d]", i)
		v.Check(item.Position != "", prefix+".position", "must be provided")
		v.Check(validator.PermittedValue(item.Position, concreteWallValidPositions...), prefix+".position", fmt.Sprintf("must be one of: %s", strings.Join(concreteWallValidPositions, ", ")))
	}
	v.Check(len(w.Steel) > 0, "steel", "must have at least one item")
}

func flattenConcreteAndSteelByPosition(elementsByPosition map[string]ConcreteElement) (concrete []ConcreteVolumeItem, steel []SteelMaterial) {
	for position, element := range elementsByPosition {
		for _, v := range element.Volumes {
			concrete = append(concrete, ConcreteVolumeItem{Fck: v.Fck, Volume: v.Volume, Position: position})
		}
		for _, s := range element.Steel {
			steel = append(steel, SteelMaterial{
				Material:        s.Material,
				OtherName:       s.OtherName,
				Resistance:      s.Resistance,
				OtherResistance: s.OtherResistance,
				Mass:            s.Mass,
				Position:        position,
			})
		}
	}
	return concrete, steel
}

func groupConcreteAndSteelByPosition(concrete []ConcreteVolumeItem, steel []SteelMaterial) map[string]ConcreteElement {
	elementsByPosition := map[string]ConcreteElement{}

	for _, item := range concrete {
		element := elementsByPosition[item.Position]
		element.Volumes = append(element.Volumes, ConcreteVolumeItem{Fck: item.Fck, Volume: item.Volume})
		elementsByPosition[item.Position] = element
	}

	for _, s := range steel {
		element := elementsByPosition[s.Position]
		element.Steel = append(element.Steel, SteelMaterial{
			Material:        s.Material,
			OtherName:       s.OtherName,
			Resistance:      s.Resistance,
			OtherResistance: s.OtherResistance,
			Mass:            s.Mass,
			Position:        s.Position,
		})
		elementsByPosition[s.Position] = element
	}

	return elementsByPosition
}

func (w *ConcreteWall) Calculate() (Consumption, error) {
	w.normalizeToNewFormat()

	var total Consumption
	for _, item := range w.Concrete {
		fck := float64(item.Fck)

		co2Val, ok := sidacConcreteData.KgCO2[fck]
		if !ok {
			co2Val = sidacConcreteData.KgCO2[40]
		}
		total.CO2Min += co2Val.Min * item.Volume
		total.CO2Max += co2Val.Max * item.Volume

		energyVal, ok := sidacConcreteData.MJ[fck]
		if !ok {
			energyVal = sidacConcreteData.MJ[40]
		}
		total.EnergyMin += energyVal.Min * item.Volume
		total.EnergyMax += energyVal.Max * item.Volume
	}

	steelConsumption, err := CalculateSteelConsumption(w.Steel)
	if err != nil {
		return Consumption{}, err
	}
	total.sum(steelConsumption)

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
		"slab_type":      normalizeSlabType(w.SlabType),
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
		FloorIDs:       w.FloorIDs,
	}
}

func (w *ConcreteWall) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	var concreteItems []ConcreteVolumeItem
	if rawItems, ok := d.Data["concrete"].([]interface{}); ok {
		for _, v := range rawItems {
			volMap, ok := v.(map[string]interface{})
			if !ok {
				continue
			}
			item := ConcreteVolumeItem{
				Fck:    int(volMap["fck"].(float64)),
				Volume: volMap["volume"].(float64),
			}
			if pos, ok := volMap["position"].(string); ok {
				item.Position = pos
			}
			concreteItems = append(concreteItems, item)
		}
	}

	var steelItems []SteelMaterial
	if steelData, ok := d.Data["steel"].([]interface{}); ok {
		for _, v := range steelData {
			steelMap, ok := v.(map[string]interface{})
			if !ok {
				continue
			}
			s := SteelMaterial{
				Material:   steelMap["material"].(string),
				Resistance: steelMap["resistance"].(string),
				Mass:       steelMap["mass"].(float64),
			}
			if otherName, ok := steelMap["other_name"].(string); ok {
				s.OtherName = otherName
			}
			if otherRes, ok := steelMap["other_resistance"].(float64); ok {
				s.OtherResistance = otherRes
			}
			if pos, ok := steelMap["position"].(string); ok {
				s.Position = pos
			}
			steelItems = append(steelItems, s)
		}
	}

	if len(concreteItems) == 0 && len(steelItems) == 0 {
		var legacyWalls, legacySlabs ConcreteElement
		if wallData, ok := d.Data["concrete_walls"].(map[string]interface{}); ok {
			legacyWalls = concreteElementFromMap(wallData)
		}
		if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
			legacySlabs = concreteElementFromMap(slabData)
		}

		concreteItems, steelItems = flattenConcreteAndSteelByPosition(map[string]ConcreteElement{
			ConcreteWallPositionWall: legacyWalls,
			ConcreteWallPositionSlab: legacySlabs,
		})
	}

	elementsByPosition := groupConcreteAndSteelByPosition(concreteItems, steelItems)
	legacyWalls := elementsByPosition[ConcreteWallPositionWall]
	legacySlabs := elementsByPosition[ConcreteWallPositionSlab]

	return &ConcreteWall{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "concrete_wall", Outdated: d.Outdated},
		Consumption:     consumption,
		Concrete:        concreteItems,
		Steel:           steelItems,
		ConcreteWalls:   legacyWalls,
		ConcreteSlabs:   legacySlabs,
		SlabType:        extractStringPointer(d.Data, "slab_type"),
		WallThickness:   extractFloat64Pointer(d.Data, "wall_thickness"),
		SlabThickness:   extractFloat64Pointer(d.Data, "slab_thickness"),
		WallArea:        extractFloat64Pointer(d.Data, "wall_area"),
		SlabArea:        extractFloat64Pointer(d.Data, "slab_area"),
		WallFormArea:    extractFloat64Pointer(d.Data, "wall_form_area"),
		SlabFormArea:    extractFloat64Pointer(d.Data, "slab_form_area"),
		FloorIDs:        d.FloorIDs,
	}
}
