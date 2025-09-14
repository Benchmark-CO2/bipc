package modules

import (
	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
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

	moduleToInsert := toConcreteWallModule(w, moduleID, optionID, result)

	insertedModule, err := models.ConcreteWallModules.Insert(moduleToInsert)
	if err != nil {
		return nil, err
	}

	return w.toModule(insertedModule), nil
}

func (w *ConcreteWall) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.ConcreteWallModules.Delete(moduleID)
}

func (w *ConcreteWall) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.ConcreteWallModules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return w.toModule(dataModule), nil
}

func (w *ConcreteWall) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := toConcreteWallModule(w, moduleID, optionID, result)
	return models.ConcreteWallModules.Update(module)
}

func (w *ConcreteWall) toModule(d *data.ConcreteWallModule) Module {
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}
	return &ConcreteWall{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "concrete_wall"},
		Consumption:     consumption,
		ConcreteWalls:   ToConcreteElement(d.ConcreteWalls),
		ConcreteSlabs:   ToConcreteElement(d.ConcreteSlabs),
		WallThickness:   d.WallThickness,
		SlabThickness:   d.SlabThickness,
		WallArea:        d.WallArea,
		SlabArea:        d.SlabArea,
		WallFormArea:    d.WallFormArea,
		SlabFormArea:    d.SlabFormArea,
		FloorIDs:        d.FloorIDs,
	}
}

func toConcreteWallModule(w *ConcreteWall, moduleID, optionID uuid.UUID, result Consumption) *data.ConcreteWallModule {
	return &data.ConcreteWallModule{
		Module: data.Module{
			ID:             moduleID,
			TowerOptionID:  optionID,
			TotalCO2Min:    &result.CO2Min,
			TotalCO2Max:    &result.CO2Max,
			TotalEnergyMin: &result.EnergyMin,
			TotalEnergyMax: &result.EnergyMax,
			FloorIDs:       w.FloorIDs,
		},
		ConcreteWalls: toDataConcrete(w.ConcreteWalls),
		ConcreteSlabs: toDataConcrete(w.ConcreteSlabs),
		WallThickness: w.WallThickness,
		SlabThickness: w.SlabThickness,
		WallArea:      w.WallArea,
		SlabArea:      w.SlabArea,
		WallFormArea:  w.WallFormArea,
		SlabFormArea:  w.SlabFormArea,
	}
}
