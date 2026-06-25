package modules

import (
	"github.com/google/uuid"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var pilesFoundationValidPositions = []ElementPosition{
	ElementPositionPile,
	ElementPositionBlock,
	ElementPositionGrade,
	ElementPositionTie,
}

type PilesFoundationPiles struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationBlocks struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationGradeBeams struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundationTieBeams struct {
	Volume float64         `json:"volume"`
	Steel  []SteelMaterial `json:"steel"`
}

type PilesFoundation struct {
	ID uuid.UUID `json:"id"`
	BasicModuleData
	Consumption *Consumption `json:"consumption,omitempty"`

	// Preferred format: flat list with Position per item.
	Concrete []ConcreteVolumeItem `json:"concrete,omitempty"`
	Steel    []SteelMaterial      `json:"steel,omitempty"`

	// Legacy compatibility fields.
	Fck        int                       `json:"fck"`
	Piles      PilesFoundationPiles      `json:"piles"`
	Blocks     PilesFoundationBlocks     `json:"blocks"`
	GradeBeams PilesFoundationGradeBeams `json:"grade_beams"`
	TieBeams   PilesFoundationTieBeams   `json:"tie_beams"`
	UnitID     uuid.UUID                 `json:"unit_id"`
}

func (p *PilesFoundation) GetType() string { return p.Type }

func (p *PilesFoundation) VersionContract() moduleVersionContract {
	return moduleVersionContract{
		v1Disallowed: []string{"concrete", "steel"},
		v2Disallowed: []string{"fck", "piles", "blocks", "grade_beams", "tie_beams"},
		toV1:         applyV1LegacyResponse,
		toV2: func(moduleMap map[string]any) {
			removeKeys(moduleMap, "fck", "piles", "blocks", "grade_beams", "tie_beams")
		},
	}
}

func (p *PilesFoundation) validPositions() []ElementPosition {
	return append([]ElementPosition(nil), pilesFoundationValidPositions...)
}

func (p *PilesFoundation) hasNewFormat() bool {
	return len(p.Concrete) > 0 || len(p.Steel) > 0
}

func (p *PilesFoundation) syncLegacyFromNewFormat() {
	legacyAlreadyPresent := p.Piles.Volume > 0 || p.Blocks.Volume > 0 || p.GradeBeams.Volume > 0 || p.TieBeams.Volume > 0 ||
		len(p.Piles.Steel) > 0 || len(p.Blocks.Steel) > 0 || len(p.GradeBeams.Steel) > 0 || len(p.TieBeams.Steel) > 0
	if legacyAlreadyPresent {
		return
	}

	elementsByPosition := groupConcreteByPosition(p.Concrete)
	elementsByPosition = groupSteelByPosition(elementsByPosition, p.Steel)

	pilesElement := elementsByPosition[ElementPositionPile]
	blocksElement := elementsByPosition[ElementPositionBlock]
	gradeElement := elementsByPosition[ElementPositionGrade]
	tieElement := elementsByPosition[ElementPositionTie]

	p.Piles = PilesFoundationPiles{
		Volume: concreteVolumeFromElement(pilesElement),
		Steel:  pilesElement.Steel,
	}
	p.Blocks = PilesFoundationBlocks{
		Volume: concreteVolumeFromElement(blocksElement),
		Steel:  blocksElement.Steel,
	}
	p.GradeBeams = PilesFoundationGradeBeams{
		Volume: concreteVolumeFromElement(gradeElement),
		Steel:  gradeElement.Steel,
	}
	p.TieBeams = PilesFoundationTieBeams{
		Volume: concreteVolumeFromElement(tieElement),
		Steel:  tieElement.Steel,
	}
}

func (p *PilesFoundation) normalizeToNewFormat() {
	if !p.hasNewFormat() {
		if p.Piles.Volume > 0 {
			p.Concrete = append(p.Concrete, ConcreteVolumeItem{Fck: p.Fck, Volume: p.Piles.Volume, Position: ElementPositionPile})
		}
		if p.Blocks.Volume > 0 {
			p.Concrete = append(p.Concrete, ConcreteVolumeItem{Fck: p.Fck, Volume: p.Blocks.Volume, Position: ElementPositionBlock})
		}
		if p.GradeBeams.Volume > 0 {
			p.Concrete = append(p.Concrete, ConcreteVolumeItem{Fck: p.Fck, Volume: p.GradeBeams.Volume, Position: ElementPositionGrade})
		}
		if p.TieBeams.Volume > 0 {
			p.Concrete = append(p.Concrete, ConcreteVolumeItem{Fck: p.Fck, Volume: p.TieBeams.Volume, Position: ElementPositionTie})
		}

		for _, steel := range p.Piles.Steel {
			steel.Position = ElementPositionPile
			p.Steel = append(p.Steel, steel)
		}
		for _, steel := range p.Blocks.Steel {
			steel.Position = ElementPositionBlock
			p.Steel = append(p.Steel, steel)
		}
		for _, steel := range p.GradeBeams.Steel {
			steel.Position = ElementPositionGrade
			p.Steel = append(p.Steel, steel)
		}
		for _, steel := range p.TieBeams.Steel {
			steel.Position = ElementPositionTie
			p.Steel = append(p.Steel, steel)
		}
	}

	if p.Fck == 0 && len(p.Concrete) > 0 {
		p.Fck = p.Concrete[0].Fck
	}

	p.syncLegacyFromNewFormat()
}

func (p *PilesFoundation) Validate(v *validator.Validator) {
	p.normalizeToNewFormat()

	v.Check(p.Type != "", "type", "must be provided")
	v.Check(p.UnitID != uuid.Nil, "unit_id", "must be provided")

	if p.Fck != 0 {
		v.Check(p.Fck > 0, "fck", "must be greater than 0")
	}

	validatePositionedConcrete(v, p.Concrete, p.validPositions())
	validatePositionedSteel(v, p.Steel, p.validPositions())
}

func (p *PilesFoundation) Calculate() (Consumption, error) {
	p.normalizeToNewFormat()

	result := CalculateConcreteConsumption(p.Concrete)
	result.Material += concreteVolumeFromItems(p.Concrete)

	steelConsumption, err := CalculateSteelConsumption(p.Steel)
	if err != nil {
		return result, err
	}
	result.sum(steelConsumption)

	return result, nil
}

func (p *PilesFoundation) Insert(models data.Models, optionID uuid.UUID, result Consumption) (Module, error) {
	moduleID, err := uuid.NewV7()
	if err != nil {
		return nil, err
	}

	p.normalizeToNewFormat()

	moduleToInsert := p.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return nil, err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &p.UnitID,
	)
	if err != nil {
		return nil, err
	}

	insertedModule, err := models.Modules.Insert(moduleToInsert, targets)
	if err != nil {
		return nil, err
	}

	return p.fromDataModule(insertedModule), nil
}

func (p *PilesFoundation) Delete(models data.Models, moduleID uuid.UUID) error {
	return models.Modules.Delete(moduleID)
}

func (p *PilesFoundation) Get(models data.Models, moduleID uuid.UUID) (Module, error) {
	dataModule, err := models.Modules.Get(moduleID)
	if err != nil {
		return nil, err
	}
	return p.fromDataModule(dataModule), nil
}

func (p *PilesFoundation) Update(models data.Models, moduleID, optionID uuid.UUID, result Consumption) error {
	p.normalizeToNewFormat()

	module := p.toDataModule(moduleID, optionID, result)

	option, err := models.Options.GetByID(optionID)
	if err != nil {
		return err
	}

	targets, err := PrepareModuleTargetConsumptions(
		models, moduleID, optionID, option.RoleID,
		result, nil, &p.UnitID,
	)
	if err != nil {
		return err
	}

	return models.Modules.Update(module, targets)
}

func (p *PilesFoundation) toDataModule(moduleID, optionID uuid.UUID, result Consumption) *data.Module {
	moduleData := map[string]interface{}{
		"concrete": p.Concrete,
		"steel":    p.Steel,
		"fck":      p.Fck,
		"piles": map[string]interface{}{
			"volume": p.Piles.Volume,
			"steel":  p.Piles.Steel,
		},
		"blocks": map[string]interface{}{
			"volume": p.Blocks.Volume,
			"steel":  p.Blocks.Steel,
		},
		"grade_beams": map[string]interface{}{
			"volume": p.GradeBeams.Volume,
			"steel":  p.GradeBeams.Steel,
		},
		"tie_beams": map[string]interface{}{
			"volume": p.TieBeams.Volume,
			"steel":  p.TieBeams.Steel,
		},
		"unit_id": p.UnitID.String(),
	}

	return &data.Module{
		ID:             moduleID,
		Type:           "piles_foundation",
		OptionID:       optionID,
		Data:           moduleData,
		TotalCO2Min:    &result.CO2Min,
		TotalCO2Max:    &result.CO2Max,
		TotalEnergyMin: &result.EnergyMin,
		TotalEnergyMax: &result.EnergyMax,
		TotalMaterial:  &result.Material,
		FloorIDs:       []uuid.UUID{},
		UnitID:         &p.UnitID,
	}
}

func (p *PilesFoundation) fromDataModule(d *data.Module) Module {
	consumption := consumptionFromDataModule(d)

	foundation := &PilesFoundation{
		ID:              d.ID,
		BasicModuleData: BasicModuleData{Type: "piles_foundation", Outdated: d.Outdated},
		Consumption:     consumption,
		Concrete:        concreteVolumesFromInterface(d.Data["concrete"]),
		Steel:           deserializeSteelMaterialsFromInterface(d.Data["steel"]),
		UnitID:          *d.UnitID,
	}

	if val, ok := d.Data["fck"].(float64); ok {
		foundation.Fck = int(val)
	}

	if pilesData, ok := d.Data["piles"].(map[string]interface{}); ok {
		if val, ok := pilesData["volume"].(float64); ok {
			foundation.Piles.Volume = val
		}
		foundation.Piles.Steel = deserializeSteelMaterialsFromInterface(pilesData["steel"])
	}

	if blocksData, ok := d.Data["blocks"].(map[string]interface{}); ok {
		if val, ok := blocksData["volume"].(float64); ok {
			foundation.Blocks.Volume = val
		}
		foundation.Blocks.Steel = deserializeSteelMaterialsFromInterface(blocksData["steel"])
	}

	if gradeBeamsData, ok := d.Data["grade_beams"].(map[string]interface{}); ok {
		if val, ok := gradeBeamsData["volume"].(float64); ok {
			foundation.GradeBeams.Volume = val
		}
		foundation.GradeBeams.Steel = deserializeSteelMaterialsFromInterface(gradeBeamsData["steel"])
	}

	if tieBeamsData, ok := d.Data["tie_beams"].(map[string]interface{}); ok {
		if val, ok := tieBeamsData["volume"].(float64); ok {
			foundation.TieBeams.Volume = val
		}
		foundation.TieBeams.Steel = deserializeSteelMaterialsFromInterface(tieBeamsData["steel"])
	}

	foundation.normalizeToNewFormat()

	if foundation.Fck == 0 && len(foundation.Concrete) > 0 {
		foundation.Fck = foundation.Concrete[0].Fck
	}

	return foundation
}
