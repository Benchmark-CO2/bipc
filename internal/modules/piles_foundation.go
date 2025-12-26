package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type PilesFoundationPiles struct {
	Volume float64               `json:"volume"`
	Steel  FoundationSteelBasic  `json:"steel"`
}

type PilesFoundationCapBeams struct {
	Volume float64               `json:"volume"`
	Steel  FoundationSteelBasic  `json:"steel"`
}

type PilesFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	Fck      int                         `json:"fck"`
	Piles    PilesFoundationPiles        `json:"piles"`
	CapBeams PilesFoundationCapBeams     `json:"cap_beams"`
	UnitID   uuid.UUID                   `json:"unit_id"`
}

func (p *PilesFoundation) GetType() string { return p.Type }

func (p *PilesFoundation) Validate(v *validator.Validator) {
	v.Check(p.Type != "", "type", "must be provided")
	v.Check(p.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(p.Fck != 0, "fck", "must be provided")

	v.Check(p.Piles.Volume >= 0, "piles.volume", "cannot be negative")
	v.Check(p.Piles.Steel.CA50 >= 0, "piles.steel.ca50", "cannot be negative")
	v.Check(p.Piles.Steel.CA60 >= 0, "piles.steel.ca60", "cannot be negative")

	v.Check(p.CapBeams.Volume >= 0, "cap_beams.volume", "cannot be negative")
	v.Check(p.CapBeams.Steel.CA50 >= 0, "cap_beams.steel.ca50", "cannot be negative")
	v.Check(p.CapBeams.Steel.CA60 >= 0, "cap_beams.steel.ca60", "cannot be negative")
}

func (p *PilesFoundation) Calculate() (Consumption, error) {
	var result Consumption

	totalConcreteVolume := p.Piles.Volume + p.CapBeams.Volume

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

	totalCA50 := p.Piles.Steel.CA50 + p.CapBeams.Steel.CA50
	if totalCA50 > 0 {
		steel50CO2 := sidacSteelData.KgCO2[50]
		steel50Energy := sidacSteelData.MJ[50]
		result.CO2Min += steel50CO2.Min * totalCA50
		result.CO2Max += steel50CO2.Max * totalCA50
		result.EnergyMin += steel50Energy.Min * totalCA50
		result.EnergyMax += steel50Energy.Max * totalCA50
	}

	totalCA60 := p.Piles.Steel.CA60 + p.CapBeams.Steel.CA60
	if totalCA60 > 0 {
		steel60CO2 := sidacSteelData.KgCO2[60]
		steel60Energy := sidacSteelData.MJ[60]
		result.CO2Min += steel60CO2.Min * totalCA60
		result.CO2Max += steel60CO2.Max * totalCA60
		result.EnergyMin += steel60Energy.Min * totalCA60
		result.EnergyMax += steel60Energy.Max * totalCA60
	}

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
			"steel": map[string]interface{}{
				"ca50": p.Piles.Steel.CA50,
				"ca60": p.Piles.Steel.CA60,
			},
		},
		"cap_beams": map[string]interface{}{
			"volume": p.CapBeams.Volume,
			"steel": map[string]interface{}{
				"ca50": p.CapBeams.Steel.CA50,
				"ca60": p.CapBeams.Steel.CA60,
			},
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
	var capBeams PilesFoundationCapBeams

	if val, ok := d.Data["fck"].(float64); ok {
		fck = int(val)
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

	if capBeamsData, ok := d.Data["cap_beams"].(map[string]interface{}); ok {
		if val, ok := capBeamsData["volume"].(float64); ok {
			capBeams.Volume = val
		}
		if steelData, ok := capBeamsData["steel"].(map[string]interface{}); ok {
			if val, ok := steelData["ca50"].(float64); ok {
				capBeams.Steel.CA50 = val
			}
			if val, ok := steelData["ca60"].(float64); ok {
				capBeams.Steel.CA60 = val
			}
		}
	}

	return &PilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "piles_foundation"},
		Consumption:     consumption,
		Fck:             fck,
		Piles:           piles,
		CapBeams:        capBeams,
		UnitID:          *d.UnitID,
	}
}
