package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var raftFoundationValidPositions = []ElementPosition{ElementPositionRaft}

type RaftFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`

	// Legacy compatibility fields.
	Area      float64 `json:"area"`
	Thickness float64 `json:"thickness"`
	Fck       int     `json:"fck"`

	UnitID uuid.UUID `json:"unit_id"`
}

func (r *RaftFoundation) GetType() string { return r.Type }

func (r *RaftFoundation) VersionContract() moduleVersionContract {
	return moduleVersionContract{
		v1Disallowed: []string{"concrete"},
		v2Disallowed: []string{"area", "thickness", "fck"},
		toV1:         applyV1LegacyResponse,
		toV2: func(moduleMap map[string]any) {
			if area, ok := moduleMap["area"].(float64); ok && area != 0 {
				moduleMap["raft_area"] = area
			}

			if thickness, ok := moduleMap["thickness"].(float64); ok && thickness != 0 {
				moduleMap["raft_thickness"] = thickness
			}

			removeKeys(moduleMap, "area", "thickness", "fck")
		},
	}
}

func (r *RaftFoundation) validPositions() []ElementPosition {
	return append([]ElementPosition(nil), raftFoundationValidPositions...)
}

func (r *RaftFoundation) hasNewFormat() bool {
	return len(r.Concrete) > 0
}

func (r *RaftFoundation) normalizeToNewFormat() {
	if !r.hasNewFormat() {
		volume := r.Area * r.Thickness
		if volume > 0 && r.Fck > 0 {
			r.Concrete = append(r.Concrete, ConcreteVolumeItem{Fck: r.Fck, Volume: volume, Position: ElementPositionRaft})
		}
	}

	if len(r.Steel) == 0 {
		return
	}

	normalizedSteel := make([]SteelMaterial, 0, len(r.Steel))
	for _, steel := range r.Steel {
		if steel.Position == "" {
			steel.Position = ElementPositionRaft
		}
		normalizedSteel = append(normalizedSteel, steel)
	}

	r.Steel = normalizedSteel

	if r.Fck == 0 && len(r.Concrete) > 0 {
		r.Fck = r.Concrete[0].Fck
	}
}

func (r *RaftFoundation) Validate(v *validator.Validator) {
	r.normalizeToNewFormat()

	v.Check(r.Type != "", "type", "must be provided")
	v.Check(r.UnitID != uuid.Nil, "unit_id", "must be provided")

	if r.Area != 0 {
		v.Check(r.Area >= 0, "area", "cannot be negative")
	}
	if r.Thickness != 0 {
		v.Check(r.Thickness >= 0, "thickness", "cannot be negative")
	}
	if r.Fck != 0 {
		v.Check(r.Fck > 0, "fck", "must be greater than 0")
	}

	validatePositionedConcrete(v, r.Concrete, r.validPositions())
	validatePositionedSteel(v, r.Steel, r.validPositions())
}

func (r *RaftFoundation) Calculate() (Consumption, error) {
	r.normalizeToNewFormat()

	result := CalculateConcreteConsumption(r.Concrete)
	result.Material += concreteVolumeFromItems(r.Concrete)

	steelConsumption, err := CalculateSteelConsumption(r.Steel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

	return result, nil
}

func (r *RaftFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption, source string, completed bool) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	r.normalizeToNewFormat()

	moduleToInsert := r.toDataModule(moduleID, optionID, result, source, completed)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &r.UnitID,
	)
	if err != nil {
		return nil, err
	}

	insertedModule, err := models.Modules.Insert(moduleToInsert, targets)
	if err != nil {
		return nil, err
	}

	return r.fromDataModule(insertedModule), nil
}

func (r *RaftFoundation) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (r *RaftFoundation) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return r.fromDataModule(dataModule), nil
}

func (r *RaftFoundation) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption, source string, completed bool) error {
	r.normalizeToNewFormat()

	module := r.toDataModule(moduleID, optionID, result, source, completed)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &r.UnitID,
	)
	if err != nil {
		return err
	}

	return models.Modules.Update(module, targets)
}

func (r *RaftFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption, source string, completed bool) *data.Module {
	moduleData := map[string]interface{}{
		"concrete":  r.Concrete,
		"steel":     r.Steel,
		"area":      r.Area,
		"thickness": r.Thickness,
		"fck":       r.Fck,
		"unit_id":   r.UnitID.String(),
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "raft_foundation",
		OptionID:       optionID,
		Data:           moduleData,
		Source:         source,
		Completed:      completed,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		TotalMaterial:  &result.Material,
		FloorIDs:       []uuid.UUID{},
		UnitID:         &r.UnitID,
	}
}

func (r *RaftFoundation) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	raft := &RaftFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "raft_foundation", Outdated: d.Outdated, Completed: d.Completed},
		Consumption:     consumption,
		Concrete:        concreteVolumesFromInterface(d.Data["concrete"]),
		Steel:           deserializeSteelMaterialsFromInterface(d.Data["steel"]),
		UnitID:          *d.UnitID,
	}

	if val, ok := unwrapDataScalar(d.Data["area"]).(float64); ok {
		raft.Area = val
	}
	if val, ok := unwrapDataScalar(d.Data["thickness"]).(float64); ok {
		raft.Thickness = val
	}
	if val, ok := unwrapDataScalar(d.Data["fck"]).(float64); ok {
		raft.Fck = int(val)
	}

	raft.normalizeToNewFormat()

	if raft.Fck == 0 && len(raft.Concrete) > 0 {
		raft.Fck = raft.Concrete[0].Fck
	}

	return raft
}
