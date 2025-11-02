package main

import (
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/modules"
	"github.com/google/uuid" // Import uuid package
)

// Define a slice of required header names
var requiredHeaders = []string{
	"project_name",
	"project_cep",
	"project_state",
	"project_city",
	"project_neighborhood",
	"project_street",
	"project_number",
	"project_phase",

	"unit_name",

	"floor_name",
	"floor_area",
	"floor_category",
	"floor_height",
	"floor_repetition",

	"module_wall_thickness",
	"module_slab_thickness",
	"module_wall_area",
	"module_slab_area",
	"module_wall_form_area",
	"module_slab_form_area",

	"module_wall_concrete_20",
	"module_wall_concrete_25",
	"module_wall_concrete_30",
	"module_wall_concrete_35",
	"module_wall_concrete_40",
	"module_wall_concrete_45",

	"module_slab_concrete_20",
	"module_slab_concrete_25",
	"module_slab_concrete_30",
	"module_slab_concrete_35",
	"module_slab_concrete_40",
	"module_slab_concrete_45",

	"module_wall_steel_50",
	"module_wall_steel_60",

	"module_slab_steel_50",
	"module_slab_steel_60",
}

// CSVRowData holds the structured data from a single row of the uploaded CSV file.
type CSVRowData struct {
	// Project fields
	ProjectName         string  `json:"project_name,omitempty"`
	ProjectCEP          *string `json:"project_cep,omitempty"`
	ProjectState        string  `json:"project_state,omitempty"`
	ProjectCity         string  `json:"project_city,omitempty"`
	ProjectNeighborhood *string `json:"project_neighborhood,omitempty"`
	ProjectStreet       *string `json:"project_street,omitempty"`
	ProjectNumber       *string `json:"project_number,omitempty"`
	ProjectPhase        string  `json:"project_phase,omitempty"`

	// Unit fields
	UnitName string `json:"unit_name,omitempty"`

	// Floor fields
	FloorName       string  `json:"floor_name,omitempty"`
	FloorArea       float64 `json:"floor_area,omitempty"`
	FloorCategory   string  `json:"floor_category,omitempty"`
	FloorHeight     float64 `json:"floor_height,omitempty"`
	FloorRepetition int     `json:"floor_repetition,omitempty"`

	// Module fields
	ModuleWallThickness float64 `json:"module_wall_thickness,omitempty"`
	ModuleSlabThickness float64 `json:"module_slab_thickness,omitempty"`
	ModuleWallArea      float64 `json:"module_wall_area,omitempty"`
	ModuleSlabArea      float64 `json:"module_slab_area,omitempty"`
	ModuleWallFormArea  float64 `json:"module_wall_form_area,omitempty"`
	ModuleSlabFormArea  float64 `json:"module_slab_form_area,omitempty"`

	// Aggregated data
	WallConcrete modules.ConcreteElement `json:"wall_concrete"`
	SlabConcrete modules.ConcreteElement `json:"slab_concrete"`
}

type ProjectFromCSV struct {
	Project data.Project     `json:"project"`
	Unit    data.Unit        `json:"unit"`
	Option  data.TowerOption `json:"option"`
	Modules []modules.Module `json:"modules"`
}

// parseFloat is a helper to parse string to float64, handling comma as decimal separator.
func parseFloat(s string) (float64, error) {
	if s == "" {
		return 0, nil
	}
	s = strings.Replace(s, ",", ".", -1)
	return strconv.ParseFloat(s, 64)
}

// parseInt is a helper to parse string to int.
func parseInt(s string) (int, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.Atoi(s)
}

func (app *application) generateRowData(dataRows [][]string, headerMap map[string]int) []CSVRowData {
	allCSVRows := []CSVRowData{} // Collect all CSVRowData here

	for i, record := range dataRows {
		// Helper for parsing with error logging
		parseFieldFloat := func(fieldName string) float64 {
			// No need to check 'ok' here, as validateCSVHeaders already ensured presence
			idx := headerMap[fieldName]
			val, err := parseFloat(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse float", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}
		parseFieldInt := func(fieldName string) int {
			// No need to check 'ok' here, as validateCSVHeaders already ensured presence
			idx := headerMap[fieldName]
			val, err := parseInt(record[idx])
			if err != nil {
				app.logger.Warn("Could not parse int", "field", fieldName, "row", i+2, "error", err)
			}
			return val
		}

		FloorName := record[headerMap["floor_name"]]
		if FloorName == "" {
			FloorName = "unique_floor"
		}

		unitName := record[headerMap["unit_name"]]
		if unitName == "" {
			unitName = "unit"
		}

		row := CSVRowData{
			// Project fields
			ProjectName:         record[headerMap["project_name"]],
			ProjectCEP:          &record[headerMap["project_cep"]],
			ProjectState:        record[headerMap["project_state"]],
			ProjectCity:         record[headerMap["project_city"]],
			ProjectNeighborhood: &record[headerMap["project_neighborhood"]],
			ProjectStreet:       &record[headerMap["project_street"]],
			ProjectNumber:       &record[headerMap["project_number"]],
			ProjectPhase:        record[headerMap["project_phase"]],

			// Unit fields
			UnitName: unitName,

			// Floor fields
			FloorName:       FloorName,
			FloorArea:       parseFieldFloat("floor_area"),
			FloorCategory:   record[headerMap["floor_category"]],
			FloorHeight:     parseFieldFloat("floor_height"),
			FloorRepetition: parseFieldInt("floor_repetition"),

			// Module fields
			ModuleWallThickness: parseFieldFloat("module_wall_thickness"),
			ModuleSlabThickness: parseFieldFloat("module_slab_thickness"),
			ModuleWallArea:      parseFieldFloat("module_wall_area"),
			ModuleSlabArea:      parseFieldFloat("module_slab_area"),
			ModuleWallFormArea:  parseFieldFloat("module_wall_form_area"),
			ModuleSlabFormArea:  parseFieldFloat("module_slab_form_area"),

			// Aggregated data
			WallConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
			SlabConcrete: modules.ConcreteElement{
				Volumes: []modules.ConcreteVolumeItem{},
				Steel:   []modules.SteelMassItem{},
			},
		}

		// Parse concrete and steel volumes
		for headerName := range headerMap {
			if strings.HasPrefix(headerName, "module_wall_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_wall_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.WallConcrete.Volumes = append(row.WallConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_concrete_") {
				fckStr := strings.TrimPrefix(headerName, "module_slab_concrete_")
				fck, _ := strconv.Atoi(fckStr)
				if fck > 0 {
					volume := parseFieldFloat(headerName)
					if volume > 0 {
						row.SlabConcrete.Volumes = append(row.SlabConcrete.Volumes, modules.ConcreteVolumeItem{Fck: fck, Volume: volume})
					}
				}
			} else if strings.HasPrefix(headerName, "module_wall_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_wall_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.WallConcrete.Steel = append(row.WallConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			} else if strings.HasPrefix(headerName, "module_slab_steel_") {
				caStr := strings.TrimPrefix(headerName, "module_slab_steel_")
				ca, _ := strconv.Atoi(caStr)
				if ca > 0 {
					mass := parseFieldFloat(headerName)
					if mass > 0 {
						row.SlabConcrete.Steel = append(row.SlabConcrete.Steel, modules.SteelMassItem{CA: ca, Mass: mass})
					}
				}
			}
		}

		allCSVRows = append(allCSVRows, row) // Add to the slice
	}
	return allCSVRows
}

func toProjectsFromCSVData(rows []CSVRowData, userID uuid.UUID) ([]ProjectFromCSV, error) {
	projects := []ProjectFromCSV{}
	var currentProjectFormCSV *ProjectFromCSV
	projectNameToUnit := make(map[string]*data.Unit) // To store the Unit associated with each ProjectName

	for _, row := range rows {
		// Check if it's a new project row
		isNewProjectRow := row.ProjectName != "" && (currentProjectFormCSV == nil || row.ProjectName != currentProjectFormCSV.Project.Name)

		if isNewProjectRow {
			// New project
			if currentProjectFormCSV != nil {
				projects = append(projects, *currentProjectFormCSV)
			}

			projectID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate project ID: %w", err)
			}
			unitID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate unit ID: %w", err)
			}
			towerOptionID, err := uuid.NewV7()
			if err != nil {
				return nil, fmt.Errorf("failed to generate tower option ID: %w", err)
			}

			currentProjectFormCSV = &ProjectFromCSV{
				Project: data.Project{
					ID:           projectID,
					Name:         row.ProjectName,
					CEP:          row.ProjectCEP,
					State:        row.ProjectState,
					City:         row.ProjectCity,
					Neighborhood: row.ProjectNeighborhood,
					Street:       row.ProjectStreet,
					Number:       row.ProjectNumber,
					Phase:        row.ProjectPhase,
				},
				Unit: data.Unit{
					ID:        unitID,
					ProjectID: projectID,
					Name:      row.UnitName,
					Type:      "tower", // Assuming it's a tower if it has floors/modules
					Floors: []data.Floor{}, // Initialize floors slice
				},
				Option: data.TowerOption{
					ID:      towerOptionID,
					UnitID: unitID,
					Name:    fmt.Sprintf("Option for %s", row.UnitName), // Default name
					Active:  true,
					Modules: []data.ModuleInfo{},
				},
				Modules: []modules.Module{},
			}
			projectNameToUnit[row.ProjectName] = &currentProjectFormCSV.Unit
		} else {
			// Row belongs to the current project
			if currentProjectFormCSV == nil {
				return nil, errors.New("CSV data error: row with empty ProjectName found before any project was defined")
			}
		}

		// Retrieve the unit for the current project
		unit := projectNameToUnit[currentProjectFormCSV.Project.Name]
		if unit == nil {
			return nil, errors.New("internal error: unit not found for current project")
		}

		// Floor Handling
		floorID, err := uuid.NewV7()
		if err != nil {
			return nil, fmt.Errorf("failed to generate floor ID: %w", err)
		}
		groupID, err := uuid.NewV7()
		if err != nil {
			return nil, fmt.Errorf("failed to generate floor group ID: %w", err)
		}

		// Cria o Floor
		floor := data.Floor{
			ID:        floorID,
			GroupID:   groupID,
			GroupName: row.FloorName,
			Area:      row.FloorArea,
			Height:    row.FloorHeight,
			Index:     len(unit.Floors), // usa ordem como index
		}
		unit.Floors = append(unit.Floors, floor)

		module := modules.ConcreteWall{
			BasicModuleData: modules.BasicModuleData{Type: "concrete_wall"},
			ConcreteWalls:   row.WallConcrete,
			ConcreteSlabs:   row.SlabConcrete,
			WallThickness:   &row.ModuleWallThickness,
			SlabThickness:   &row.ModuleSlabThickness,
			WallArea:        &row.ModuleWallArea,
			SlabArea:        &row.ModuleSlabArea,
			WallFormArea:    &row.ModuleWallFormArea,
			SlabFormArea:    &row.ModuleSlabFormArea,
			FloorIDs:        []uuid.UUID{floorID},
		}
		currentProjectFormCSV.Modules = append(currentProjectFormCSV.Modules, &module)
	}

	// Append the last project if it exists
	if currentProjectFormCSV != nil {
		projects = append(projects, *currentProjectFormCSV)
	}

	return projects, nil
}

// validateCSVHeaders checks if all required headers are present in the provided headerMap.
// It returns an error if any required header is missing.
func validateCSVHeaders(headerMap map[string]int) error {
	for _, requiredHeader := range requiredHeaders {
		if _, ok := headerMap[requiredHeader]; !ok {
			return fmt.Errorf("CSV header is missing the required '%s' column", requiredHeader)
		}
	}
	return nil
}

func (app *application) createProjectsFromCSVHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	file, _, err := r.FormFile("csv")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(records) < 2 {
		app.badRequestResponse(w, r, fmt.Errorf("CSV file must have at least a header and one data row"))
		return
	}

	header := records[0]
	headerMap := make(map[string]int)
	for i, h := range header {
		if h != "" {
			headerMap[strings.TrimSpace(h)] = i
		}
	}

	// Validate all required headers at once
	err = validateCSVHeaders(headerMap)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	dataRows := records[1:]

	allCSVRows := app.generateRowData(dataRows, headerMap)

	projectsFormCSV, err := toProjectsFromCSVData(allCSVRows, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a map to easily find the rows for a given project
	rowsByProject := make(map[string][]CSVRowData)
	for _, row := range allCSVRows {
		rowsByProject[row.ProjectName] = append(rowsByProject[row.ProjectName], row)
	}

	for i, projectData := range projectsFormCSV {
		// Insert Project
		err = app.models.Projects.Insert(&projectData.Project, user.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Insert Unit with existing floors
		err = app.models.Units.InsertWithExistingFloors(&projectData.Unit)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Insert Tower Option
		err = app.models.TowerOptions.Insert(&projectData.Option)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		// Now, process the modules for this project
		for _, module := range projectData.Modules {

			// Calculate consumption
			result, err := module.Calculate()
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			// Insert the module
			_, err = module.Insert(app.models, projectData.Option.ID, result)
			if err != nil {
				switch {
				case errors.Is(err, data.ErrInvalidTowerOptionID):
					app.badRequestResponse(w, r, err)
				case errors.Is(err, data.ErrInvalidFloorID):
					app.badRequestResponse(w, r, err)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}
		}
		// After processing all modules for the project, we might need to update the project data
		// with the newly created modules if the response needs it.
		// For now, we'll just use the initial projectsFormCSV in the response.
		// If the response needs the full module data, we would need to refetch or build it here.
		// Let's clear the floors from the response to avoid confusion, as they are intermediate.
		projectsFormCSV[i].Unit.Floors = nil
	}

	err = app.writeJSON(w, http.StatusAccepted, envelope{"projects": projectsFormCSV}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
