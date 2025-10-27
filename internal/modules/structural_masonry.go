package modules

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BlockInfo struct {
	Type  string `json:"type"`
	Fbk   int    `json:"fbk"`
	Count int    `json:"count"`
}

type GroutVolumeItem struct {
	Fgk    int     `json:"fgk"`
	Volume float64 `json:"volume"`
}

type MortarItem struct {
	Fak    int     `json:"fak"`
	Volume float64 `json:"volume"`
}

type GroutInfo struct {
	Position string            `json:"position"`
	Volumes  []GroutVolumeItem `json:"volumes"`
	Steel    []SteelMassItem   `json:"steel"`
}

type MasonryElement struct {
	Grout  []GroutInfo  `json:"grout"`
	Mortar []MortarItem `json:"mortar"`
	Blocks []BlockInfo  `json:"blocks"`
}

type StructuralMasonry struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption     *Consumption    `json:"consumption,omitempty"`
	ConcreteColumns ConcreteElement `json:"concrete_columns"`
	ConcreteBeams   ConcreteElement `json:"concrete_beams"`
	ConcreteSlabs   ConcreteElement `json:"concrete_slabs"`
	FormColumns     *float64        `json:"form_columns,omitempty"`
	FormBeams       *float64        `json:"form_beams,omitempty"`
	FormSlabs       *float64        `json:"form_slabs,omitempty"`
	FormTotal       *float64        `json:"form_total,omitempty"`

	Masonry MasonryElement `json:"masonry"`

	FloorIDs []uuid.UUID `json:"floor_ids"`
}

func (s *StructuralMasonry) GetType() string { return s.Type }

func (s *StructuralMasonry) Validate(v *validator.Validator) {
	v.Check(s.Type != "", "type", "must be provided")
	v.Check(len(s.FloorIDs) > 0, "floor_ids", "must be provided")
	v.Check(validator.Unique(s.FloorIDs), "floor_ids", "must not contain duplicate values")

	validateConcreteElement(v, s.ConcreteColumns, "concrete_columns")
	validateConcreteElement(v, s.ConcreteBeams, "concrete_beams")
	validateConcreteElement(v, s.ConcreteSlabs, "concrete_slabs")

	fgkSet := make(map[int]struct{})

	for i, grout := range s.Masonry.Grout {
		prefix := fmt.Sprintf("masonry.grout[%d]", i)

		v.Check(grout.Position == "vertical" || grout.Position == "horizontal",
			prefix+".position", "must be 'vertical' or 'horizontal'")

		v.Check(len(grout.Volumes) > 0, prefix+".volumes", "must have at least one item")
		fgkSet = make(map[int]struct{})
		for j, vol := range grout.Volumes {
			volPrefix := fmt.Sprintf("%s.volumes[%d]", prefix, j)
			v.Check(vol.Volume > 0, volPrefix+".volume", "must be greater than 0")
			v.Check(vol.Fgk != 0, volPrefix+".fgk", "must be provided")
			if _, exists := fgkSet[vol.Fgk]; exists {
				v.Check(false, volPrefix+".fgk", "duplicate fgk value")
			} else {
				fgkSet[vol.Fgk] = struct{}{}
			}
		}
	}

	v.Check(len(s.Masonry.Mortar) > 0, "masonry.mortar", "must have at least one item")
	fakSet := make(map[int]struct{})
	for i, mortar := range s.Masonry.Mortar {
		prefix := fmt.Sprintf("masonry.mortar[%d]", i)
		v.Check(mortar.Volume > 0, prefix+".volume", "must be greater than 0")
		v.Check(mortar.Fak != 0, prefix+".fak", "must be provided")
		if _, exists := fakSet[mortar.Fak]; exists {
			v.Check(false, prefix+".fak", "duplicate fak value")
		} else {
			fakSet[mortar.Fak] = struct{}{}
		}
	}

	v.Check(len(s.Masonry.Blocks) > 0, "masonry.blocks", "must have at least one item")
	for i, block := range s.Masonry.Blocks {
		prefix := fmt.Sprintf("masonry.blocks[%d]", i)
		v.Check(block.Type != "", prefix+".type", "must be provided")
		v.Check(block.Count >= 0, prefix+".count", "cannot be negative")
	}
}

func addMansonryElement(total *Consumption, me MasonryElement, sidacGrout, sidacSteel, sidacMortar SidacMaterial) error {
	var result Consumption
	for _, g := range me.Grout {
		for _, gv := range g.Volumes {
			val, ok := sidacGrout.KgCO2[float64(gv.Fgk)]
			if !ok {
				val = sidacGrout.KgCO2[30]
			}
			result.CO2Min += val.Min * gv.Volume
			result.CO2Max += val.Max * gv.Volume

			val, ok = sidacGrout.MJ[float64(gv.Fgk)]
			if !ok {
				val = sidacGrout.MJ[30]
			}
			result.EnergyMin += val.Min * gv.Volume
			result.EnergyMax += val.Max * gv.Volume
		}
		for _, gs := range g.Steel {
			val, ok := sidacSteel.KgCO2[float64(gs.CA)]
			if !ok {
				val = sidacSteel.KgCO2[60]
			}
			result.CO2Min += val.Min * gs.Mass
			result.CO2Max += val.Max * gs.Mass

			val, ok = sidacSteel.MJ[float64(gs.CA)]
			if !ok {
				val = sidacSteel.MJ[60]
			}
			result.EnergyMin += val.Min * gs.Mass
			result.EnergyMax += val.Max * gs.Mass
		}
	}

	for _, m := range me.Mortar {
		val, ok := sidacMortar.KgCO2[float64(m.Fak)]
		if !ok {
			val = sidacMortar.KgCO2[14]
		}
		result.CO2Min += val.Min * m.Volume
		result.CO2Max += val.Max * m.Volume

		val, ok = sidacMortar.MJ[float64(m.Fak)]
		if !ok {
			val = sidacMortar.MJ[14]
		}
		result.EnergyMin += val.Min * m.Volume
		result.EnergyMax += val.Max * m.Volume
	}

	for _, b := range me.Blocks {
		blockMass, err := GetBlockMass(b.Type, b.Fbk)
		if err != nil {
			return fmt.Errorf("error getting block mass: %v", err)
		}

		refBlockMass, err := GetBlockMass("inteiro (14x19x39)", b.Fbk)
		if err != nil {
			return fmt.Errorf("error getting reference block mass: %v", err)
		}

		massFactor := blockMass / refBlockMass

		val, ok := sidacBlockData.KgCO2[float64(b.Fbk)]
		if !ok {
			val = sidacBlockData.KgCO2[26]
		}
		result.CO2Min += val.Min * float64(b.Count) * massFactor
		result.CO2Max += val.Max * float64(b.Count) * massFactor

		val, ok = sidacBlockData.MJ[float64(b.Fbk)]
		if !ok {
			val = sidacBlockData.MJ[26]
		}
		result.EnergyMin += val.Min * float64(b.Count) * massFactor
		result.EnergyMax += val.Max * float64(b.Count) * massFactor
	}

	total.sum(result)
	return nil
}

func (s *StructuralMasonry) Calculate() (Consumption, error) {
	total := Consumption{}

	if err := addConcreteElement(&total, s.ConcreteColumns, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}
	if err := addConcreteElement(&total, s.ConcreteBeams, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}
	if err := addConcreteElement(&total, s.ConcreteSlabs, sidacConcreteData, sidacSteelData); err != nil {
		return Consumption{}, err
	}

	if err := addMansonryElement(&total, s.Masonry, sidacGroutData, sidacSteelData, sidacMortarData); err != nil {
		return Consumption{}, err
	}

	return total, nil
}

func (s *StructuralMasonry) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	moduleToInsert := toStructuralMasonryModule(s, moduleID, optionID, result)

	insertedModule, err := models.StructuralMasonryModules.Insert(moduleToInsert)
	if err != nil {
		return nil, err
	}

	return s.toModule(insertedModule), nil
}

func (s *StructuralMasonry) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.StructuralMasonryModules.Delete(moduleID)
}

func (s *StructuralMasonry) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.StructuralMasonryModules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return s.toModule(dataModule), nil
}

func (s *StructuralMasonry) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := toStructuralMasonryModule(s, moduleID, optionID, result)
	return models.StructuralMasonryModules.Update(module)
}

func toStructuralMasonryModule(s *StructuralMasonry, moduleID, optionID uuid.UUID, result Consumption) *data.StructuralMasonryModule {
	col := toDataConcrete(s.ConcreteColumns)
	beam := toDataConcrete(s.ConcreteBeams)
	slab := toDataConcrete(s.ConcreteSlabs)

	masonry := data.Masonry{}

	for _, grout := range s.Masonry.Grout {
		groutInfo := data.GroutInfo{
			Position: grout.Position,
		}
		for _, vol := range grout.Volumes {
			groutInfo.Volumes = append(groutInfo.Volumes, data.GroutVolume{
				Fgk:    vol.Fgk,
				Volume: vol.Volume,
			})
		}
		for _, steel := range grout.Steel {
			groutInfo.Steel = append(groutInfo.Steel, data.SteelMass{
				CA:   steel.CA,
				Mass: steel.Mass,
			})
		}
		masonry.Grout = append(masonry.Grout, groutInfo)
	}

	for _, mortar := range s.Masonry.Mortar {
		masonry.Mortar = append(masonry.Mortar, data.MortarInfo{
			Fak:    mortar.Fak,
			Volume: mortar.Volume,
		})
	}

	for _, block := range s.Masonry.Blocks {
		masonry.Blocks = append(masonry.Blocks, data.BlockInfo{
			Type:  block.Type,
			Fbk:   block.Fbk,
			Count: block.Count,
		})
	}

	return &data.StructuralMasonryModule{
		Module: data.Module{
			ID:             moduleID,
			TowerOptionID:  optionID,
			TotalCO2Min:    &result.CO2Min,
			TotalCO2Max:    &result.CO2Max,
			TotalEnergyMin: &result.EnergyMin,
			TotalEnergyMax: &result.EnergyMax,
			FloorIDs:       s.FloorIDs,
		},
		ConcreteColumns: col,
		ConcreteBeams:   beam,
		ConcreteSlabs:   slab,
		FormColumns:     s.FormColumns,
		FormBeams:       s.FormBeams,
		FormSlabs:       s.FormSlabs,
		FormTotal:       s.FormTotal,
		Masonry:         masonry,
	}
}

func (s *StructuralMasonry) toModule(d *data.StructuralMasonryModule) Module {
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}

	var masonry MasonryElement

	for _, grout := range d.Masonry.Grout {
		info := GroutInfo{
			Position: grout.Position,
		}
		for _, vol := range grout.Volumes {
			info.Volumes = append(info.Volumes, GroutVolumeItem{
				Fgk:    vol.Fgk,
				Volume: vol.Volume,
			})
		}
		for _, steel := range grout.Steel {
			info.Steel = append(info.Steel, SteelMassItem{
				CA:   steel.CA,
				Mass: steel.Mass,
			})
		}
		masonry.Grout = append(masonry.Grout, info)
	}

	for _, mortar := range d.Masonry.Mortar {
		masonry.Mortar = append(masonry.Mortar, MortarItem{
			Fak:    mortar.Fak,
			Volume: mortar.Volume,
		})
	}

	for _, block := range d.Masonry.Blocks {
		masonry.Blocks = append(masonry.Blocks, BlockInfo{
			Type:  block.Type,
			Fbk:   block.Fbk,
			Count: block.Count,
		})
	}

	return &StructuralMasonry{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "structural_masonry"},
		Consumption:     consumption,
		ConcreteColumns: ToConcreteElement(d.ConcreteColumns),
		ConcreteBeams:   ToConcreteElement(d.ConcreteBeams),
		ConcreteSlabs:   ToConcreteElement(d.ConcreteSlabs),
		FormColumns:     d.FormColumns,
		FormBeams:       d.FormBeams,
		FormSlabs:       d.FormSlabs,
		FormTotal:       d.FormTotal,
		Masonry:         masonry,
		FloorIDs:        d.FloorIDs,
	}
}
