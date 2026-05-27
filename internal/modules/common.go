package modules

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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
	Material        string          `json:"material"`
	OtherName       string          `json:"other_name,omitempty"`
	Resistance      string          `json:"resistance"`
	OtherResistance float64         `json:"other_resistance,omitempty"`
	Mass            float64         `json:"mass"`
	Position        ElementPosition `json:"position,omitempty"` // "wall", "slab", etc.
}

type ConcreteVolumeItem struct {
	Fck      int             `json:"fck"`
	Volume   float64         `json:"volume"`
	Position ElementPosition `json:"position,omitempty"`
}

type FormAreaItem struct {
	Area     float64         `json:"area"`
	Position ElementPosition `json:"position,omitempty"`
}

type ConcreteElement struct {
	Volumes []ConcreteVolumeItem `json:"volumes"`
	Steel   []SteelMaterial      `json:"steel"`
}

type ElementPosition string

const (
	ElementPositionWall   ElementPosition = "wall"
	ElementPositionSlab   ElementPosition = "slab"
	ElementPositionColumn ElementPosition = "column"
	ElementPositionBeam   ElementPosition = "beam"
	ElementPositionStair  ElementPosition = "stair"
)

func (c ConcreteElement) MarshalJSON() ([]byte, error) {
	if len(c.Volumes) == 0 && len(c.Steel) == 0 {
		return []byte("null"), nil
	}
	if c.Volumes == nil {
		c.Volumes = []ConcreteVolumeItem{}
	}
	if c.Steel == nil {
		c.Steel = []SteelMaterial{}
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
	Material  float64 `json:"material"`
}

func (c *Consumption) sum(value Consumption) {
	c.CO2Min += value.CO2Min
	c.CO2Max += value.CO2Max
	c.EnergyMin += value.EnergyMin
	c.EnergyMax += value.EnergyMax
	c.Material += value.Material
}

func concreteVolumeFromElement(ce ConcreteElement) float64 {
	total := 0.0
	for _, volume := range ce.Volumes {
		total += volume.Volume
	}

	return total
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
			v.Check(isSupportedOtherResistance(material.OtherResistance), prefix+".other_resistance",
				"must match a supported resistance value")
		}

		if material.Resistance != "other" {
			v.Check(material.OtherResistance == 0, prefix+".other_resistance",
				"must be empty when resistance is not 'other'")
		}

		v.Check(material.Mass >= 0, prefix+".mass", "cannot be negative")
	}
}

func isSupportedOtherResistance(value float64) bool {
	if _, ok := sidacSteelData.KgCO2[value]; ok {
		return true
	}

	if _, ok := sidacStrandData.KgCO2[value]; ok {
		return true
	}

	return false
}

func isSupportedGroutFgk(value int) bool {
	_, ok := sidacGroutData.KgCO2[float64(value)]
	return ok
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

func CalculateConcreteConsumption(items []ConcreteVolumeItem) Consumption {
	var result Consumption

	for _, item := range items {
		fck := float64(item.Fck)

		co2Val, ok := sidacConcreteData.KgCO2[fck]
		if !ok {
			co2Val = sidacConcreteData.KgCO2[40]
		}
		result.CO2Min += co2Val.Min * item.Volume
		result.CO2Max += co2Val.Max * item.Volume

		energyVal, ok := sidacConcreteData.MJ[fck]
		if !ok {
			energyVal = sidacConcreteData.MJ[40]
		}
		result.EnergyMin += energyVal.Min * item.Volume
		result.EnergyMax += energyVal.Max * item.Volume
	}

	return result
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

func validatePositionedConcrete(
	v *validator.Validator,
	concrete []ConcreteVolumeItem,
	validPositions []ElementPosition,
) {
	const concreteField = "concrete"

	fckPositionSet := make(map[string]struct{})
	shouldValidatePosition := len(validPositions) > 0
	validPositionStrings := elementPositionsAsStrings(validPositions)

	for i, item := range concrete {
		prefix := fmt.Sprintf("%s[%d]", concreteField, i)
		v.Check(item.Volume > 0, prefix+".volume", "must be greater than 0")
		v.Check(item.Fck != 0, prefix+".fck", "must be provided")

		if shouldValidatePosition && item.Position != "" {
			v.Check(validator.PermittedValue(string(item.Position), validPositionStrings...), prefix+".position", fmt.Sprintf("must be one of: %s", strings.Join(validPositionStrings, ", ")))
		}

		key := fmt.Sprintf("%s_%d", string(item.Position), item.Fck)
		if _, exists := fckPositionSet[key]; exists {
			v.Check(false, prefix+".fck", fmt.Sprintf("duplicate fck %d for position %s", item.Fck, string(item.Position)))
			continue
		}

		fckPositionSet[key] = struct{}{}
	}

	v.Check(len(concrete) > 0, concreteField, "must have at least one item")
}

func validatePositionedSteel(
	v *validator.Validator,
	steel []SteelMaterial,
	validPositions []ElementPosition,
) {
	const steelField = "steel"

	shouldValidatePosition := len(validPositions) > 0
	validPositionStrings := elementPositionsAsStrings(validPositions)

	ValidateSteelMaterials(v, steel, steelField)
	for i, item := range steel {
		prefix := fmt.Sprintf("%s[%d]", steelField, i)
		if shouldValidatePosition && item.Position != "" {
			v.Check(validator.PermittedValue(string(item.Position), validPositionStrings...), prefix+".position", fmt.Sprintf("must be one of: %s", strings.Join(validPositionStrings, ", ")))
		}
	}

	v.Check(len(steel) > 0, steelField, "must have at least one item")
}

func validatePositionedForm(
	v *validator.Validator,
	form []FormAreaItem,
	validPositions []ElementPosition,
) {
	const formField = "form"

	shouldValidatePosition := len(validPositions) > 0
	validPositionStrings := elementPositionsAsStrings(validPositions)
	positionSet := make(map[string]struct{})

	for i, item := range form {
		prefix := fmt.Sprintf("%s[%d]", formField, i)
		v.Check(item.Area >= 0, prefix+".area", "cannot be negative")

		if shouldValidatePosition && item.Position != "" {
			v.Check(validator.PermittedValue(string(item.Position), validPositionStrings...), prefix+".position", fmt.Sprintf("must be one of: %s", strings.Join(validPositionStrings, ", ")))
		}

		key := string(item.Position)
		if _, exists := positionSet[key]; exists {
			v.Check(false, prefix+".position", fmt.Sprintf("duplicate form for position %s", key))
			continue
		}

		positionSet[key] = struct{}{}
	}
}

func formAreasFromInterface(data interface{}) []FormAreaItem {
	var form []FormAreaItem

	formData, ok := data.([]interface{})
	if !ok {
		return form
	}

	for _, item := range formData {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		formItem := FormAreaItem{}
		if area, ok := itemMap["area"].(float64); ok {
			formItem.Area = area
		}
		if position, ok := itemMap["position"].(string); ok {
			formItem.Position = ElementPosition(position)
		}

		form = append(form, formItem)
	}

	return form
}

func elementPositionsAsStrings(positions []ElementPosition) []string {
	result := make([]string, 0, len(positions))
	for _, position := range positions {
		result = append(result, string(position))
	}

	return result
}

func flattenConcreteByPosition(positions []ElementPosition, elementsByPosition map[ElementPosition]ConcreteElement) (concrete []ConcreteVolumeItem) {
	for _, position := range positions {
		element, ok := elementsByPosition[position]
		if !ok {
			continue
		}

		for _, v := range element.Volumes {
			concrete = append(concrete, ConcreteVolumeItem{Fck: v.Fck, Volume: v.Volume, Position: position})
		}
	}

	return concrete
}

func flattenSteelByPosition(positions []ElementPosition, elementsByPosition map[ElementPosition]ConcreteElement) (steel []SteelMaterial) {
	for _, position := range positions {
		element, ok := elementsByPosition[position]
		if !ok {
			continue
		}

		for _, s := range element.Steel {
			steel = append(steel, SteelMaterial{
				Material:        s.Material,
				OtherName:       s.OtherName,
				Resistance:      s.Resistance,
				OtherResistance: s.OtherResistance,
				Mass:            s.Mass,
				Position:        position,
			})
		}
	}

	return steel
}

func groupConcreteByPosition(concrete []ConcreteVolumeItem) map[ElementPosition]ConcreteElement {
	elementsByPosition := map[ElementPosition]ConcreteElement{}

	for _, item := range concrete {
		position := item.Position
		element := elementsByPosition[position]
		element.Volumes = append(element.Volumes, ConcreteVolumeItem{Fck: item.Fck, Volume: item.Volume})
		elementsByPosition[position] = element
	}

	return elementsByPosition
}

func groupSteelByPosition(elementsByPosition map[ElementPosition]ConcreteElement, steel []SteelMaterial) map[ElementPosition]ConcreteElement {
	if elementsByPosition == nil {
		elementsByPosition = map[ElementPosition]ConcreteElement{}
	}

	for _, s := range steel {
		position := s.Position
		element := elementsByPosition[position]
		element.Steel = append(element.Steel, SteelMaterial{
			Material:        s.Material,
			OtherName:       s.OtherName,
			Resistance:      s.Resistance,
			OtherResistance: s.OtherResistance,
			Mass:            s.Mass,
		})
		elementsByPosition[position] = element
	}

	return elementsByPosition
}

func (ce *ConcreteElement) calculate(sidacConcrete, sidacSteel SidacMaterial) (Consumption, error) {
	var result Consumption
	for _, c := range ce.Volumes {
		val, ok := sidacConcrete.KgCO2[float64(c.Fck)]
		if !ok {
			// return result, fmt.Errorf("fck not found in sidacConcreteData: %d", c.Fck)
			val = sidacConcrete.KgCO2[40]
		}
		result.Material += c.Volume
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
			if position, ok := steelMap["position"].(string); ok {
				steel.Position = ElementPosition(position)
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

func concreteVolumesFromInterface(data interface{}) []ConcreteVolumeItem {
	items, ok := data.([]interface{})
	if !ok {
		return nil
	}

	result := make([]ConcreteVolumeItem, 0, len(items))
	for _, item := range items {
		volumeMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		volume := ConcreteVolumeItem{}
		if fck, ok := volumeMap["fck"].(float64); ok {
			volume.Fck = int(fck)
		}
		if amount, ok := volumeMap["volume"].(float64); ok {
			volume.Volume = amount
		}
		if position, ok := volumeMap["position"].(string); ok {
			volume.Position = ElementPosition(position)
		}

		result = append(result, volume)
	}

	return result
}

func steelMaterialsFromInterface(data interface{}) []SteelMaterial {
	items, ok := data.([]interface{})
	if !ok {
		return nil
	}

	return steelMaterialsFromData(items)
}

func consumptionFromDataModule(d *data.Module) *Consumption {
	if d.TotalCO2Min == nil {
		return nil
	}

	material := 0.0
	if d.TotalMaterial != nil {
		material = *d.TotalMaterial
	}

	return &Consumption{
		CO2Min:    *d.TotalCO2Min,
		CO2Max:    *d.TotalCO2Max,
		EnergyMin: *d.TotalEnergyMin,
		EnergyMax: *d.TotalEnergyMax,
		Material:  material,
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

func extractStringPointer(data map[string]interface{}, key string) *string {
	val, ok := data[key].(string)
	if !ok {
		return nil
	}

	trimmed := strings.TrimSpace(val)
	if trimmed == "" {
		return nil
	}

	return &trimmed
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
				return nil, fmt.Errorf("%w: floor %s has zero area", data.ErrZeroArea, floorID)
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
				Material:   result.Material / area,
			})
		}
	}

	if unitID != nil {
		totalArea, err := models.Units.GetUnitTotalArea(*unitID)
		if err != nil {
			return nil, err
		}

		if totalArea == 0 {
			return nil, fmt.Errorf("unit %s has zero total area, please add floors with area before adding modules", *unitID)
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
			Material:   result.Material / totalArea,
		})
	}

	if len(targets) == 0 {
		return nil, errors.New("no valid targets provided")
	}

	return targets, nil
}
