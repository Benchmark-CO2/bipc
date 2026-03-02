package modules

import (
	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

type ConcreteWall struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption   *Consumption    `json:"consumption,omitempty"`
	ConcreteWalls ConcreteElement `json:"concrete_walls"`
	ConcreteSlabs ConcreteElement `json:"concrete_slabs"`

	WallThickness *float64 `json:"wall_thickness,omitempty"`
	SlabThickness *float64 `json:"slab_thickness,omitempty"`
	WallArea      *float64 `json:"wall_area,omitempty"`
	SlabArea      *float64 `json:"slab_area,omitempty"`

	WallFormArea *float64    `json:"wall_form_area,omitempty"`
	SlabFormArea *float64    `json:"slab_form_area,omitempty"`
	FloorIDs     []uuid.UUID `json:"floor_ids"`
}

func (w *ConcreteWall) GetType() string { return w.Type }

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Type != "", "type", "must be provided")
	v.Check(len(w.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(w.FloorIDs), "floor_ids", "must not contain duplicate values")

	validateConcreteElement(v, w.ConcreteWalls, "concrete_walls")
	validateConcreteElement(v, w.ConcreteSlabs, "concrete_slabs")

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

func (w *ConcreteWall) Calculate() (Consumption, error) {
	total := Consumption{}

	if err := addConcreteElement(&total, w.ConcreteWalls, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}
	if err := addConcreteElement(&total, w.ConcreteSlabs, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}

	return total, nil
}

func (w *ConcreteWall) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := w.toDataModule(moduleID, optionID, result)

	insertedModule, err := models.Modules.Insert(moduleToInsert)
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
	module := w.toDataModule(moduleID, optionID, result)
	return models.Modules.Update(module)
}

func (w *ConcreteWall) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"concrete_walls": w.ConcreteWalls,
		"concrete_slabs": w.ConcreteSlabs,
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
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}

	var concreteWalls, concreteSlabs ConcreteElement

	if wallData, ok := d.Data["concrete_walls"].(map[string]interface{}); ok {
		concreteWalls = concreteElementFromMap(wallData)
	}
	if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
		concreteSlabs = concreteElementFromMap(slabData)
	}

	var wallThickness, slabThickness, wallArea, slabArea, wallFormArea, slabFormArea *float64

	if val, ok := d.Data["wall_thickness"].(float64); ok {
		wallThickness = &val
	}
	if val, ok := d.Data["slab_thickness"].(float64); ok {
		slabThickness = &val
	}
	if val, ok := d.Data["wall_area"].(float64); ok {
		wallArea = &val
	}
	if val, ok := d.Data["slab_area"].(float64); ok {
		slabArea = &val
	}
	if val, ok := d.Data["wall_form_area"].(float64); ok {
		wallFormArea = &val
	}
	if val, ok := d.Data["slab_form_area"].(float64); ok {
		slabFormArea = &val
	}

	return &ConcreteWall{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "concrete_wall", Outdated: d.Outdated},
		Consumption:     consumption,
		ConcreteWalls:   concreteWalls,
		ConcreteSlabs:   concreteSlabs,
		WallThickness:   wallThickness,
		SlabThickness:   slabThickness,
		WallArea:        wallArea,
		SlabArea:        slabArea,
		WallFormArea:    wallFormArea,
		SlabFormArea:    slabFormArea,
		FloorIDs:        d.FloorIDs,
	}
}
