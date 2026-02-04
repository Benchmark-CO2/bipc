package modules

import (
	"encoding/json"
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

type SteelMaterial struct {
	Material        string  `json:"material"`
	OtherName       string  `json:"other_name,omitempty"`
	Resistance      string  `json:"resistance"`
	OtherResistance float64 `json:"other_resistance,omitempty"`
	Mass            float64 `json:"mass"`
}

type ConcreteVolumeItem struct {
	Fck    int     `json:"fck"`
	Volume float64 `json:"volume"`
}

type ConcreteElement struct {
	Volumes []ConcreteVolumeItem `json:"volumes,omitempty"`
	Steel   []SteelMassItem      `json:"steel,omitempty"`
}

func (c ConcreteElement) MarshalJSON() ([]byte, error) {
	if len(c.Volumes) == 0 && len(c.Steel) == 0 {
		return []byte("null"), nil
	}
	type Alias ConcreteElement
	return json.Marshal((Alias)(c))
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

func findClosestResistance(targetValue float64, material SidacMaterial) float64 {
	var firstAbove float64 = -1
	var highest float64

	for resistance := range material.KgCO2 {
		if resistance > highest {
			highest = resistance
		}

		if resistance >= targetValue && (firstAbove < 0 || resistance < firstAbove) {
			firstAbove = resistance
		}
	}

	if firstAbove > 0 {
		return firstAbove
	}

	return highest
}

func deserializeSteelMaterialsFromInterface(data interface{}) []SteelMaterial {
	var materials []SteelMaterial

	if steelData, ok := data.([]interface{}); ok {
		for _, item := range steelData {
			if steelItem, ok := item.(map[string]interface{}); ok {
				var material SteelMaterial
				if val, ok := steelItem["material"].(string); ok {
					material.Material = val
				}
				if val, ok := steelItem["other_name"].(string); ok {
					material.OtherName = val
				}
				if val, ok := steelItem["resistance"].(string); ok {
					material.Resistance = val
				}
				if val, ok := steelItem["other_resistance"].(float64); ok {
					material.OtherResistance = val
				}
				if val, ok := steelItem["mass"].(float64); ok {
					material.Mass = val
				}
				materials = append(materials, material)
			}
		}
	}

	return materials
}

func ValidateSteelMaterials(v *validator.Validator, materials []SteelMaterial, fieldPrefix string) {
	validMaterialTypes := map[string]bool{
		"general": true, "rebar": true, "mesh": true, "strand": true, "other": true,
	}
	validResistances := map[string]bool{
		"CA50": true, "CA60": true, "CP190": true, "other": true,
	}

	for i, material := range materials {
		prefix := fmt.Sprintf("%s[%d]", fieldPrefix, i)

		v.Check(material.Material != "", prefix+".material", "must be provided")
		v.Check(validMaterialTypes[material.Material], prefix+".material",
			"must be one of: general, rebar, mesh, strand, other")

		if material.Material == "other" {
			v.Check(material.OtherName != "", prefix+".other_name",
				"must be provided when material is 'other'")
		}

		v.Check(material.Resistance != "", prefix+".resistance", "must be provided")
		v.Check(validResistances[material.Resistance], prefix+".resistance",
			"must be one of: CA50, CA60, CP190, other")

		if material.Resistance == "other" {
			v.Check(material.OtherResistance > 0, prefix+".other_resistance",
				"must be provided and greater than 0 when resistance is 'other'")
		}

		v.Check(material.Mass >= 0, prefix+".mass", "cannot be negative")
	}
}

func CalculateSteelConsumption(materials []SteelMaterial) (Consumption, error) {
	var result Consumption

	for _, material := range materials {
		if material.Mass <= 0 {
			continue
		}

		var ca float64
		switch material.Resistance {
		case "CA50":
			ca = 50
		case "CA60":
			ca = 60
		case "CP190":
			ca = 190
		case "other":
			if material.OtherResistance > 0 {
				ca = material.OtherResistance
			} else {
				ca = 50
			}
		default:
			ca = 50
		}

		var steelCO2, steelEnergy SidacValue
		var found bool

		if val, ok := sidacSteelData.KgCO2[ca]; ok {
			steelCO2 = val
			steelEnergy = sidacSteelData.MJ[ca]
			found = true
		} else {
			closest := findClosestResistance(ca, sidacSteelData)
			if val, ok := sidacSteelData.KgCO2[closest]; ok {
				steelCO2 = val
				steelEnergy = sidacSteelData.MJ[closest]
				found = true
			}
		}

		if !found {
			if val, ok := sidacStrandData.KgCO2[ca]; ok {
				steelCO2 = val
				steelEnergy = sidacStrandData.MJ[ca]
				found = true
			} else {
				closest := findClosestResistance(ca, sidacStrandData)
				if val, ok := sidacStrandData.KgCO2[closest]; ok {
					steelCO2 = val
					steelEnergy = sidacStrandData.MJ[closest]
					found = true
				}
			}
		}

		if !found {
			steelCO2 = sidacSteelData.KgCO2[60]
			steelEnergy = sidacSteelData.MJ[60]
		}

		result.CO2Min += steelCO2.Min * material.Mass
		result.CO2Max += steelCO2.Max * material.Mass
		result.EnergyMin += steelEnergy.Min * material.Mass
		result.EnergyMax += steelEnergy.Max * material.Mass
	}

	return result, nil
}

func ParseModuleType(t string) (Module, error) {
	switch t {
	case "beam_column":
		return &BeamColumn{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "concrete_wall":
		return &ConcreteWall{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "structural_masonry":
		return &StructuralMasonry{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "raft_foundation":
		return &RaftFoundation{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "piles_foundation":
		return &PilesFoundation{BasicModuleData: BasicModuleData{Type: t}}, nil
	case "raft_piles_foundation":
		return &RaftPilesFoundation{BasicModuleData: BasicModuleData{Type: t}}, nil
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

func addConcreteElement(total *Consumption, ce ConcreteElement, sidacConcrete, sidacSteel SidacMaterial) error {
	result, err := ce.calculate(sidacConcrete, sidacSteel)
	if err != nil {
		return err
	}
	total.sum(result)
	return nil
}

func concreteElementFromMap(dataMap map[string]interface{}) ConcreteElement {
	var element ConcreteElement

	if volumesData, ok := dataMap["volumes"].([]interface{}); ok {
		for _, v := range volumesData {
			if volMap, ok := v.(map[string]interface{}); ok {
				volume := ConcreteVolumeItem{
					Fck:    int(volMap["fck"].(float64)),
					Volume: volMap["volume"].(float64),
				}
				element.Volumes = append(element.Volumes, volume)
			}
		}
	}

	if steelData, ok := dataMap["steel"].([]interface{}); ok {
		for _, s := range steelData {
			if steelMap, ok := s.(map[string]interface{}); ok {
				steel := SteelMassItem{
					CA:   int(steelMap["ca"].(float64)),
					Mass: steelMap["mass"].(float64),
				}
				element.Steel = append(element.Steel, steel)
			}
		}
	}

	return element
}
