package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var raftPilesFoundationValidPositions = []ElementPosition{
	ElementPositionRaft,
	ElementPositionPile,
}

type RaftPilesFoundationRaft struct {
	Area      float64         `json:"area"`
	Thickness float64         `json:"thickness"`
	Steel     []SteelMaterial `json:"steel"`
}

type RaftPilesFoundationPiles struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type RaftPilesFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`

	// Legacy compatibility fields.
	Fck    int                      `json:"fck"`
	Raft   RaftPilesFoundationRaft  `json:"raft"`
	Piles  RaftPilesFoundationPiles `json:"piles"`
	UnitID uuid.UUID                `json:"unit_id"`
}

func (rp *RaftPilesFoundation) GetType() string { return rp.Type }

func (rp *RaftPilesFoundation) VersionContract() moduleVersionContract {
	return moduleVersionContract{
		v1Disallowed: []string{"concrete", "steel"},
		v2Disallowed: []string{"fck", "raft", "piles"},
		toV1:         applyV1LegacyResponse,
		toV2: func(moduleMap map[string]any) {
			if raftRaw, ok := moduleMap["raft"].(map[string]any); ok {
				if area, ok := raftRaw["area"].(float64); ok && area != 0 {
					moduleMap["raft_area"] = area
				}

				if thickness, ok := raftRaw["thickness"].(float64); ok && thickness != 0 {
					moduleMap["raft_thickness"] = thickness
				}
			}

			removeKeys(moduleMap, "fck", "raft", "piles")
		},
	}
}

func (rp *RaftPilesFoundation) validPositions() []ElementPosition {
	return append([]ElementPosition(nil), raftPilesFoundationValidPositions...)
}

func (rp *RaftPilesFoundation) hasNewFormat() bool {
	return len(rp.Concrete) > 0 || len(rp.Steel) > 0
}

func (rp *RaftPilesFoundation) syncLegacyFromNewFormat() {
	legacyAlreadyPresent := rp.Raft.Area > 0 || rp.Raft.Thickness > 0 || rp.Piles.Volume > 0 ||
		len(rp.Raft.Steel) > 0 || len(rp.Piles.Steel) > 0
	if legacyAlreadyPresent {
		return
	}

	elementsByPosition := groupConcreteByPosition(rp.Concrete)
	elementsByPosition = groupSteelByPosition(elementsByPosition, rp.Steel)

	raftElement := elementsByPosition[ElementPositionRaft]
	pilesElement := elementsByPosition[ElementPositionPile]

	raftVolume := concreteVolumeFromElement(raftElement)
	if rp.Raft.Area == 0 && rp.Raft.Thickness == 0 && raftVolume > 0 {
		rp.Raft.Area = raftVolume
		rp.Raft.Thickness = 1
	}
	rp.Raft.Steel = raftElement.Steel

	rp.Piles.Volume = concreteVolumeFromElement(pilesElement)
	rp.Piles.Steel = pilesElement.Steel
}

func (rp *RaftPilesFoundation) normalizeToNewFormat() {
	if !rp.hasNewFormat() {
		raftVolume := rp.Raft.Area * rp.Raft.Thickness
		if raftVolume > 0 {
			rp.Concrete = append(rp.Concrete, ConcreteVolumeItem{Fck: rp.Fck, Volume: raftVolume, Position: ElementPositionRaft})
		}
		if rp.Piles.Volume > 0 {
			rp.Concrete = append(rp.Concrete, ConcreteVolumeItem{Fck: rp.Fck, Volume: rp.Piles.Volume, Position: ElementPositionPile})
		}

		for _, steel := range rp.Raft.Steel {
			steel.Position = ElementPositionRaft
			rp.Steel = append(rp.Steel, steel)
		}
		for _, steel := range rp.Piles.Steel {
			steel.Position = ElementPositionPile
			rp.Steel = append(rp.Steel, steel)
		}
	}

	if rp.Fck == 0 && len(rp.Concrete) > 0 {
		rp.Fck = rp.Concrete[0].Fck
	}

	rp.syncLegacyFromNewFormat()
}

func (rp *RaftPilesFoundation) Validate(v *validator.Validator) {
	rp.normalizeToNewFormat()

	v.Check(rp.Type != "", "type", "must be provided")
	v.Check(rp.UnitID != uuid.Nil, "unit_id", "must be provided")

	if rp.Fck != 0 {
		v.Check(rp.Fck > 0, "fck", "must be greater than 0")
	}

	if rp.Raft.Area != 0 {
		v.Check(rp.Raft.Area >= 0, "raft.area", "cannot be negative")
	}
	if rp.Raft.Thickness != 0 {
		v.Check(rp.Raft.Thickness >= 0, "raft.thickness", "cannot be negative")
	}

	validatePositionedConcrete(v, rp.Concrete, rp.validPositions())
	validatePositionedSteel(v, rp.Steel, rp.validPositions())
}

func (rp *RaftPilesFoundation) Calculate() (Consumption, error) {
	rp.normalizeToNewFormat()

	result := CalculateConcreteConsumption(rp.Concrete)
	result.Material += concreteVolumeFromItems(rp.Concrete)

	steelConsumption, err := CalculateSteelConsumption(rp.Steel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

	return result, nil
}

func (rp *RaftPilesFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	rp.normalizeToNewFormat()

	moduleToInsert := rp.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &rp.UnitID,
	)
	if err != nil {
		return nil, err
	}

	insertedModule, err := models.Modules.Insert(moduleToInsert, targets)
	if err != nil {
		return nil, err
	}

	return rp.fromDataModule(insertedModule), nil
}

func (rp *RaftPilesFoundation) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (rp *RaftPilesFoundation) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return rp.fromDataModule(dataModule), nil
}

func (rp *RaftPilesFoundation) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	rp.normalizeToNewFormat()

	module := rp.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &rp.UnitID,
	)
	if err != nil {
		return err
	}

	return models.Modules.Update(module, targets)
}

func (rp *RaftPilesFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"concrete": rp.Concrete,
		"steel":    rp.Steel,
		"fck":      rp.Fck,
		"raft": map[string]interface{}{
			"area":      rp.Raft.Area,
			"thickness": rp.Raft.Thickness,
			"steel":     rp.Raft.Steel,
		},
		"piles": map[string]interface{}{
			"volume": rp.Piles.Volume,
			"steel":  rp.Piles.Steel,
		},
		"unit_id": rp.UnitID.String(),
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "raft_piles_foundation",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		TotalMaterial:  &result.Material,
		FloorIDs:       []uuid.UUID{},
		UnitID:         &rp.UnitID,
	}
}

func (rp *RaftPilesFoundation) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	foundation := &RaftPilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "raft_piles_foundation", Outdated: d.Outdated},
		Consumption:     consumption,
		Concrete:        concreteVolumesFromInterface(d.Data["concrete"]),
		Steel:           deserializeSteelMaterialsFromInterface(d.Data["steel"]),
		UnitID:          *d.UnitID,
	}

	if val, ok := d.Data["fck"].(float64); ok {
		foundation.Fck = int(val)
	}

	if raftData, ok := d.Data["raft"].(map[string]interface{}); ok {
		if val, ok := raftData["area"].(float64); ok {
			foundation.Raft.Area = val
		}
		if val, ok := raftData["thickness"].(float64); ok {
			foundation.Raft.Thickness = val
		}
		foundation.Raft.Steel = deserializeSteelMaterialsFromInterface(raftData["steel"])
	}

	if pilesData, ok := d.Data["piles"].(map[string]interface{}); ok {
		if val, ok := pilesData["volume"].(float64); ok {
			foundation.Piles.Volume = val
		}
		foundation.Piles.Steel = deserializeSteelMaterialsFromInterface(pilesData["steel"])
	}

	if len(foundation.Concrete) == 0 {
		// Legacy-only path is normalized below.
	}

	foundation.normalizeToNewFormat()

	if foundation.Fck == 0 && len(foundation.Concrete) > 0 {
		foundation.Fck = foundation.Concrete[0].Fck
	}

	return foundation
}
