package tqshtm

import (
	"github.com/google/uuid"
)

type ModuleType string

const (
	ModuleTypeStructuralMasonry ModuleType = "structural_masonry"
	ModuleTypeConcreteWall      ModuleType = "concrete_wall"
	ModuleTypeBeamColumn        ModuleType = "beam_column"
)

type ParsedModule struct {
	FloorIndex int           `json:"floor_index"`
	Type       ModuleType    `json:"type"`
	Data       any           `json:"data"`
}

type ParsedFile struct {
	ProjectName string        `json:"project_name"`
	Modules     []ParsedModule `json:"modules"`
}

type BlockItem struct {
	Type     string  `json:"type"`
	Fbk      float64 `json:"fbk"`
	Quantity int     `json:"quantity"`
}

type ConcreteItem struct {
	Fck      int     `json:"fck"`
	Volume   float64 `json:"volume"`
	Position string  `json:"position,omitempty"`
}

type SteelItem struct {
	Material   string  `json:"material"`
	Resistance string  `json:"resistance"`
	Mass       float64 `json:"mass"`
	Position   string  `json:"position,omitempty"`
}

type FormItem struct {
	Area     float64 `json:"area"`
	Position string  `json:"position,omitempty"`
}

type GroutVolumeItem struct {
	Fgk    int     `json:"fgk"`
	Volume float64 `json:"volume"`
}

type GroutItem struct {
	Position string            `json:"position,omitempty"`
	Volumes  []GroutVolumeItem `json:"volumes"`
	Steel    []SteelItem       `json:"steel"`
}

type MortarItem struct {
	Fak    float64 `json:"fak"`
	Volume float64 `json:"volume"`
}

type StructuralMasonryData struct {
	Concrete []ConcreteItem   `json:"concrete"`
	Steel    []SteelItem      `json:"steel"`
	Form     []FormItem       `json:"form"`
	Masonry  MasonryElement   `json:"masonry"`
	SlabType *string          `json:"slab_type,omitempty"`
}

type MasonryElement struct {
	Grout  []GroutItem  `json:"grout"`
	Mortar []MortarItem `json:"mortar"`
	Blocks []BlockItem  `json:"blocks"`
}

type ConcreteWallData struct {
	Concrete      []ConcreteItem `json:"concrete"`
	Steel         []SteelItem    `json:"steel"`
	Form          []FormItem     `json:"form"`
	SlabType      *string        `json:"slab_type,omitempty"`
	WallThickness *float64       `json:"wall_thickness,omitempty"`
	SlabThickness *float64       `json:"slab_thickness,omitempty"`
	WallArea      *float64       `json:"wall_area,omitempty"`
	SlabArea      *float64       `json:"slab_area,omitempty"`
	WallFormArea  *float64       `json:"wall_form_area,omitempty"`
	SlabFormArea  *float64       `json:"slab_form_area,omitempty"`
}

type floorMaterials struct {
	floorIndex int
	moduleType ModuleType
	blocks     []BlockItem
	concrete   []ConcreteItem
	mortar     []MortarItem
	grout      []GroutItem
	form       []FormItem
	steel      []SteelItem
}

func (f *floorMaterials) addMaterial(tableName string, data any) {
	switch d := data.(type) {
	case []BlockItem:
		f.blocks = append(f.blocks, d...)
	case []ConcreteItem:
		f.concrete = append(f.concrete, d...)
	case []MortarItem:
		f.mortar = append(f.mortar, d...)
	case []GroutItem:
		f.grout = append(f.grout, d...)
	case []FormItem:
		f.form = append(f.form, d...)
	case []SteelItem:
		f.steel = append(f.steel, d...)
	case *ConcreteWallData:
		f.concrete = append(f.concrete, d.Concrete...)
		f.form = append(f.form, d.Form...)
		f.steel = append(f.steel, d.Steel...)
	case *StructuralMasonryData:
		f.concrete = append(f.concrete, d.Concrete...)
		f.form = append(f.form, d.Form...)
		f.steel = append(f.steel, d.Steel...)
		f.blocks = append(f.blocks, d.Masonry.Blocks...)
		f.grout = append(f.grout, d.Masonry.Grout...)
		f.mortar = append(f.mortar, d.Masonry.Mortar...)
	}
}

func (f *floorMaterials) identifyModuleType() {
	if f.moduleType != "" {
		return
	}

	hasBlocks := len(f.blocks) > 0
	hasGroutOrMortar := len(f.grout) > 0 || len(f.mortar) > 0

	if hasBlocks || hasGroutOrMortar {
		f.moduleType = ModuleTypeStructuralMasonry
		return
	}

	hasWall := false
	for _, c := range f.concrete {
		if c.Position == "wall" {
			hasWall = true
			break
		}
	}
	for _, form := range f.form {
		if form.Position == "wall" {
			hasWall = true
			break
		}
	}

	if hasWall {
		f.moduleType = ModuleTypeConcreteWall
		return
	}

	hasStructuralConcrete := false
	for _, c := range f.concrete {
		if c.Position == "slab" || c.Position == "column" || c.Position == "beam" || c.Position == "stair" {
			hasStructuralConcrete = true
			break
		}
	}

	if hasStructuralConcrete {
		f.moduleType = ModuleTypeStructuralMasonry
		return
	}

	if len(f.steel) > 0 {
		f.moduleType = ModuleTypeConcreteWall
		return
	}
}

func (f *floorMaterials) toParsedModule() (ParsedModule, bool) {
	f.identifyModuleType()

	switch f.moduleType {
	case ModuleTypeStructuralMasonry:
		if len(f.blocks) == 0 && len(f.grout) == 0 && len(f.mortar) == 0 && len(f.concrete) == 0 && len(f.steel) == 0 {
			return ParsedModule{}, false
		}
		return ParsedModule{
			FloorIndex: f.floorIndex,
			Type:       ModuleTypeStructuralMasonry,
			Data: StructuralMasonryData{
				Concrete: f.concrete,
				Steel:    f.steel,
				Form:     f.form,
				Masonry: MasonryElement{
					Grout:  f.grout,
					Mortar: f.mortar,
					Blocks: f.blocks,
				},
			},
		}, true
	case ModuleTypeConcreteWall:
		if len(f.concrete) == 0 && len(f.form) == 0 && len(f.steel) == 0 {
			return ParsedModule{}, false
		}
		return ParsedModule{
			FloorIndex: f.floorIndex,
			Type:       ModuleTypeConcreteWall,
			Data: ConcreteWallData{
				Concrete: f.concrete,
				Steel:    f.steel,
				Form:     f.form,
			},
		}, true
	case ModuleTypeBeamColumn:
		if len(f.concrete) == 0 && len(f.form) == 0 && len(f.steel) == 0 {
			return ParsedModule{}, false
		}
		return ParsedModule{
			FloorIndex: f.floorIndex,
			Type:       ModuleTypeBeamColumn,
			Data: ConcreteWallData{
				Concrete: f.concrete,
				Steel:    f.steel,
				Form:     f.form,
			},
		}, true
	default:
		return ParsedModule{}, false
	}
}

type FloorResolver interface {
	GetByID(uuid.UUID) (*UnitWithFloors, error)
}

type UnitWithFloors struct {
	ID      uuid.UUID
	ProjectID uuid.UUID
	Name    string
	Type    string
	Floors  []FloorWithIndex
}

type FloorWithIndex struct {
	ID    uuid.UUID
	Index int
}

func ResolveFloorIndex(unit *UnitWithFloors, floorIndex int) (uuid.UUID, bool) {
	for _, floor := range unit.Floors {
		if floor.Index == floorIndex {
			return floor.ID, true
		}
	}
	return uuid.Nil, false
}
