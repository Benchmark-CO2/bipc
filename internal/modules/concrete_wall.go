package modules

import (
	"fmt"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
)

type ConcreteWall struct {
	BasicModuleData
	ConcreteWalls ConcreteElement `json:"concrete_walls"`
	ConcreteSlabs ConcreteElement `json:"concrete_slabs"`
	WallThickness *float64        `json:"wall_thickness,omitempty"`
	SlabThickness *float64        `json:"slab_thickness,omitempty"`
	FormArea      *float64        `json:"form_area,omitempty"`
	WallArea      *float64        `json:"wall_area,omitempty"`
	FloorIDs      []uuid.UUID     `json:"floor_ids"`
}

func (w *ConcreteWall) GetType() string { return w.Type }

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Type != "", "type", "must be provided")
	v.Check(len(w.FloorIDs) > 0, "floor_ids", "must be provided")

	validateConcreteElement(v, w.ConcreteWalls, "concrete_walls")
	validateConcreteElement(v, w.ConcreteSlabs, "concrete_slabs")

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

func (w *ConcreteWall) Calculate() (Consuption, error) {
	total := Consuption{}

	if err := addConcreteElement(&total, w.ConcreteWalls, sidacConcreteData, sidacSteelData); err != nil {
		return Consuption{}, err
	}
	if err := addConcreteElement(&total, w.ConcreteSlabs, sidacConcreteData, sidacSteelData); err != nil {
		return Consuption{}, err
	}

	return total, nil
}

func (w *ConcreteWall) Insert(models data.Models, optionID uuid.UUID, result Consuption) error {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return err
	}

	module := &data.ConcreteWallModule{
		ID:             moduleID,
		TowerOptionID:  optionID,
		ConcreteWalls:  toDataConcrete(w.ConcreteWalls),
		ConcreteSlabs:  toDataConcrete(w.ConcreteSlabs),
		WallThickness:  w.WallThickness,
		SlabThickness:  w.SlabThickness,
		FormArea:       w.FormArea,
		WallArea:       w.WallArea,
		FloorIDs:       w.FloorIDs,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
	}

	err = models.ConcreteWallModules.Insert(module)
	if err != nil {
		return err
	}

	return nil
}
