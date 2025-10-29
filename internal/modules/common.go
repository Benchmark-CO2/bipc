package modules

import (
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type SteelMassItem struct {
	CA   int     `json:"ca"`
	Mass float64 `json:"mass"`
}

type ConcreteVolumeItem struct {
	Fck    int     `json:"fck"`
	Volume float64 `json:"volume"`
}

type ConcreteElement struct {
	Volumes []ConcreteVolumeItem `json:"volumes,omitempty"`
	Steel   []SteelMassItem      `json:"steel,omitempty"`
}

type BasicModuleData struct {
	Type string `json:"type"`
}

type Consumption struct {
	CO2Min    float64 `json:"co2_min"`
	CO2Max    float64 `json:"co2_max"`
	EnergyMin float64 `json:"energy_min"`
	EnergyMax float64 `json:"energy_max"`
}

func (c *Consumption) sum(value Consumption) {
	c.CO2Min += value.CO2Min
	c.CO2Max += value.CO2Max
	c.EnergyMin += value.EnergyMin
	c.EnergyMax += value.EnergyMax
}

func ParseModuleType(t string) (Module, error) {
	switch t {
	case "beam_column":
		return &BeamColumn{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "concrete_wall":
		return &ConcreteWall{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "structural_masonry":
		return &StructuralMasonry{BasicModuleData: BasicModuleData{Type: t}}, nil
	default:
		return nil, errors.New("invalid module type")
	}
}

type Module interface {
	GetType() string
	Validate(v *validator.Validator)
	Calculate() (Consumption, error)
	Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error)
	Delete(models data.Models, moduleID uuid.UUID) error
	Get(models data.Models, moduleID uuid.UUID) (Module, error)
	Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error
}

func validateConcreteElement(v *validator.Validator, el ConcreteElement, fieldPrefix string) {
	fckSet := make(map[int]struct{})
	for _, c := range el.Volumes {
		v.Check(c.Volume > 0, fieldPrefix+".volumes.volume", "must be greater than 0")
		v.Check(c.Fck != 0, fieldPrefix+".volumes.fck", "must be provided")
		if _, exists := fckSet[c.Fck]; exists {
			v.Check(false, fieldPrefix+".volumes.fck", fmt.Sprintf("duplicate fck value: %d", c.Fck))
		} else {
			fckSet[c.Fck] = struct{}{}
		}
	}
	v.Check(len(el.Volumes) > 0, fieldPrefix+".volumes", "must have at least one item")

	caSet := make(map[int]struct{})
	for _, s := range el.Steel {
		v.Check(s.Mass > 0, fieldPrefix+".steel.mass", "must be greater than 0")
		v.Check(s.CA != 0, fieldPrefix+".steel.ca", "must be provided")
		if _, exists := caSet[s.CA]; exists {
			v.Check(false, fieldPrefix+".steel.ca", fmt.Sprintf("duplicate ca value: %d", s.CA))
		} else {
			caSet[s.CA] = struct{}{}
		}
	}
	v.Check(len(el.Steel) > 0, fieldPrefix+".steel", "must have at least one item")
}

func (ce *ConcreteElement) calculate(sidacConcrete, sidacSteel SidacMaterial) (Consumption, error) {
	var result Consumption
	for _, c := range ce.Volumes {
		val, ok := sidacConcrete.KgCO2[float64(c.Fck)]
		if !ok {
			// return result, fmt.Errorf("fck not found in sidacConcreteData: %d", c.Fck)
			val = sidacConcrete.KgCO2[40]
		}
		result.CO2Min += val.Min * c.Volume
		result.CO2Max += val.Max * c.Volume

		val, ok = sidacConcrete.MJ[float64(c.Fck)]
		if !ok {
			// return result, fmt.Errorf("fck not found in sidacConcreteData: %d", c.Fck)
			val = sidacConcrete.MJ[40]
		}
		result.EnergyMin += val.Min * c.Volume
		result.EnergyMax += val.Max * c.Volume
	}

	for _, s := range ce.Steel {
		val, ok := sidacSteel.KgCO2[float64(s.CA)]
		if !ok {
			val = sidacSteel.KgCO2[60]
			// return result, fmt.Errorf("steel type not found in sidacSteelData: %d", s.CA)
		}
		result.CO2Min += val.Min * s.Mass
		result.CO2Max += val.Max * s.Mass

		val, ok = sidacSteel.MJ[float64(s.CA)]
		if !ok {
			val = sidacSteel.MJ[60]
			// return result, fmt.Errorf("steel type not found in sidacSteelData: %d", s.CA)
		}
		result.EnergyMin += val.Min * s.Mass
		result.EnergyMax += val.Max * s.Mass
	}

	return result, nil
}

func toDataConcrete(el ConcreteElement) data.Concrete {
	var vols []data.ConcreteVolume
	for _, v := range el.Volumes {
		vols = append(vols, data.ConcreteVolume{
			Fck:    v.Fck,
			Volume: v.Volume,
		})
	}
	var steels []data.SteelMass
	for _, s := range el.Steel {
		steels = append(steels, data.SteelMass{
			CA:   s.CA,
			Mass: s.Mass,
		})
	}
	return data.Concrete{
		Volumes: vols,
		Steel:   steels,
	}
}


func addConcreteElement(total *Consumption, ce ConcreteElement, sidacConcrete, sidacSteel SidacMaterial) error {
	result, err := ce.calculate(sidacConcrete, sidacSteel)
	if err != nil {
		return err
	}
	total.sum(result)
	return nil
}

func ToConcreteElement(c data.Concrete) ConcreteElement {
	var vols []ConcreteVolumeItem
	for _, v := range c.Volumes {
		vols = append(vols, ConcreteVolumeItem{
			Fck:    v.Fck,
			Volume: v.Volume,
		})
	}
	var steels []SteelMassItem
	for _, s := range c.Steel {
		steels = append(steels, SteelMassItem{
			CA:   s.CA,
			Mass: s.Mass,
		})
	}
	return ConcreteElement{
		Volumes: vols,
		Steel:   steels,
	}
}
