package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/Benchmark-CO2/bipc/internal/tqshtm"
	"github.com/google/uuid"
)

type fileUploadResult struct {
	ProjectName string            `json:"project_name"`
	OptionID    string            `json:"option_id"`
	Modules     []fileUploadModuleResult `json:"modules"`
	Errors      map[string]string `json:"errors,omitempty"`
}

type fileUploadModuleResult struct {
	Type       string `json:"type"`
	FloorIndex int    `json:"floor_index"`
	Status     string `json:"status"`
	Error      string `json:"error,omitempty"`
}

func (app *application) fileUploadHandler(w http.ResponseWriter, r *http.Request) {
	unitID, err := app.readUUIDParam(r, "unitID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	roleID, err := app.readUUIDParam(r, "roleID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer file.Close()

	source := strings.TrimSpace(r.FormValue("source"))
	if source == "" {
		app.badRequestResponse(w, r, errors.New("source is required"))
		return
	}

	var parsed *tqshtm.ParsedFile
	switch strings.ToLower(source) {
	case "tqs":
		parsed, err = tqshtm.Parse(file)
		if err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	default:
		app.badRequestResponse(w, r, fmt.Errorf("unsupported source: %s", source))
		return
	}

	unit, err := app.models.Units.GetByID(unitID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if unit.Type != "tower" {
		app.badRequestResponse(w, r, data.ErrUnitIsNotTower)
		return
	}

	fileFloorSet := make(map[int]struct{})
	for _, mod := range parsed.Modules {
		fileFloorSet[mod.FloorIndex] = struct{}{}
	}

	if len(fileFloorSet) != len(unit.Floors) {
		app.badRequestResponse(w, r, fmt.Errorf(
			"a unidade possui %d pavimentos, enquanto o arquivo possui %d",
			len(unit.Floors), len(fileFloorSet),
		))
		return
	}

	sortedModules := make([]tqshtm.ParsedModule, len(parsed.Modules))
	copy(sortedModules, parsed.Modules)
	sort.Slice(sortedModules, func(i, j int) bool {
		return sortedModules[i].FloorIndex < sortedModules[j].FloorIndex
	})

	assignedFloorIDs := make([]uuid.UUID, len(sortedModules))
	for i := range sortedModules {
		assignedFloorIDs[i] = unit.Floors[i].ID
	}

	optionID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	option := data.Option{
		ID:     optionID,
		UnitID: unitID,
		RoleID: roleID,
		Name:   "Importação TQS",
		Active: true,
	}

	err = app.models.Options.Insert(&option)
	if err != nil {
		app.logger.Error("Failed to insert option", "error", err, "optionID", optionID)
		app.serverErrorResponse(w, r, err)
		return
	}

	payloads := make([]modulePayloadWrapper, 0, len(sortedModules))
	for i, mod := range sortedModules {
		payload, err := buildModulePayload(mod, assignedFloorIDs[i], source)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		payloads = append(payloads, payload)
	}

	_, err = app.createModulesFromPayloads(
		optionID,
		payloads,
		modules.ValidateV2PayloadForModule,
		modules.ToV2Response,
		func(payloadSource string) string {
			return app.resolveDataSource(r, payloadSource)
		},
	)
	if err != nil {
		app.handleCreateModuleError(w, r, err)
		return
	}

	createdOption, err := app.models.Options.GetByID(optionID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"option": createdOption}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func buildModulePayload(mod tqshtm.ParsedModule, floorID uuid.UUID, source string) (modulePayloadWrapper, error) {
	dataMap, err := buildModuleDataMap(mod)
	if err != nil {
		return modulePayloadWrapper{}, err
	}

	dataMap["floor_ids"] = []string{floorID.String()}

	dataBytes, err := json.Marshal(dataMap)
	if err != nil {
		return modulePayloadWrapper{}, err
	}

	return modulePayloadWrapper{
		Type:   string(mod.Type),
		Data:   dataBytes,
		Source: source,
	}, nil
}

func buildModuleDataMap(mod tqshtm.ParsedModule) (map[string]any, error) {
	switch mod.Type {
	case tqshtm.ModuleTypeStructuralMasonry:
		return buildStructuralMasonryData(mod.Data.(tqshtm.StructuralMasonryData))
	case tqshtm.ModuleTypeConcreteWall:
		return buildConcreteWallData(mod.Data.(tqshtm.ConcreteWallData))
	case tqshtm.ModuleTypeBeamColumn:
		return buildBeamColumnData(mod.Data.(tqshtm.ConcreteWallData))
	default:
		return nil, fmt.Errorf("unsupported module type: %s", mod.Type)
	}
}

func buildStructuralMasonryData(data tqshtm.StructuralMasonryData) (map[string]any, error) {
	masonryMap := map[string]any{}

	if len(data.Masonry.Blocks) > 0 {
		blocksList := make([]map[string]any, len(data.Masonry.Blocks))
		for i, b := range data.Masonry.Blocks {
			blocksList[i] = map[string]any{
				"type":     b.Type,
				"fbk":      b.Fbk,
				"quantity": b.Quantity,
			}
		}
		masonryMap["blocks"] = blocksList
	}

	if len(data.Masonry.Grout) > 0 {
		groutList := make([]map[string]any, len(data.Masonry.Grout))
		for i, g := range data.Masonry.Grout {
			volumes := make([]map[string]any, len(g.Volumes))
			for j, v := range g.Volumes {
				volumes[j] = map[string]any{
					"fgk":    v.Fgk,
					"volume": v.Volume,
				}
			}
			groutSteel := make([]map[string]any, len(data.Steel))
			for j, s := range data.Steel {
				groutSteel[j] = map[string]any{
					"material":   s.Material,
					"resistance": s.Resistance,
					"mass":       s.Mass,
					"position":   s.Position,
				}
			}
			groutMap := map[string]any{
				"volumes": volumes,
				"steel":   groutSteel,
			}
			if g.Position != "" {
				groutMap["position"] = g.Position
			}
			groutList[i] = groutMap
		}
		masonryMap["grout"] = groutList
	}

	if len(data.Masonry.Mortar) > 0 {
		mortarList := make([]map[string]any, len(data.Masonry.Mortar))
		for i, m := range data.Masonry.Mortar {
			mortarList[i] = map[string]any{
				"fak":    m.Fak,
				"volume": m.Volume,
			}
		}
		masonryMap["mortar"] = mortarList
	}

	concrete := make([]map[string]any, len(data.Concrete))
	for i, c := range data.Concrete {
		concrete[i] = map[string]any{
			"fck":      c.Fck,
			"volume":   c.Volume,
			"position": c.Position,
		}
	}

	form := make([]map[string]any, len(data.Form))
	for i, f := range data.Form {
		form[i] = map[string]any{
			"area":     f.Area,
			"position": f.Position,
		}
	}

	moduleData := map[string]any{
		"type":     "structural_masonry",
		"concrete": concrete,
		"form":     form,
		"masonry":  masonryMap,
	}

	if data.SlabType != nil {
		moduleData["slab_type"] = *data.SlabType
	}

	return moduleData, nil
}

func buildConcreteWallData(data tqshtm.ConcreteWallData) (map[string]any, error) {
	concrete := make([]map[string]any, len(data.Concrete))
	for i, c := range data.Concrete {
		concrete[i] = map[string]any{
			"fck":      c.Fck,
			"volume":   c.Volume,
			"position": c.Position,
		}
	}

	steel := make([]map[string]any, len(data.Steel))
	for i, s := range data.Steel {
		steel[i] = map[string]any{
			"material":   s.Material,
			"resistance": s.Resistance,
			"mass":       s.Mass,
			"position":   s.Position,
		}
	}

	form := make([]map[string]any, len(data.Form))
	for i, f := range data.Form {
		form[i] = map[string]any{
			"area":     f.Area,
			"position": f.Position,
		}
	}

	moduleData := map[string]any{
		"type":     "concrete_wall",
		"concrete": concrete,
		"steel":    steel,
		"form":     form,
	}

	if data.SlabType != nil {
		moduleData["slab_type"] = *data.SlabType
	}
	if data.WallThickness != nil {
		moduleData["wall_thickness"] = *data.WallThickness
	}
	if data.SlabThickness != nil {
		moduleData["slab_thickness"] = *data.SlabThickness
	}
	if data.WallArea != nil {
		moduleData["wall_area"] = *data.WallArea
	}
	if data.SlabArea != nil {
		moduleData["slab_area"] = *data.SlabArea
	}
	if data.WallFormArea != nil {
		moduleData["wall_form_area"] = *data.WallFormArea
	}
	if data.SlabFormArea != nil {
		moduleData["slab_form_area"] = *data.SlabFormArea
	}

	return moduleData, nil
}

func buildBeamColumnData(data tqshtm.ConcreteWallData) (map[string]any, error) {
	concrete := make([]map[string]any, len(data.Concrete))
	for i, c := range data.Concrete {
		concrete[i] = map[string]any{
			"fck":      c.Fck,
			"volume":   c.Volume,
			"position": c.Position,
		}
	}

	steel := make([]map[string]any, len(data.Steel))
	for i, s := range data.Steel {
		steel[i] = map[string]any{
			"material":   s.Material,
			"resistance": s.Resistance,
			"mass":       s.Mass,
			"position":   s.Position,
		}
	}

	form := make([]map[string]any, len(data.Form))
	for i, f := range data.Form {
		form[i] = map[string]any{
			"area":     f.Area,
			"position": f.Position,
		}
	}

	moduleData := map[string]any{
		"type":     "beam_column",
		"concrete": concrete,
		"steel":    steel,
		"form":     form,
	}

	if data.SlabType != nil {
		moduleData["slab_type"] = *data.SlabType
	}

	return moduleData, nil
}
