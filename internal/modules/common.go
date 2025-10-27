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
	Volumes []ConcreteVolumeItem `json:"volumes"`
	Steel   []SteelMassItem      `json:"steel"`
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

type SidacValue struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type SidacMaterial struct {
	KgCO2 map[float64]SidacValue `json:"kgCO2"`
	MJ    map[float64]SidacValue `json:"MJ"`
}

var sidacConcreteData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		20: {Min: 168.8, Max: 283.5},
		25: {Min: 200.0, Max: 306.4},
		30: {Min: 228.2, Max: 339.4},
		35: {Min: 256.6, Max: 373.6},
		40: {Min: 283.4, Max: 395.5},
	},
	MJ: map[float64]SidacValue{
		20: {Min: 1325, Max: 2244},
		25: {Min: 1488, Max: 2408},
		30: {Min: 1650, Max: 2629},
		35: {Min: 1797, Max: 2849},
		40: {Min: 1928, Max: 3002},
	},
}

var sidacSteelData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		50: {Min: 0.4259, Max: 1.061},
		60: {Min: 0.5, Max: 1.1},
	},
	MJ: map[float64]SidacValue{
		50: {Min: 8.025, Max: 16.05},
		60: {Min: 8.1, Max: 16.1},
	},
}

// TODO aproximar para o fgk mais proximo e quando acima de 30 usar 30
var sidacGroutData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		15: {Min: 157.8, Max: 332.7},
		20: {Min: 186.3, Max: 392.8},
		25: {Min: 228.5, Max: 481.8},
		30: {Min: 294.8, Max: 621.6},
	},
	MJ: map[float64]SidacValue{
		15: {Min: 885.8, Max: 2000.8},
		20: {Min: 1045.8, Max: 2362.1},
		25: {Min: 1282.9, Max: 2897.6},
		30: {Min: 1655, Max: 3738.2},
	},
}

var sidacMortarData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		4.5: {Min: 188.4, Max: 317.8},
		8:   {Min: 196, Max: 355.1},
		14:  {Min: 203, Max: 390.2},
	},
	MJ: map[float64]SidacValue{
		4.5: {Min: 1079.1, Max: 1810.4},
		8:   {Min: 1116.2, Max: 2061.9},
		14:  {Min: 1150, Max: 2298.8},
	},
}

// TODO pegar valores corretos
var sidacBlockData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		4: {Min: 157.8, Max: 332.7},
		6: {Min: 186.3, Max: 392.8},
		8: {Min: 228.5, Max: 481.8},
		10: {Min: 294.8, Max: 621.6},
		12: {Min: 294.8, Max: 621.6},
		14: {Min: 157.8, Max: 332.7},
		16: {Min: 186.3, Max: 392.8},
		18: {Min: 228.5, Max: 481.8},
		20: {Min: 294.8, Max: 621.6},
		22: {Min: 294.8, Max: 621.6},
		24: {Min: 294.8, Max: 621.6},
		26: {Min: 294.8, Max: 621.6},
	},
	MJ: map[float64]SidacValue{
		4: {Min: 157.8, Max: 332.7},
		6: {Min: 186.3, Max: 392.8},
		8: {Min: 228.5, Max: 481.8},
		10: {Min: 294.8, Max: 621.6},
		12: {Min: 294.8, Max: 621.6},
		14: {Min: 157.8, Max: 332.7},
		16: {Min: 186.3, Max: 392.8},
		18: {Min: 228.5, Max: 481.8},
		20: {Min: 294.8, Max: 621.6},
		22: {Min: 294.8, Max: 621.6},
		24: {Min: 294.8, Max: 621.6},
		26: {Min: 294.8, Max: 621.6},
	},
}

type MasonryBlockInfo struct {
	Type       string          `json:"type"`
	Dimensions string          `json:"dimensions"`
	Family     string          `json:"family"`
	Mass       map[int]float64 `json:"mass"`
}

var BlockDatabase = map[string]MasonryBlockInfo{
	"inteiro (14x19x29)": {
		Type:       "Inteiro",
		Dimensions: "14x19x29",
		Family:     "15x30",
		Mass: map[int]float64{
			4:  9.5,
			6:  9.5,
			8:  10.1,
			10: 10.1,
			12: 10.1,
			14: 10.1,
			16: 10.1,
			18: 10.2,
			20: 10.2,
			22: 10.2,
			24: 10.2,
			26: 10.2,
		},
	},
	"meio (14x19x14)": {
		Type:       "Meio",
		Dimensions: "14x19x14",
		Family:     "15x30",
		Mass: map[int]float64{
			4:  5.2,
			6:  5.2,
			8:  5.4,
			10: 5.4,
			12: 5.4,
			14: 5.4,
			16: 5.4,
			18: 5.4,
			20: 5.4,
			22: 5.4,
			24: 5.4,
			26: 5.4,
		},
	},
	"amarração T (14x19x44)": {
		Type:       "Amarração T",
		Dimensions: "14x19x44",
		Family:     "15x30",
		Mass: map[int]float64{
			4:  14.6,
			6:  14.6,
			8:  14.8,
			10: 14.8,
			12: 14.8,
			14: 14.8,
			16: 14.8,
			18: 14.8,
			20: 14.8,
			22: 14.8,
			24: 14.8,
			26: 14.8,
		},
	},
	"canaleta inteira (14x19x29)": {
		Type:       "Canaleta inteira",
		Dimensions: "14x19x29",
		Family:     "15x30",
		Mass: map[int]float64{
			4:  9.8,
			6:  9.8,
			8:  9.8,
			10: 9.8,
			12: 9.8,
			14: 9.8,
			16: 9.8,
			18: 9.8,
			20: 9.8,
			22: 9.8,
			24: 9.8,
			26: 9.8,
		},
	},
	"meia canaleta (14x19x14)": {
		Type:       "Meia canaleta",
		Dimensions: "14x19x14",
		Family:     "15x30",
		Mass: map[int]float64{
			4:  4.9,
			6:  4.9,
			8:  5.2,
			10: 5.2,
			12: 5.2,
			14: 5.2,
			16: 5.2,
			18: 5.2,
			20: 5.2,
			22: 5.2,
			24: 5.2,
			26: 5.2,
		},
	},
	"inteiro (14x19x39)": {
		Type:       "Inteiro",
		Dimensions: "14x19x39",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  12.0,
			6:  12.0,
			8:  13.0,
			10: 13.0,
			12: 13.0,
			14: 13.4,
			16: 13.5,
			18: 13.5,
			20: 13.5,
			22: 13.5,
			24: 13.5,
			26: 13.5,
		},
	},
	"meio (14x19x19)": {
		Type:       "Meio",
		Dimensions: "14x19x19",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  6.2,
			6:  6.2,
			8:  6.5,
			10: 6.5,
			12: 6.5,
			14: 6.5,
			16: 6.5,
			18: 6.5,
			20: 6.5,
			22: 6.5,
			24: 6.5,
			26: 6.5,
		},
	},
	"amarração T (14x19x54)": {
		Type:       "Amarração T",
		Dimensions: "14x19x54",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  17.6,
			6:  17.6,
			8:  17.8,
			10: 17.8,
			12: 17.8,
			14: 17.8,
			16: 17.8,
			18: 17.8,
			20: 17.8,
			22: 17.8,
			24: 17.8,
			26: 17.8,
		},
	},
	"amarração L (14x19x34)": {
		Type:       "Amarração L",
		Dimensions: "14x19x34",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  11.8,
			6:  11.8,
			8:  12.0,
			10: 12.0,
			12: 12.0,
			14: 12.0,
			16: 12.0,
			18: 12.0,
			20: 12.0,
			22: 12.0,
			24: 12.0,
			26: 12.0,
		},
	},
	"canaleta  inteira (14x19x39)": {
		Type:       "Canaleta inteira",
		Dimensions: "14x19x39",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  12.6,
			6:  12.6,
			8:  13.0,
			10: 13.0,
			12: 13.0,
			14: 13.0,
			16: 13.0,
			18: 13.0,
			20: 13.0,
			22: 13.0,
			24: 13.0,
			26: 13.0,
		},
	},
	"canaleta de amarração (14x19x34)": {
		Type:       "Canaleta de amarração",
		Dimensions: "14x19x34",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  11.5,
			6:  11.5,
			8:  12.1,
			10: 12.1,
			12: 12.1,
			14: 12.1,
			16: 12.1,
			18: 12.3,
			20: 12.3,
			22: 12.3,
			24: 12.3,
			26: 12.3,
		},
	},
	"meia canaleta (14x19x19)": {
		Type:       "Meia canaleta",
		Dimensions: "14x19x19",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  6.0,
			6:  6.0,
			8:  6.2,
			10: 6.2,
			12: 6.2,
			14: 6.2,
			16: 6.2,
			18: 6.2,
			20: 6.2,
			22: 6.2,
			24: 6.2,
			26: 6.2,
		},
	},
	"compensador 1/4 (14x19x9)": {
		Type:       "Compensador 1/4",
		Dimensions: "14x19x9",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  3.5,
			6:  3.5,
			8:  3.5,
			10: 3.5,
			12: 3.5,
			14: 3.5,
			16: 3.5,
			18: 3.5,
			20: 3.5,
			22: 3.5,
			24: 3.5,
			26: 3.5,
		},
	},
	"compensador 1/8 (14x19x4)": {
		Type:       "Compensador 1/8",
		Dimensions: "14x19x4",
		Family:     "15x40",
		Mass: map[int]float64{
			4:  2.0,
			6:  2.0,
			8:  2.0,
			10: 2.0,
			12: 2.0,
			14: 2.0,
			16: 2.0,
			18: 2.0,
			20: 2.0,
			22: 2.0,
			24: 2.0,
			26: 2.0,
		},
	},
	"inteiro (19x19x39)": {
		Type:       "Inteiro",
		Dimensions: "19x19x39",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  15.5,
			6:  15.5,
			8:  17.0,
			10: 17.0,
			12: 17.6,
			14: 18.2,
			16: 18.2,
			18: 18.2,
			20: 18.5,
			22: 18.5,
			24: 18.5,
			26: 18.5,
		},
	},
	"meio (19x19x19)": {
		Type:       "Meio",
		Dimensions: "19x19x19",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  8.0,
			6:  8.0,
			8:  8.3,
			10: 8.3,
			12: 9.2,
			14: 9.2,
			16: 9.2,
			18: 9.2,
			20: 9.2,
			22: 9.2,
			24: 9.2,
			26: 9.2,
		},
	},
	"canaleta inteira (19x19x39)": {
		Type:       "Canaleta inteira",
		Dimensions: "19x19x39",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  16.4,
			6:  16.4,
			8:  16.8,
			10: 16.8,
			12: 17.1,
			14: 16.8,
			16: 16.8,
			18: 16.8,
			20: 16.8,
			22: 16.8,
			24: 16.8,
			26: 16.8,
		},
	},
	"meia canaleta (19x19x19)": {
		Type:       "Meia canaleta",
		Dimensions: "19x19x19",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  7.8,
			6:  7.8,
			8:  8.0,
			10: 8.0,
			12: 8.4,
			14: 8.0,
			16: 8.0,
			18: 8.0,
			20: 8.0,
			22: 8.0,
			24: 8.0,
			26: 8.0,
		},
	},
	"compensador 1/4 (19x19x9)": {
		Type:       "Compensador 1/4",
		Dimensions: "19x19x9",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  4.6,
			6:  4.6,
			8:  4.6,
			10: 4.6,
			12: 4.4,
			14: 4.6,
			16: 4.6,
			18: 4.6,
			20: 4.6,
			22: 4.6,
			24: 4.6,
			26: 4.6,
		},
	},
	"compensador 1/8 (19x19x4)": {
		Type:       "Compensador 1/8",
		Dimensions: "19x19x4",
		Family:     "20x40",
		Mass: map[int]float64{
			4:  2.5,
			6:  2.5,
			8:  2.5,
			10: 2.5,
			12: 2.5,
			14: 2.5,
			16: 2.5,
			18: 2.5,
			20: 2.5,
			22: 2.5,
			24: 2.5,
			26: 2.5,
		},
	},
}

func GetBlockMass(blockType string, fbk int) (float64, error) {
	block, exists := BlockDatabase[blockType]
	if !exists {
		return 0, fmt.Errorf("tipo de bloco não encontrado: %s", blockType)
	}
	
	mass, exists := block.Mass[fbk]
	if !exists {
		return 0, fmt.Errorf("fbk %d não encontrado para o bloco tipo %s", fbk, blockType)
	}
	
	return mass, nil
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
