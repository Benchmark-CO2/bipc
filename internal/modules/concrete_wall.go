package modules

import (
	"errors"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

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

func (w *ConcreteWall) GetType() string { return w.Type }

func (w *ConcreteWall) Validate(v *validator.Validator) {
	v.Check(w.Name != "", "name", "must be provided")
	v.Check(w.Type != "", "type", "must be provided")
	w.ValidateVersion(v)
}

func (w *ConcreteWall) ValidateVersion(v *validator.Validator) {
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

func (w *ConcreteWall) GetVersions(models data.Models, moduleID int64) (any, error) {
	concreteWallModules, err := models.ConcreteWallModules.GetById(moduleID)
	if err != nil {
		return nil, err
	}
	var res []*ConcreteWall
	for _, v := range concreteWallModules {
		res = append(res, toConcreteWallResponse(v))
	}
	return res, nil
}

func (w *ConcreteWall) MergeModuleData(models data.Models, moduleID int64) (*int32, error) {
	concreteWallModules, err := models.ConcreteWallModules.GetById(moduleID)
	if err != nil {
		return nil, err
	}
	var res []*ConcreteWall
	for _, v := range concreteWallModules {
		res = append(res, toConcreteWallResponse(v))
	}

	if len(res) == 0 {
		return nil, errors.New("no existing versions found for ConcreteWall")
	}
	last := res[len(res)-1]
	w.Version = last.Version + 1
	w.Name = last.Name

	return &w.Version, nil
}

func toConcreteWallResponse(m *data.ConcreteWallModule) *ConcreteWall {
	return &ConcreteWall{
		BasicModuleData: BasicModuleData{
			Name:            m.Name,
			Type:            "concrete_wall",
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

func (w *ConcreteWall) Delete(models data.Models, moduleID int64) error {
	return models.ConcreteWallModules.Delete(moduleID)
}
