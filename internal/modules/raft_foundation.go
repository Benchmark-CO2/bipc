package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type RaftFoundationSteel struct {
	Mesh  float64 `json:"mesh"`
	CA50  float64 `json:"ca50"`
	CA60  float64 `json:"ca60"`
	CP190 float64 `json:"cp190"`
}

type RaftFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	Area      float64             `json:"area"`
	Thickness float64             `json:"thickness"`
	Fck       int                 `json:"fck"`
	Steel     RaftFoundationSteel `json:"steel"`

	UnitID uuid.UUID `json:"unit_id"`
}

func (r *RaftFoundation) GetType() string { return r.Type }

func (r *RaftFoundation) Validate(v *validator.Validator) {
	v.Check(r.Type != "", "type", "must be provided")
	v.Check(r.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(r.Area >= 40.0, "area", "must be at least 40.0 m²")
	v.Check(r.Thickness >= 0.100 && r.Thickness <= 0.450, "thickness", "must be between 0.100 and 0.450 m")
	v.Check(r.Fck == 20 || r.Fck == 25 || r.Fck == 30, "fck", "must be 20, 25, or 30 MPa")

	v.Check(r.Steel.Mesh >= 0, "steel.mesh", "cannot be negative")
	v.Check(r.Steel.CA50 >= 0, "steel.ca50", "cannot be negative")
	v.Check(r.Steel.CA60 >= 0, "steel.ca60", "cannot be negative")
	v.Check(r.Steel.CP190 >= 0, "steel.cp190", "cannot be negative")
}

func (r *RaftFoundation) Calculate() (Consumption, error) {
	var result Consumption

	concreteVolume := r.Area * r.Thickness

	concreteCO2, ok := sidacConcreteData.KgCO2[float64(r.Fck)]
	if !ok {
		concreteCO2 = sidacConcreteData.KgCO2[30]
	}
	concreteEnergy, ok := sidacConcreteData.MJ[float64(r.Fck)]
	if !ok {
		concreteEnergy = sidacConcreteData.MJ[30]
	}

	result.CO2Min += concreteCO2.Min * concreteVolume
	result.CO2Max += concreteCO2.Max * concreteVolume
	result.EnergyMin += concreteEnergy.Min * concreteVolume
	result.EnergyMax += concreteEnergy.Max * concreteVolume

	if r.Steel.CA50 > 0 {
		steel50CO2 := sidacSteelData.KgCO2[50]
		steel50Energy := sidacSteelData.MJ[50]
		result.CO2Min += steel50CO2.Min * r.Steel.CA50
		result.CO2Max += steel50CO2.Max * r.Steel.CA50
		result.EnergyMin += steel50Energy.Min * r.Steel.CA50
		result.EnergyMax += steel50Energy.Max * r.Steel.CA50
	}

	totalCA60 := r.Steel.Mesh + r.Steel.CA60
	if totalCA60 > 0 {
		steel60CO2 := sidacSteelData.KgCO2[60]
		steel60Energy := sidacSteelData.MJ[60]
		result.CO2Min += steel60CO2.Min * totalCA60
		result.CO2Max += steel60CO2.Max * totalCA60
		result.EnergyMin += steel60Energy.Min * totalCA60
		result.EnergyMax += steel60Energy.Max * totalCA60
	}

	if r.Steel.CP190 > 0 {
		cp190CO2 := sidacStrandData.KgCO2[190]
		cp190Energy := sidacStrandData.MJ[190]
		result.CO2Min += cp190CO2.Min * r.Steel.CP190
		result.CO2Max += cp190CO2.Max * r.Steel.CP190
		result.EnergyMin += cp190Energy.Min * r.Steel.CP190
		result.EnergyMax += cp190Energy.Max * r.Steel.CP190
	}

	return result, nil
}

func (r *RaftFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := r.toDataModule(moduleID, optionID, result)

	insertedModule, err := models.Modules.Insert(moduleToInsert)
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

func (r *RaftFoundation) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := r.toDataModule(moduleID, optionID, result)
	return models.Modules.Update(module)
}

func (r *RaftFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"area":      r.Area,
		"thickness": r.Thickness,
		"fck":       r.Fck,
		"steel": map[string]interface{}{
			"mesh":  r.Steel.Mesh,
			"ca50":  r.Steel.CA50,
			"ca60":  r.Steel.CA60,
			"cp190": r.Steel.CP190,
		},
		"unit_id": r.UnitID.String(),
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "raft_foundation",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		FloorIDs:       []uuid.UUID{},
		UnitID:         &r.UnitID,
	}
}

func (r *RaftFoundation) fromDataModule(d *data.Module) Module {
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}

	var area, thickness float64
	var fck int
	var steel RaftFoundationSteel

	if val, ok := d.Data["area"].(float64); ok {
		area = val
	}
	if val, ok := d.Data["thickness"].(float64); ok {
		thickness = val
	}
	if val, ok := d.Data["fck"].(float64); ok {
		fck = int(val)
	}

	if steelData, ok := d.Data["steel"].(map[string]interface{}); ok {
		if val, ok := steelData["mesh"].(float64); ok {
			steel.Mesh = val
		}
		if val, ok := steelData["ca50"].(float64); ok {
			steel.CA50 = val
		}
		if val, ok := steelData["ca60"].(float64); ok {
			steel.CA60 = val
		}
		if val, ok := steelData["cp190"].(float64); ok {
			steel.CP190 = val
		}
	}

	return &RaftFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "raft_foundation"},
		Consumption:     consumption,
		Area:            area,
		Thickness:       thickness,
		Fck:             fck,
		Steel:           steel,
		UnitID:          *d.UnitID,
	}
}
