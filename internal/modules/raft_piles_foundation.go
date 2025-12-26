package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type RaftPilesFoundationRaft struct {
	Area      float64                  `json:"area"`
	Thickness float64                  `json:"thickness"`
	Fck       int                      `json:"fck"`
	Steel     FoundationSteelComplete  `json:"steel"`
}

type RaftPilesFoundationPiles struct {
	Volume float64               `json:"volume"`
	Steel  FoundationSteelBasic  `json:"steel"`
}

type RaftPilesFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	Raft   RaftPilesFoundationRaft  `json:"raft"`
	Piles  RaftPilesFoundationPiles `json:"piles"`
	UnitID uuid.UUID                `json:"unit_id"`
}

func (rp *RaftPilesFoundation) GetType() string { return rp.Type }

func (rp *RaftPilesFoundation) Validate(v *validator.Validator) {
	v.Check(rp.Type != "", "type", "must be provided")
	v.Check(rp.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(rp.Raft.Area >= 0, "raft.area", "cannot be negative")
	v.Check(rp.Raft.Thickness >= 0, "raft.thickness", "cannot be negative")
	v.Check(rp.Raft.Fck != 0, "raft.fck", "must be provided")

	v.Check(rp.Raft.Steel.Mesh >= 0, "raft.steel.mesh", "cannot be negative")
	v.Check(rp.Raft.Steel.CA50 >= 0, "raft.steel.ca50", "cannot be negative")
	v.Check(rp.Raft.Steel.CA60 >= 0, "raft.steel.ca60", "cannot be negative")
	v.Check(rp.Raft.Steel.CP190 >= 0, "raft.steel.cp190", "cannot be negative")

	v.Check(rp.Piles.Volume >= 0, "piles.volume", "cannot be negative")
	v.Check(rp.Piles.Steel.CA50 >= 0, "piles.steel.ca50", "cannot be negative")
	v.Check(rp.Piles.Steel.CA60 >= 0, "piles.steel.ca60", "cannot be negative")
}

func (rp *RaftPilesFoundation) Calculate() (Consumption, error) {
	var result Consumption

	// Calculate raft concrete
	raftConcreteVolume := rp.Raft.Area * rp.Raft.Thickness
	raftConcreteCO2, ok := sidacConcreteData.KgCO2[float64(rp.Raft.Fck)]
	if !ok {
		raftConcreteCO2 = sidacConcreteData.KgCO2[30]
	}
	raftConcreteEnergy, ok := sidacConcreteData.MJ[float64(rp.Raft.Fck)]
	if !ok {
		raftConcreteEnergy = sidacConcreteData.MJ[30]
	}

	result.CO2Min += raftConcreteCO2.Min * raftConcreteVolume
	result.CO2Max += raftConcreteCO2.Max * raftConcreteVolume
	result.EnergyMin += raftConcreteEnergy.Min * raftConcreteVolume
	result.EnergyMax += raftConcreteEnergy.Max * raftConcreteVolume

	// Calculate piles concrete
	pilesConcreteCO2, ok := sidacConcreteData.KgCO2[float64(rp.Raft.Fck)]
	if !ok {
		pilesConcreteCO2 = sidacConcreteData.KgCO2[30]
	}
	pilesConcreteEnergy, ok := sidacConcreteData.MJ[float64(rp.Raft.Fck)]
	if !ok {
		pilesConcreteEnergy = sidacConcreteData.MJ[30]
	}

	result.CO2Min += pilesConcreteCO2.Min * rp.Piles.Volume
	result.CO2Max += pilesConcreteCO2.Max * rp.Piles.Volume
	result.EnergyMin += pilesConcreteEnergy.Min * rp.Piles.Volume
	result.EnergyMax += pilesConcreteEnergy.Max * rp.Piles.Volume

	// Calculate raft steel CA-50
	if rp.Raft.Steel.CA50 > 0 {
		steel50CO2 := sidacSteelData.KgCO2[50]
		steel50Energy := sidacSteelData.MJ[50]
		result.CO2Min += steel50CO2.Min * rp.Raft.Steel.CA50
		result.CO2Max += steel50CO2.Max * rp.Raft.Steel.CA50
		result.EnergyMin += steel50Energy.Min * rp.Raft.Steel.CA50
		result.EnergyMax += steel50Energy.Max * rp.Raft.Steel.CA50
	}

	// Calculate raft steel CA-60 + mesh
	totalRaftCA60 := rp.Raft.Steel.Mesh + rp.Raft.Steel.CA60
	if totalRaftCA60 > 0 {
		steel60CO2 := sidacSteelData.KgCO2[60]
		steel60Energy := sidacSteelData.MJ[60]
		result.CO2Min += steel60CO2.Min * totalRaftCA60
		result.CO2Max += steel60CO2.Max * totalRaftCA60
		result.EnergyMin += steel60Energy.Min * totalRaftCA60
		result.EnergyMax += steel60Energy.Max * totalRaftCA60
	}

	// Calculate raft steel CP-190
	if rp.Raft.Steel.CP190 > 0 {
		cp190CO2 := sidacStrandData.KgCO2[190]
		cp190Energy := sidacStrandData.MJ[190]
		result.CO2Min += cp190CO2.Min * rp.Raft.Steel.CP190
		result.CO2Max += cp190CO2.Max * rp.Raft.Steel.CP190
		result.EnergyMin += cp190Energy.Min * rp.Raft.Steel.CP190
		result.EnergyMax += cp190Energy.Max * rp.Raft.Steel.CP190
	}

	// Calculate piles steel CA-50
	if rp.Piles.Steel.CA50 > 0 {
		steel50CO2 := sidacSteelData.KgCO2[50]
		steel50Energy := sidacSteelData.MJ[50]
		result.CO2Min += steel50CO2.Min * rp.Piles.Steel.CA50
		result.CO2Max += steel50CO2.Max * rp.Piles.Steel.CA50
		result.EnergyMin += steel50Energy.Min * rp.Piles.Steel.CA50
		result.EnergyMax += steel50Energy.Max * rp.Piles.Steel.CA50
	}

	// Calculate piles steel CA-60
	if rp.Piles.Steel.CA60 > 0 {
		steel60CO2 := sidacSteelData.KgCO2[60]
		steel60Energy := sidacSteelData.MJ[60]
		result.CO2Min += steel60CO2.Min * rp.Piles.Steel.CA60
		result.CO2Max += steel60CO2.Max * rp.Piles.Steel.CA60
		result.EnergyMin += steel60Energy.Min * rp.Piles.Steel.CA60
		result.EnergyMax += steel60Energy.Max * rp.Piles.Steel.CA60
	}

	return result, nil
}

func (rp *RaftPilesFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := rp.toDataModule(moduleID, optionID, result)

	insertedModule, err := models.Modules.Insert(moduleToInsert)
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
	return models.Modules.Update(module)
}

func (rp *RaftPilesFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"raft": map[string]interface{}{
			"area":      rp.Raft.Area,
			"thickness": rp.Raft.Thickness,
			"fck":       rp.Raft.Fck,
			"steel": map[string]interface{}{
				"mesh":  rp.Raft.Steel.Mesh,
				"ca50":  rp.Raft.Steel.CA50,
				"ca60":  rp.Raft.Steel.CA60,
				"cp190": rp.Raft.Steel.CP190,
			},
		},
		"piles": map[string]interface{}{
			"volume": rp.Piles.Volume,
			"steel": map[string]interface{}{
				"ca50": rp.Piles.Steel.CA50,
				"ca60": rp.Piles.Steel.CA60,
			},
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

	var raft RaftPilesFoundationRaft
	var piles RaftPilesFoundationPiles

	if raftData, ok := d.Data["raft"].(map[string]interface{}); ok {
		if val, ok := raftData["area"].(float64); ok {
			raft.Area = val
		}
		if val, ok := raftData["thickness"].(float64); ok {
			raft.Thickness = val
		}
		if val, ok := raftData["fck"].(float64); ok {
			raft.Fck = int(val)
		}
		if steelData, ok := raftData["steel"].(map[string]interface{}); ok {
			if val, ok := steelData["mesh"].(float64); ok {
				raft.Steel.Mesh = val
			}
			if val, ok := steelData["ca50"].(float64); ok {
				raft.Steel.CA50 = val
			}
			if val, ok := steelData["ca60"].(float64); ok {
				raft.Steel.CA60 = val
			}
			if val, ok := steelData["cp190"].(float64); ok {
				raft.Steel.CP190 = val
			}
		}
	}

	if pilesData, ok := d.Data["piles"].(map[string]interface{}); ok {
		if val, ok := pilesData["volume"].(float64); ok {
			piles.Volume = val
		}
		if steelData, ok := pilesData["steel"].(map[string]interface{}); ok {
			if val, ok := steelData["ca50"].(float64); ok {
				piles.Steel.CA50 = val
			}
			if val, ok := steelData["ca60"].(float64); ok {
				piles.Steel.CA60 = val
			}
		}
	}

	return &RaftPilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "raft_piles_foundation"},
		Consumption:     consumption,
		Raft:            raft,
		Piles:           piles,
		UnitID:          *d.UnitID,
	}
}
