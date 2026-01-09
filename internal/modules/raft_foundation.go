package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type RaftFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	Area      float64         `json:"area"`
	Thickness float64         `json:"thickness"`
	Fck       int             `json:"fck"`
	Steel     []SteelMaterial `json:"steel"`

	UnitID uuid.UUID `json:"unit_id"`
}

func (r *RaftFoundation) GetType() string { return r.Type }

func (r *RaftFoundation) Validate(v *validator.Validator) {
	v.Check(r.Type != "", "type", "must be provided")
	v.Check(r.UnitID != uuid.Nil, "unit_id", "must be provided")

	v.Check(r.Area >= 0, "area", "cannot be negative")
	v.Check(r.Thickness >= 0, "thickness", "cannot be negative")
	v.Check(r.Fck != 0, "fck", "must be provided")

	v.Check(len(r.Steel) > 0, "steel", "must have at least one item")
	ValidateSteelMaterials(v, r.Steel, "steel")
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

	steelConsumption, err := CalculateSteelConsumption(r.Steel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

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
		"steel":     r.Steel,
		"unit_id":   r.UnitID.String(),
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
	var steel []SteelMaterial

	if val, ok := d.Data["area"].(float64); ok {
		area = val
	}
	if val, ok := d.Data["thickness"].(float64); ok {
		thickness = val
	}
	if val, ok := d.Data["fck"].(float64); ok {
		fck = int(val)
	}

	steel = deserializeSteelMaterialsFromInterface(d.Data["steel"])

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
