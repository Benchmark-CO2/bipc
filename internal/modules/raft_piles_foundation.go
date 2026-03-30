package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

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

	Fck    int                      `json:"fck"`
	Raft   RaftPilesFoundationRaft  `json:"raft"`
	Piles  RaftPilesFoundationPiles `json:"piles"`
	UnitID uuid.UUID                `json:"unit_id"`
}

func (rp *RaftPilesFoundation) GetType() string { return rp.Type }

func (rp *RaftPilesFoundation) Validate(v *validator.Validator) {
	v.Check(rp.Type != "", "type", "must be provided")
	v.Check(rp.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(rp.Fck != 0, "fck", "must be provided")

	v.Check(rp.Raft.Area >= 0, "raft.area", "cannot be negative")
	v.Check(rp.Raft.Thickness >= 0, "raft.thickness", "cannot be negative")
	v.Check(len(rp.Raft.Steel) > 0, "raft.steel", "must have at least one item")
	ValidateSteelMaterials(v, rp.Raft.Steel, "raft.steel")

	v.Check(rp.Piles.Volume >= 0, "piles.volume", "cannot be negative")
	v.Check(len(rp.Piles.Steel) > 0, "piles.steel", "must have at least one item")
	ValidateSteelMaterials(v, rp.Piles.Steel, "piles.steel")
}

func (rp *RaftPilesFoundation) Calculate() (Consumption, error) {
	var result Consumption

	// Calculate raft concrete
	raftConcreteVolume := rp.Raft.Area * rp.Raft.Thickness
	concreteCO2, ok := sidacConcreteData.KgCO2[float64(rp.Fck)]
	if !ok {
		concreteCO2 = sidacConcreteData.KgCO2[30]
	}
	concreteEnergy, ok := sidacConcreteData.MJ[float64(rp.Fck)]
	if !ok {
		concreteEnergy = sidacConcreteData.MJ[30]
	}

	result.CO2Min += concreteCO2.Min * raftConcreteVolume
	result.CO2Max += concreteCO2.Max * raftConcreteVolume
	result.EnergyMin += concreteEnergy.Min * raftConcreteVolume
	result.EnergyMax += concreteEnergy.Max * raftConcreteVolume

	// Calculate piles concrete (uses same fck)
	result.CO2Min += concreteCO2.Min * rp.Piles.Volume
	result.CO2Max += concreteCO2.Max * rp.Piles.Volume
	result.EnergyMin += concreteEnergy.Min * rp.Piles.Volume
	result.EnergyMax += concreteEnergy.Max * rp.Piles.Volume

	// Calculate steel for both raft and piles
	var allSteel []SteelMaterial
	allSteel = append(allSteel, rp.Raft.Steel...)
	allSteel = append(allSteel, rp.Piles.Steel...)

	steelConsumption, err := CalculateSteelConsumption(allSteel)
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
		"fck": rp.Fck,
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
		FloorIDs:       []uuid.UUID{},
		UnitID:         &rp.UnitID,
	}
}

func (rp *RaftPilesFoundation) fromDataModule(d *data.Module) Module {
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}

	var fck int
	if val, ok := d.Data["fck"].(float64); ok {
		fck = int(val)
	}

	var raft RaftPilesFoundationRaft
	var piles RaftPilesFoundationPiles

	if raftData, ok := d.Data["raft"].(map[string]interface{}); ok {
		if val, ok := raftData["area"].(float64); ok {
			raft.Area = val
		}
		if val, ok := raftData["thickness"].(float64); ok {
			raft.Thickness = val
		}
		raft.Steel = deserializeSteelMaterialsFromInterface(raftData["steel"])
	}

	if pilesData, ok := d.Data["piles"].(map[string]interface{}); ok {
		if val, ok := pilesData["volume"].(float64); ok {
			piles.Volume = val
		}
		piles.Steel = deserializeSteelMaterialsFromInterface(pilesData["steel"])
	}

	return &RaftPilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "raft_piles_foundation", Outdated: d.Outdated},
		Consumption:     consumption,
		Fck:             fck,
		Raft:            raft,
		Piles:           piles,
		UnitID:          *d.UnitID,
	}
}
