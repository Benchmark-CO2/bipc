package modules

import (
	"fmt"
)

type SidacValue struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type SidacMaterial struct {
	KgCO2 map[float64]SidacValue `json:"kgCO2"`
	MJ    map[float64]SidacValue `json:"MJ"`
}

var supportedMortarFakValues = []float64{4.5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24}
var supportedBlockFbkValues = []float64{4.5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26}

func IsSupportedMortarFak(fak float64) bool {
	for _, supported := range supportedMortarFakValues {
		if fak == supported {
			return true
		}
	}

	return false
}

func IsSupportedBlockFbk(fbk float64) bool {
	for _, supported := range supportedBlockFbkValues {
		if fbk == supported {
			return true
		}
	}

	return false
}

func NormalizeMortarFakToFirstSupportedAbove(fak float64) float64 {
	if fak <= 0 {
		return fak
	}

	for _, supported := range supportedMortarFakValues {
		if fak <= supported {
			return supported
		}
	}

	return supportedMortarFakValues[len(supportedMortarFakValues)-1]
}

func NormalizeBlockFbkToFirstSupportedAbove(fbk float64) float64 {
	if fbk <= 0 {
		return fbk
	}

	for _, supported := range supportedBlockFbkValues {
		if fbk <= supported {
			return supported
		}
	}

	return supportedBlockFbkValues[len(supportedBlockFbkValues)-1]
}

var supportedGroutFgkValues = []int{15, 20, 25, 30, 35, 40, 45, 50}

func NormalizeGroutFgk(fgk float64) float64 {
	if fgk <= 0 {
		return fgk
	}

	for _, supported := range supportedGroutFgkValues {
		if fgk <= float64(supported) {
			return float64(supported)
		}
	}

	return float64(supportedGroutFgkValues[len(supportedGroutFgkValues)-1])
}

var sidacConcreteData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		20: {Min: 168.8, Max: 283.5},
		25: {Min: 200.0, Max: 306.4},
		30: {Min: 228.2, Max: 339.4},
		35: {Min: 256.6, Max: 373.6},
		40: {Min: 283.4, Max: 395.5},
		45: {Min: 313.1, Max: 427.0},
		50: {Min: 341.7, Max: 456.2},
	},
	MJ: map[float64]SidacValue{
		20: {Min: 1325.0, Max: 2244.0},
		25: {Min: 1488.0, Max: 2408.0},
		30: {Min: 1650.0, Max: 2629.0},
		35: {Min: 1797.0, Max: 2849.0},
		40: {Min: 1928.0, Max: 3002.0},
		45: {Min: 2092.1, Max: 3213.5},
		50: {Min: 2243.6, Max: 3409.2},
	},
}

var sidacSteelData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		50: {Min: 0.4259, Max: 1.061},
		60: {Min: 0.4259, Max: 1.061},
	},
	MJ: map[float64]SidacValue{
		50: {Min: 8.025, Max: 16.05},
		60: {Min: 8.025, Max: 16.05},
	},
}

// Prestressing strands CP190 RB 12.7
var sidacStrandData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		190: {Min: 0.4259, Max: 1.061},
	},
	MJ: map[float64]SidacValue{
		190: {Min: 8.025, Max: 16.05},
	},
}

var sidacGroutData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		15: {Min: 239.7, Max: 310.9},
		20: {Min: 276.7, Max: 359.3},
		25: {Min: 318.9, Max: 414.7},
		30: {Min: 369.5, Max: 481.1},
		35: {Min: 387.8, Max: 486.2},
		40: {Min: 433.2, Max: 543.5},
		45: {Min: 484.3, Max: 608.1},
		50: {Min: 541.6, Max: 680.6},
	},
	MJ: map[float64]SidacValue{
		15: {Min: 1516, Max: 2318},
		20: {Min: 1723, Max: 2648},
		25: {Min: 1948, Max: 3014},
		30: {Min: 2226, Max: 3463},
		35: {Min: 2226, Max: 3473},
		40: {Min: 2456, Max: 3852},
		45: {Min: 2713, Max: 4277},
		50: {Min: 3001, Max: 4756},
	},
}

var sidacMortarData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		4.5: {Min: 207.8, Max: 260.8},
		6:   {Min: 219.8, Max: 276.1},
		8:   {Min: 236.7, Max: 297.5},
		10:  {Min: 254.7, Max: 320.3},
		12:  {Min: 274.4, Max: 345.2},
		14:  {Min: 295.8, Max: 372.5},
		16:  {Min: 319.0, Max: 402.2},
		18:  {Min: 341.5, Max: 431.8},
		20:  {Min: 372.5, Max: 470.7},
		22:  {Min: 403.2, Max: 510.3},
		24:  {Min: 437.0, Max: 553.8},
	},
	MJ: map[float64]SidacValue{
		4.5: {Min: 1345, Max: 1953},
		6:   {Min: 1419, Max: 2063},
		8:   {Min: 1519, Max: 2211},
		10:  {Min: 1623, Max: 2365},
		12:  {Min: 1734, Max: 2531},
		14:  {Min: 1853, Max: 2712},
		16:  {Min: 1981, Max: 2908},
		18:  {Min: 2073, Max: 3075},
		20:  {Min: 2272, Max: 3358},
		22:  {Min: 2438, Max: 3618},
		24:  {Min: 2619, Max: 3904},
	},
}

var sidacBlockData = SidacMaterial{
	KgCO2: map[float64]SidacValue{
		4.5: {Min: 0.390, Max: 1.080},
		6:   {Min: 0.540, Max: 1.140},
		8:   {Min: 0.680, Max: 1.350},
		10:  {Min: 0.790, Max: 1.610},
		12:  {Min: 0.700, Max: 1.970},
		14:  {Min: 0.792, Max: 1.645},
		16:  {Min: 0.967, Max: 1.860},
		18:  {Min: 0.920, Max: 2.210},
		20:  {Min: 1.188, Max: 2.404},
		22:  {Min: 1.257, Max: 2.569},
		24:  {Min: 1.530, Max: 2.565},
		26:  {Min: 1.716, Max: 2.540},
	},
	MJ: map[float64]SidacValue{
		4.5: {Min: 2.877, Max: 7.870},
		6:   {Min: 3.611, Max: 8.454},
		8:   {Min: 4.430, Max: 10.030},
		10:  {Min: 5.020, Max: 11.200},
		12:  {Min: 4.846, Max: 13.250},
		14:  {Min: 5.254, Max: 11.280},
		16:  {Min: 6.146, Max: 12.700},
		18:  {Min: 6.002, Max: 14.420},
		20:  {Min: 7.322, Max: 15.810},
		22:  {Min: 7.736, Max: 16.730},
		24:  {Min: 8.924, Max: 17.130},
		26:  {Min: 9.880, Max: 17.590},
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

func IsValidBlockType(blockType string) bool {
	_, exists := BlockDatabase[blockType]
	return exists
}

func normalizeBlockMassLookupFbk(fbk float64) int {
	if fbk == 4.5 {
		return 4
	}

	return int(fbk)
}

func GetBlockMass(blockType string, fbk float64) (float64, error) {
	block, exists := BlockDatabase[blockType]
	if !exists {
		return 0, fmt.Errorf("block type not found: %s", blockType)
	}

	lookupFbk := normalizeBlockMassLookupFbk(fbk)

	mass, exists := block.Mass[lookupFbk]
	if !exists {
		nextFbk := -1
		for availableFbk := range block.Mass {
			if availableFbk > lookupFbk && (nextFbk == -1 || availableFbk < nextFbk) {
				nextFbk = availableFbk
			}
		}

		if nextFbk == -1 {
			maxFbk := -1
			for availableFbk := range block.Mass {
				if availableFbk > maxFbk {
					maxFbk = availableFbk
				}
			}

			if maxFbk == -1 {
				return 0, fmt.Errorf("no mass data available for block type %s", blockType)
			}

			mass = block.Mass[maxFbk]
		} else {
			mass = block.Mass[nextFbk]
		}
	}

	return mass, nil
}
