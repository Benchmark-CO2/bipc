package modules

import (
	"fmt"

	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type BlockInfo struct {
	Type     string `json:"type"`
	Fbk      int    `json:"fbk"`
	Quantity int    `json:"quantity"`
}

type GroutVolumeItem struct {
	Fgk    int     `json:"fgk"`
	Volume float64 `json:"volume"`
}

type MortarItem struct {
	Fak    float64 `json:"fak"`
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

	if len(s.ConcreteColumns.Volumes) > 0 || len(s.ConcreteColumns.Steel) > 0 {
		validateConcreteElement(v, s.ConcreteColumns, "concrete_columns")
	}
	if len(s.ConcreteBeams.Volumes) > 0 || len(s.ConcreteBeams.Steel) > 0 {
		validateConcreteElement(v, s.ConcreteBeams, "concrete_beams")
	}
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
	fakSet := make(map[float64]struct{})
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
		v.Check(IsValidBlockType(block.Type), prefix+".type", "invalid block type")
		v.Check(block.Fbk > 0, prefix+".fbk", "must be greater than 0")
		v.Check(block.Quantity >= 0, prefix+".quantity", "cannot be negative")
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
			return fmt.Errorf("error getting block mass: %w", err)
		}

		refBlockMass, err := GetBlockMass("inteiro (14x19x39)", b.Fbk)
		if err != nil {
			return fmt.Errorf("error getting reference block mass: %w", err)
		}

		massFactor := blockMass / refBlockMass

		val, ok := sidacBlockData.KgCO2[float64(b.Fbk)]
		if !ok {
			val = sidacBlockData.KgCO2[26]
		}
		result.CO2Min += val.Min * float64(b.Quantity) * massFactor
		result.CO2Max += val.Max * float64(b.Quantity) * massFactor

		val, ok = sidacBlockData.MJ[float64(b.Fbk)]
		if !ok {
			val = sidacBlockData.MJ[26]
		}
		result.EnergyMin += val.Min * float64(b.Quantity) * massFactor
		result.EnergyMax += val.Max * float64(b.Quantity) * massFactor
	}

	total.sum(result)
	return nil
}

func (s *StructuralMasonry) Calculate() (Consumption, error) {
	total := Consumption{}

	if len(s.ConcreteColumns.Volumes) > 0 || len(s.ConcreteColumns.Steel) > 0 {
		if err := addConcreteElement(&total, s.ConcreteColumns, sidacConcreteData, sidacSteelData); err != nil {
			return Consumption{}, err
		}
	}
	if len(s.ConcreteBeams.Volumes) > 0 || len(s.ConcreteBeams.Steel) > 0 {
		if err := addConcreteElement(&total, s.ConcreteBeams, sidacConcreteData, sidacSteelData); err != nil {
			return Consumption{}, err
		}
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

	moduleToInsert := s.toDataModule(moduleID, optionID, result)

	insertedModule, err := models.Modules.Insert(moduleToInsert)
	if err != nil {
		return nil, err
	}

	return s.fromDataModule(insertedModule), nil
}

func (s *StructuralMasonry) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (s *StructuralMasonry) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return s.fromDataModule(dataModule), nil
}

func (s *StructuralMasonry) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	module := s.toDataModule(moduleID, optionID, result)
	return models.Modules.Update(module)
}

func (s *StructuralMasonry) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	masonry := map[string]interface{}{}

	if len(s.Masonry.Grout) > 0 {
		groutList := []map[string]interface{}{}
		for _, grout := range s.Masonry.Grout {
			groutData := map[string]interface{}{
				"position": grout.Position,
				"volumes":  []map[string]interface{}{},
				"steel":    []map[string]interface{}{},
			}
			for _, vol := range grout.Volumes {
				groutData["volumes"] = append(groutData["volumes"].([]map[string]interface{}), map[string]interface{}{
					"fgk":    vol.Fgk,
					"volume": vol.Volume,
				})
			}
			for _, steel := range grout.Steel {
				groutData["steel"] = append(groutData["steel"].([]map[string]interface{}), map[string]interface{}{
					"ca":   steel.CA,
					"mass": steel.Mass,
				})
			}
			groutList = append(groutList, groutData)
		}
		masonry["grout"] = groutList
	}

	if len(s.Masonry.Mortar) > 0 {
		mortarList := []map[string]interface{}{}
		for _, mortar := range s.Masonry.Mortar {
			mortarList = append(mortarList, map[string]interface{}{
				"fak":    mortar.Fak,
				"volume": mortar.Volume,
			})
		}
		masonry["mortar"] = mortarList
	}

	if len(s.Masonry.Blocks) > 0 {
		blocksList := []map[string]interface{}{}
		for _, block := range s.Masonry.Blocks {
			blocksList = append(blocksList, map[string]interface{}{
				"type":     block.Type,
				"fbk":      block.Fbk,
				"quantity": block.Quantity,
			})
		}
		masonry["blocks"] = blocksList
	}

	moduleData := map[string]interface{}{
		"concrete_columns": s.ConcreteColumns,
		"concrete_beams":   s.ConcreteBeams,
		"concrete_slabs":   s.ConcreteSlabs,
		"form_columns":     s.FormColumns,
		"form_beams":       s.FormBeams,
		"form_slabs":       s.FormSlabs,
		"form_total":       s.FormTotal,
		"masonry":          masonry,
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "structural_masonry",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		FloorIDs:       s.FloorIDs,
	}
}

func (s *StructuralMasonry) fromDataModule(d *data.Module) Module {
	var consumption *Consumption
	if d.TotalCO2Min != nil {
		consumption = &Consumption{
			CO2Min:    *d.TotalCO2Min,
			CO2Max:    *d.TotalCO2Max,
			EnergyMin: *d.TotalEnergyMin,
			EnergyMax: *d.TotalEnergyMax,
		}
	}

	var concreteColumns, concreteBeams, concreteSlabs ConcreteElement

	if colData, ok := d.Data["concrete_columns"].(map[string]interface{}); ok {
		concreteColumns = concreteElementFromMap(colData)
	}
	if beamData, ok := d.Data["concrete_beams"].(map[string]interface{}); ok {
		concreteBeams = concreteElementFromMap(beamData)
	}
	if slabData, ok := d.Data["concrete_slabs"].(map[string]interface{}); ok {
		concreteSlabs = concreteElementFromMap(slabData)
	}

	var formColumns, formBeams, formSlabs, formTotal *float64

	if val, ok := d.Data["form_columns"].(float64); ok {
		formColumns = &val
	}
	if val, ok := d.Data["form_beams"].(float64); ok {
		formBeams = &val
	}
	if val, ok := d.Data["form_slabs"].(float64); ok {
		formSlabs = &val
	}
	if val, ok := d.Data["form_total"].(float64); ok {
		formTotal = &val
	}

	var masonry MasonryElement

	if masonryData, ok := d.Data["masonry"].(map[string]interface{}); ok {
		if groutData, ok := masonryData["grout"].([]interface{}); ok {
			for _, g := range groutData {
				if groutMap, ok := g.(map[string]interface{}); ok {
					grout := GroutInfo{
						Position: groutMap["position"].(string),
					}

					if volumesData, ok := groutMap["volumes"].([]interface{}); ok {
						for _, v := range volumesData {
							if volMap, ok := v.(map[string]interface{}); ok {
								grout.Volumes = append(grout.Volumes, GroutVolumeItem{
									Fgk:    int(volMap["fgk"].(float64)),
									Volume: volMap["volume"].(float64),
								})
							}
						}
					}

					if steelData, ok := groutMap["steel"].([]interface{}); ok {
						for _, st := range steelData {
							if steelMap, ok := st.(map[string]interface{}); ok {
								grout.Steel = append(grout.Steel, SteelMassItem{
									CA:   int(steelMap["ca"].(float64)),
									Mass: steelMap["mass"].(float64),
								})
							}
						}
					}

					masonry.Grout = append(masonry.Grout, grout)
				}
			}
		}

		if mortarData, ok := masonryData["mortar"].([]interface{}); ok {
			for _, m := range mortarData {
				if mortarMap, ok := m.(map[string]interface{}); ok {
					masonry.Mortar = append(masonry.Mortar, MortarItem{
						Fak:    mortarMap["fak"].(float64),
						Volume: mortarMap["volume"].(float64),
					})
				}
			}
		}

		if blocksData, ok := masonryData["blocks"].([]interface{}); ok {
			for _, b := range blocksData {
				if blockMap, ok := b.(map[string]interface{}); ok {
					block := BlockInfo{}
					if typeVal, ok := blockMap["type"].(string); ok {
						block.Type = typeVal
					}
					if fbkVal, ok := blockMap["fbk"].(float64); ok {
						block.Fbk = int(fbkVal)
					}
					if quantityVal, ok := blockMap["quantity"].(float64); ok {
						block.Quantity = int(quantityVal)
					}
					masonry.Blocks = append(masonry.Blocks, block)
				}
			}
		}
	}

	return &StructuralMasonry{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "structural_masonry", Outdated: d.Outdated},
		Consumption:     consumption,
		ConcreteColumns: concreteColumns,
		ConcreteBeams:   concreteBeams,
		ConcreteSlabs:   concreteSlabs,
		FormColumns:     formColumns,
		FormBeams:       formBeams,
		FormSlabs:       formSlabs,
		FormTotal:       formTotal,
		Masonry:         masonry,
		FloorIDs:        d.FloorIDs,
	}
}
