package modules

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var caToResistanceMap = map[int]string{
	50:  "CA50",
	60:  "CA60",
	190: "CP190",
}

var resistanceToCAMap = map[string]float64{
	"CA50":  50,
	"CA60":  60,
	"CP190": 190,
}

// ConvertCAToResistance converts a CA value to resistance string and other_resistance value
func ConvertCAToResistance(ca int) (resistance string, otherResistance float64) {
	if res, ok := caToResistanceMap[ca]; ok {
		return res, 0
	}
	return "other", float64(ca)
}

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
	Steel   []SteelMaterial      `json:"steel,omitempty"`
}

func (c ConcreteElement) MarshalJSON() ([]byte, error) {
	if len(c.Volumes) == 0 && len(c.Steel) == 0 {
		return []byte("null"), nil
	}
	type Alias ConcreteElement
	return json.Marshal((Alias)(c))
}

type BasicModuleData struct {
	Type     string `json:"type"`
	Outdated bool   `json:"outdated"`
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
		if material.Resistance == "other" {
			if material.OtherResistance > 0 {
				ca = material.OtherResistance
			} else {
				ca = 50 // default fallback
			}
		} else if val, ok := resistanceToCAMap[material.Resistance]; ok {
			ca = val
		} else {
			ca = 50 // default fallback
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

	ValidateSteelMaterials(v, el.Steel, fieldPrefix+".steel")
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

	steelConsumption, err := CalculateSteelConsumption(ce.Steel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

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
		element.Steel = steelMaterialsFromData(steelData)
	}

	return element
}

// steelMaterialsFromData converts []interface{} to []SteelMaterial with backward compatibility
// for the old CA-based format (SteelMassItem).
func steelMaterialsFromData(steelData []interface{}) []SteelMaterial {
	var materials []SteelMaterial

	for _, s := range steelData {
		steelMap, ok := s.(map[string]interface{})
		if !ok {
			continue
		}

		// Try to read as new format (SteelMaterial)
		if material, ok := steelMap["material"].(string); ok {
			steel := SteelMaterial{
				Material:   material,
				Resistance: steelMap["resistance"].(string),
				Mass:       steelMap["mass"].(float64),
			}
			if otherName, ok := steelMap["other_name"].(string); ok {
				steel.OtherName = otherName
			}
			if otherRes, ok := steelMap["other_resistance"].(float64); ok {
				steel.OtherResistance = otherRes
			}
			materials = append(materials, steel)
		} else if ca, ok := steelMap["ca"].(float64); ok {
			// Backward compatibility: read old format (SteelMassItem) and convert
			resistance, otherResistance := ConvertCAToResistance(int(ca))

			steel := SteelMaterial{
				Material:        "rebar",
				Resistance:      resistance,
				OtherResistance: otherResistance,
				Mass:            steelMap["mass"].(float64),
			}
			materials = append(materials, steel)
		}
	}

	return materials
}

func consumptionFromDataModule(d *data.Module) *Consumption {
	if d.TotalCO2Min == nil {
		return nil
	}

	return &Consumption{
		CO2Min:    *d.TotalCO2Min,
		CO2Max:    *d.TotalCO2Max,
		EnergyMin: *d.TotalEnergyMin,
		EnergyMax: *d.TotalEnergyMax,
	}
}

func extractFloat64Pointer(data map[string]interface{}, key string) *float64 {
	if val, ok := data[key].(float64); ok {
		return &val
	}
	return nil
}

func extractIntPointer(data map[string]interface{}, key string) *int {
	if val, ok := data[key].(float64); ok {
		intVal := int(val)
		return &intVal
	}
	return nil
}

// PrepareModuleTargetConsumptions creates target consumption records for floors and/or unit.
// It retrieves areas from the database and calculates consumption per m².
func PrepareModuleTargetConsumptions(
	models data.Models,
	moduleID, optionID, roleID uuid.UUID,
	result Consumption,
	floorIDs []uuid.UUID,
	unitID *uuid.UUID,
) ([]data.ModuleTargetConsumption, error) {
	targets := make([]data.ModuleTargetConsumption, 0)

	if len(floorIDs) > 0 {
		for _, floorID := range floorIDs {
			area, err := models.Units.GetFloorArea(floorID)
			if err != nil {
				return nil, err
			}
			if area == 0 {
				return nil, fmt.Errorf("floor %s has zero area", floorID)
			}

			targets = append(targets, data.ModuleTargetConsumption{
				ModuleID:   moduleID,
				TargetID:   floorID,
				TargetType: "floor",
				RoleID:     roleID,
				OptionID:   optionID,
				CO2Min:     result.CO2Min / area,
				CO2Max:     result.CO2Max / area,
				EnergyMin:  result.EnergyMin / area,
				EnergyMax:  result.EnergyMax / area,
			})
		}
	}

	if unitID != nil {
		totalArea, err := models.Units.GetUnitTotalArea(*unitID)
		if err != nil {
			return nil, err
		}
		if totalArea == 0 {
			return nil, fmt.Errorf("unit %s has zero total area", *unitID)
		}

		targets = append(targets, data.ModuleTargetConsumption{
			ModuleID:   moduleID,
			TargetID:   *unitID,
			TargetType: "unit",
			RoleID:     roleID,
			OptionID:   optionID,
			CO2Min:     result.CO2Min / totalArea,
			CO2Max:     result.CO2Max / totalArea,
			EnergyMin:  result.EnergyMin / totalArea,
			EnergyMax:  result.EnergyMax / totalArea,
		})
	}

	if len(targets) == 0 {
		return nil, errors.New("no valid targets provided")
	}

	return targets, nil
}
