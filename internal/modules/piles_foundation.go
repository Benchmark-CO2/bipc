package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type PilesFoundationPiles struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationBlocks struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationGradeBeams struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationTieBeams struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	Fck        int                       `json:"fck"`
	Piles      PilesFoundationPiles      `json:"piles"`
	Blocks     PilesFoundationBlocks     `json:"blocks"`
	GradeBeams PilesFoundationGradeBeams `json:"grade_beams"`
	TieBeams   PilesFoundationTieBeams   `json:"tie_beams"`
	UnitID     uuid.UUID                 `json:"unit_id"`
}

func (p *PilesFoundation) GetType() string { return p.Type }

func (p *PilesFoundation) Validate(v *validator.Validator) {
	v.Check(p.Type != "", "type", "must be provided")
	v.Check(p.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(p.Fck != 0, "fck", "must be provided")

	v.Check(p.Piles.Volume >= 0, "piles.volume", "cannot be negative")
	v.Check(len(p.Piles.Steel) > 0, "piles.steel", "must have at least one item")
	ValidateSteelMaterials(v, p.Piles.Steel, "piles.steel")

	v.Check(p.Blocks.Volume >= 0, "blocks.volume", "cannot be negative")
	v.Check(len(p.Blocks.Steel) > 0, "blocks.steel", "must have at least one item")
	ValidateSteelMaterials(v, p.Blocks.Steel, "blocks.steel")

	v.Check(p.GradeBeams.Volume >= 0, "grade_beams.volume", "cannot be negative")
	v.Check(len(p.GradeBeams.Steel) > 0, "grade_beams.steel", "must have at least one item")
	ValidateSteelMaterials(v, p.GradeBeams.Steel, "grade_beams.steel")

	v.Check(p.TieBeams.Volume >= 0, "tie_beams.volume", "cannot be negative")
	v.Check(len(p.TieBeams.Steel) > 0, "tie_beams.steel", "must have at least one item")
	ValidateSteelMaterials(v, p.TieBeams.Steel, "tie_beams.steel")
}

func (p *PilesFoundation) Calculate() (Consumption, error) {
	var result Consumption

	totalConcreteVolume := p.Piles.Volume + p.Blocks.Volume + p.GradeBeams.Volume + p.TieBeams.Volume

	concreteCO2, ok := sidacConcreteData.KgCO2[float64(p.Fck)]
	if !ok {
		concreteCO2 = sidacConcreteData.KgCO2[30]
	}
	concreteEnergy, ok := sidacConcreteData.MJ[float64(p.Fck)]
	if !ok {
		concreteEnergy = sidacConcreteData.MJ[30]
	}

	result.CO2Min += concreteCO2.Min * totalConcreteVolume
	result.CO2Max += concreteCO2.Max * totalConcreteVolume
	result.EnergyMin += concreteEnergy.Min * totalConcreteVolume
	result.EnergyMax += concreteEnergy.Max * totalConcreteVolume

	// Calculate steel for all components
	var allSteel []SteelMaterial
	allSteel = append(allSteel, p.Piles.Steel...)
	allSteel = append(allSteel, p.Blocks.Steel...)
	allSteel = append(allSteel, p.GradeBeams.Steel...)
	allSteel = append(allSteel, p.TieBeams.Steel...)

	steelConsumption, err := CalculateSteelConsumption(allSteel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

	return result, nil
}

func (p *PilesFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := p.toDataModule(moduleID, optionID, result)

	insertedModule, err := models.Modules.Insert(moduleToInsert)
	if err != nil {
		return nil, err
	}

	return p.fromDataModule(insertedModule), nil
}

func (p *PilesFoundation) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (p *PilesFoundation) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return p.fromDataModule(dataModule), nil
}

func (p *PilesFoundation) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := p.toDataModule(moduleID, optionID, result)
	return models.Modules.Update(module)
}

func (p *PilesFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"fck": p.Fck,
		"piles": map[string]interface{}{
			"volume": p.Piles.Volume,
			"steel":  p.Piles.Steel,
		},
		"blocks": map[string]interface{}{
			"volume": p.Blocks.Volume,
			"steel":  p.Blocks.Steel,
		},
		"grade_beams": map[string]interface{}{
			"volume": p.GradeBeams.Volume,
			"steel":  p.GradeBeams.Steel,
		},
		"tie_beams": map[string]interface{}{
			"volume": p.TieBeams.Volume,
			"steel":  p.TieBeams.Steel,
		},
		"unit_id": p.UnitID.String(),
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "piles_foundation",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		FloorIDs:       []uuid.UUID{},
		UnitID:         &p.UnitID,
	}
}

func (p *PilesFoundation) fromDataModule(d *data.Module) Module {
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
	var piles PilesFoundationPiles
	var blocks PilesFoundationBlocks
	var gradeBeams PilesFoundationGradeBeams
	var tieBeams PilesFoundationTieBeams

	if val, ok := d.Data["fck"].(float64); ok {
		fck = int(val)
	}

	if pilesData, ok := d.Data["piles"].(map[string]interface{}); ok {
		if val, ok := pilesData["volume"].(float64); ok {
			piles.Volume = val
		}
		piles.Steel = deserializeSteelMaterialsFromInterface(pilesData["steel"])
	}

	if blocksData, ok := d.Data["blocks"].(map[string]interface{}); ok {
		if val, ok := blocksData["volume"].(float64); ok {
			blocks.Volume = val
		}
		blocks.Steel = deserializeSteelMaterialsFromInterface(blocksData["steel"])
	}

	if gradeBeamsData, ok := d.Data["grade_beams"].(map[string]interface{}); ok {
		if val, ok := gradeBeamsData["volume"].(float64); ok {
			gradeBeams.Volume = val
		}
		gradeBeams.Steel = deserializeSteelMaterialsFromInterface(gradeBeamsData["steel"])
	}

	if tieBeamsData, ok := d.Data["tie_beams"].(map[string]interface{}); ok {
		if val, ok := tieBeamsData["volume"].(float64); ok {
			tieBeams.Volume = val
		}
		tieBeams.Steel = deserializeSteelMaterialsFromInterface(tieBeamsData["steel"])
	}

	return &PilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "piles_foundation", Outdated: d.Outdated},
		Consumption:     consumption,
		Fck:             fck,
		Piles:           piles,
		Blocks:          blocks,
		GradeBeams:      gradeBeams,
		TieBeams:        tieBeams,
		UnitID:          *d.UnitID,
	}
}
