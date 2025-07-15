package modules

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type Concrete struct {
	Fck    string  `json:"fck"`
	Volume float64 `json:"volume"`
}

type BasicModuleData struct {
	Name            string  `json:"name"`
	StructureType   string  `json:"structure_type"`
	FloorRepetition int     `json:"floor_repetition"`
	FloorArea       float64 `json:"floor_area"`
	FloorHeight     float64 `json:"floor_height"`
}

type ModuleResponseData struct {
	CO2Min    *float64 `json:"co2_min,omitempty"`
	CO2Max    *float64 `json:"co2_max,omitempty"`
	EnergyMin *float64 `json:"energy_min,omitempty"`
	EnergyMax *float64 `json:"energy_max,omitempty"`
	InUse     bool     `json:"in_use"`
	Version   int32    `json:"version"`
}

type Consuption struct {
	CO2Min    float64 `json:"co2_min"`
	CO2Max    float64 `json:"co2_max"`
	EnergyMin float64 `json:"energy_min"`
	EnergyMax float64 `json:"energy_max"`
}

func (c *Consuption) sum(value Consuption) {
	c.CO2Min += value.CO2Min
	c.CO2Max += value.CO2Max
	c.EnergyMin += value.EnergyMin
	c.EnergyMax += value.EnergyMax
}

func (c *Consuption) divideByArea(area float64) {
	if area == 0 {
		return
	}
	c.CO2Min /= area
	c.CO2Max /= area
	c.EnergyMin /= area
	c.EnergyMax /= area
}

type ModuleStructure interface {
	Type() string
	Validate(v *validator.Validator)
	ValidateVersion(v *validator.Validator)
	Calculate() (Consuption, error)
	Insert(models data.Models, unitID int64, result Consuption, opts *InsertOptions) error
	GetVersions(models data.Models, moduleID int64) (any, error)
	MergeModuleData(models data.Models, moduleID int64) (*int32, error)
}

func validateConcreteList(v *validator.Validator, list []Concrete, fieldPrefix string) {
	fckSet := make(map[string]struct{})
	for _, c := range list {
		v.Check(c.Volume > 0, fieldPrefix+".volume", "must be greater than 0")
		v.Check(c.Fck != "", fieldPrefix+".fck", "must be provided")
		if _, exists := fckSet[c.Fck]; exists {
			v.Check(false, fieldPrefix+".fck", "duplicate fck value: "+c.Fck)
		} else {
			fckSet[c.Fck] = struct{}{}
		}
	}
	v.Check(len(list) > 0, fieldPrefix, "must have at least one item")
}

func UnmarshalModuleStructure(data []byte) (ModuleStructure, error) {
	var basic BasicModuleData
	if err := json.Unmarshal(data, &basic); err != nil {
		return nil, err
	}
	switch strings.ToLower(basic.StructureType) {
	case "beam_column":
		var b BeamColumn
		if err := json.Unmarshal(data, &b); err != nil {
			return nil, err
		}
		return &b, nil
	case "concrete_wall":
		var w ConcreteWall
		if err := json.Unmarshal(data, &w); err != nil {
			return nil, err
		}
		return &w, nil
	default:
		return nil, errors.New("invalid structure_type")
	}
}

type SidacValue struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type SidacMaterial struct {
	KgCO2 map[string]SidacValue `json:"kgCO2"`
	MJ    map[string]SidacValue `json:"MJ"`
}

var sidacConcreteData = SidacMaterial{
	KgCO2: map[string]SidacValue{
		"20": {Min: 168.8, Max: 283.5},
		"25": {Min: 200.0, Max: 306.4},
		"30": {Min: 228.2, Max: 339.4},
		"35": {Min: 256.6, Max: 373.6},
		"40": {Min: 283.4, Max: 395.5},
	},
	MJ: map[string]SidacValue{
		"20": {Min: 1325, Max: 2244},
		"25": {Min: 1488, Max: 2408},
		"30": {Min: 1650, Max: 2629},
		"35": {Min: 1797, Max: 2849},
		"40": {Min: 1928, Max: 3002},
	},
}

var sidacSteelData = SidacMaterial{
	KgCO2: map[string]SidacValue{
		"50": {Min: 0.4259, Max: 1.061},
		"60": {Min: 0.5, Max: 1.1},
	},
	MJ: map[string]SidacValue{
		"50": {Min: 8.025, Max: 16.05},
		"60": {Min: 8.1, Max: 16.1},
	},
}

func calculateConcrete(list []Concrete, sidac SidacMaterial) (Consuption, error) {
	var result Consuption
	for _, c := range list {
		val, ok := sidac.KgCO2[c.Fck]
		if !ok {
			return result, errors.New("fck not found in sidacConcreteData: " + c.Fck)
		}
		result.CO2Min += val.Min * c.Volume
		result.CO2Max += val.Max * c.Volume
	}
	for _, c := range list {
		val, ok := sidac.MJ[c.Fck]
		if !ok {
			return result, errors.New("fck not found in sidacConcreteData: " + c.Fck)
		}
		result.EnergyMin += val.Min * c.Volume
		result.EnergyMax += val.Max * c.Volume
	}
	return result, nil
}

func calculateSteel(ca50, ca60 float64, sidac SidacMaterial) (Consuption, error) {
	var result Consuption

	val, ok := sidac.KgCO2["50"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 50")
	}
	result.CO2Min += val.Min * ca50
	result.CO2Max += val.Max * ca50

	val, ok = sidac.MJ["50"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 50")
	}
	result.EnergyMin += val.Min * ca50
	result.EnergyMax += val.Max * ca50

	val, ok = sidac.KgCO2["60"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 60")
	}
	result.CO2Min += val.Min * ca60
	result.CO2Max += val.Max * ca60

	val, ok = sidac.MJ["60"]
	if !ok {
		return result, errors.New("steel type not found in sidacSteelData: 60")
	}
	result.EnergyMin += val.Min * ca60
	result.EnergyMax += val.Max * ca60

	return result, nil
}

func addConcreteList(total *Consuption, list []Concrete, sidac SidacMaterial) error {
	result, err := calculateConcrete(list, sidac)
	if err != nil {
		return err
	}
	total.sum(result)
	return nil
}

type InsertOptions struct {
	Version *int32
	ID      *int64
}

func aggregateConcreteVolumes(list []Concrete) *data.Concrete {
	c := &data.Concrete{}
	for _, item := range list {
		switch item.Fck {
		case "20":
			c.VolumeFck20 += item.Volume
		case "25":
			c.VolumeFck25 += item.Volume
		case "30":
			c.VolumeFck30 += item.Volume
		case "35":
			c.VolumeFck35 += item.Volume
		case "40":
			c.VolumeFck40 += item.Volume
		case "45":
			c.VolumeFck45 += item.Volume
		}
	}
	return c
}

func toConcrete(c data.Concrete) []Concrete {
	var concretes []Concrete
	if c.VolumeFck20 > 0 {
		concretes = append(concretes, Concrete{Fck: "20", Volume: c.VolumeFck20})
	}
	if c.VolumeFck25 > 0 {
		concretes = append(concretes, Concrete{Fck: "25", Volume: c.VolumeFck25})
	}
	if c.VolumeFck30 > 0 {
		concretes = append(concretes, Concrete{Fck: "30", Volume: c.VolumeFck30})
	}
	if c.VolumeFck35 > 0 {
		concretes = append(concretes, Concrete{Fck: "35", Volume: c.VolumeFck35})
	}
	if c.VolumeFck40 > 0 {
		concretes = append(concretes, Concrete{Fck: "40", Volume: c.VolumeFck40})
	}
	if c.VolumeFck45 > 0 {
		concretes = append(concretes, Concrete{Fck: "45", Volume: c.VolumeFck45})
	}
	return concretes
}

func GetModule(models data.Models, id int64) (any, error) {

	concreteWallModules, err := models.ConcreteWallModules.GetById(id)
	if err != nil {
		return nil, err
	}
	if len(concreteWallModules) > 0 {
		var res []*ConcreteWall
		for _, v := range concreteWallModules {
			res = append(res, toConcreteWallResponse(v))
		}
		return res, nil
	}

	beamColumnModules, err := models.BeamColumnModules.GetById(id)
	if err != nil {
		return nil, err
	}
	if len(beamColumnModules) > 0 {
		var res []*BeamColumn
		for _, v := range beamColumnModules {
			res = append(res, toBeamColumnResponse(v))
		}
		return res, nil
	}

	return nil, data.ErrRecordNotFound
}
