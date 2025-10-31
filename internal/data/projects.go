package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

var (
	states = []string{"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
		"MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
		"RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

	phases = []string{"preliminary_study", "not_defined", "basic_project", "executive_project", "released_for_construction"}

	ErrInvalidProjectID     = errors.New("projectID does not exist")
	ErrDuplicateUserProject = errors.New("duplicate user-project association")
)

type ProjectUnit struct {
	ID           uuid.UUID              `json:"id"`
	Name         string                 `json:"name"`
	Type         string                 `json:"type"`
	Consumptions map[string]*Consumption `json:"consumptions,omitempty"`
	Area         float64                `json:"area"`
}

type Project struct {
	ID           uuid.UUID `json:"id"`
	CreatedAt    time.Time `json:"created_at"`
	Name         string    `json:"name"`
	CEP          *string   `json:"cep,omitzero"`
	State        string    `json:"state"`
	City         string    `json:"city"`
	Neighborhood *string   `json:"neighborhood,omitzero"`
	Street       *string   `json:"street,omitzero"`
	Number       *string   `json:"number,omitzero"`
	Phase        string    `json:"phase"`
}

type ProjectsWithUnits struct {
	Project
	Units       []ProjectUnit `json:"units,omitempty"`
	Consumption *Consumption  `json:"consumption,omitempty"`
	Area        float64       `json:"area,omitempty"`
}

func ValidateProject(v *validator.Validator, project *Project) {
	v.Check(project.Name != "", "name", "must be provided")
	v.Check(len(project.Name) <= 100, "name", "must not be more than 100 bytes long")

	if project.CEP != nil {
		v.Check(validator.Matches(*project.CEP, validator.CEPRX), "cep", "must be a valid CEP")
	}

	v.Check(project.State != "", "state", "must be provided")
	v.Check(len(project.State) == 2, "state", "must be a valid state code (2 characters)")
	v.Check(validator.PermittedValue(project.State, states...), "state", fmt.Sprintf("must be a valid state code (allowed: %s)", strings.Join(states, ", ")))

	v.Check(project.City != "", "city", "must be provided")
	v.Check(len(project.City) <= 100, "city", "must not be more than 100 bytes long")

	if project.Neighborhood != nil {
		v.Check(*project.Neighborhood != "", "neighborhood", "empty neighborhood is not allowed")
		v.Check(len(*project.Neighborhood) <= 100, "neighborhood", "must not be more than 100 bytes long")
	}

	if project.Street != nil {
		v.Check(*project.Street != "", "street", "empty street is not allowed")
		v.Check(len(*project.Street) <= 100, "street", "must not be more than 100 bytes long")
	}

	if project.Number != nil {
		v.Check(*project.Number != "", "number", "empty number is not allowed")
		v.Check(len(*project.Number) <= 20, "number", "must not be more than 20 bytes long")
	}

	v.Check(project.Phase != "", "phase", "must be provided")
	v.Check(validator.PermittedValue(project.Phase, phases...), "phase", fmt.Sprintf("must be a valid phase (allowed: %s)", strings.Join(phases, ", ")))
}

type ProjectModel struct {
	DB *sql.DB
}

func (m ProjectModel) Insert(project *Project, userID uuid.UUID) error {

	if project.ID == uuid.Nil {
		projectID, err := uuid.NewV7()
		if err != nil {
			return err
		}
		project.ID = projectID
	}

	roleID, err := uuid.NewV7()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query1 := `
		INSERT INTO projects (id, name, cep, state, city, neighborhood, street, number, phase)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at`

	args := []any{project.ID, project.Name, project.CEP, project.State, project.City, project.Neighborhood,
		project.Street, project.Number, project.Phase}

	err = tx.QueryRow(query1, args...).Scan(&project.CreatedAt)
	if err != nil {
		return err
	}

	query2 := `
		INSERT INTO users_projects (user_id, project_id)
		VALUES ($1, $2)`

	_, err = tx.Exec(query2, userID, project.ID)
	if err != nil {
		switch {
		case err.Error() == `pq: insert or update on table "users_projects" violates foreign key constraint "users_projects_project_id_fkey"`:
			return ErrInvalidProjectID
		case err.Error() == `pq: insert or update on table "users_projects" violates foreign key constraint "users_projects_user_id_fkey"`:
			return ErrInvalidUserID
		case err.Error() == `pq: duplicate key value violates unique constraint "users_projects_pkey"`:
			return ErrDuplicateUserProject
		default:
			return err
		}
	}

	query3 := `
		INSERT INTO roles (id, project_id, name, simulation, is_protected)
		VALUES ($1, $2, $3, $4, $5)`

	_, err = tx.Exec(query3, roleID, project.ID, "Administrador", false, true)
	if err != nil {
		switch {
		case err.Error() == `pq: insert or update on table "roles" violates foreign key constraint "roles_project_id_fkey"`:
			return ErrInvalidProjectID
		case err.Error() == `pq: duplicate key value violates unique constraint "roles_project_id_name_key"`:
			return ErrDuplicateRoleName
		default:
			return err
		}
	}

	query4 := `
		INSERT INTO roles_permissions (role_id, permission_id)
		VALUES ($1, $2)
	`
	_, err = tx.Exec(query4, roleID, 1)
	if err != nil {
		switch {
		case err.Error() == `pq: insert or update on table "roles_permissions" violates foreign key constraint "roles_permissions_permission_id_fkey"`:
			return ErrInvalidPermissionID
		case err.Error() == `pq: insert or update on table "roles_permissions" violates foreign key constraint "roles_permissions_role_id_fkey"`:
			return ErrInvalidRoleID
		case err.Error() == `pq: duplicate key value violates unique constraint "roles_permissions_pkey"`:
			return ErrDuplicateRolePermission
		default:
			return err
		}
	}

	query5 := `
		INSERT INTO users_roles (user_id, role_id)
		VALUES ($1, $2)
	`
	_, err = tx.Exec(query5, userID, roleID)
	if err != nil {
		switch {
		case err.Error() == `pq: insert or update on table "users_roles" violates foreign key constraint "users_roles_role_id_fkey"`:
			return ErrInvalidRoleID
		case err.Error() == `pq: insert or update on table "users_roles" violates foreign key constraint "users_roles_user_id_fkey"`:
			return ErrInvalidUserID
		case err.Error() == `pq: duplicate key value violates unique constraint "users_roles_pkey"`:
			return ErrDuplicateUserRole
		default:
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m ProjectModel) GetByID(id uuid.UUID) (*ProjectsWithUnits, error) {
	query := `
		SELECT id, created_at, name, cep, state, city, neighborhood, street, number, phase
		FROM projects
		WHERE id = $1`

	var project ProjectsWithUnits

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&project.ID,
		&project.CreatedAt,
		&project.Name,
		&project.CEP,
		&project.State,
		&project.City,
		&project.Neighborhood,
		&project.Street,
		&project.Number,
		&project.Phase,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	unitsQuery := `
		WITH tower_consumption_by_tech AS (
			SELECT
				fg.tower_id,
				fc.technology,
				SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
				SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
				SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
				SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN floors_consumption fc ON f.id = fc.floor_id
			GROUP BY fg.tower_id, fc.technology
		),
		tower_area AS (
			SELECT
				fg.tower_id,
				SUM(f.area) as area
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			GROUP BY fg.tower_id
		)
		SELECT
			u.id,
			u.name,
			u.type,
			ta.area,
			tct.technology,
			tct.co2_min,
			tct.co2_max,
			tct.energy_min,
			tct.energy_max
		FROM units u
		LEFT JOIN tower_consumption_by_tech tct ON u.id = tct.tower_id
		LEFT JOIN tower_area ta ON u.id = ta.tower_id
		WHERE u.project_id = $1
		ORDER BY u.id, tct.technology
	`
	rows, err := m.DB.QueryContext(ctx, unitsQuery, project.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	unitsMap := make(map[uuid.UUID]*ProjectUnit)
	var orderedUnitIDs []uuid.UUID

	for rows.Next() {
		var unitID uuid.UUID
		var unitName, unitType string
		var area sql.NullFloat64
		var tech sql.NullString
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		if err := rows.Scan(&unitID, &unitName, &unitType, &area, &tech, &co2Min, &co2Max, &energyMin, &energyMax); err != nil {
			return nil, err
		}

		if _, ok := unitsMap[unitID]; !ok {
			unitsMap[unitID] = &ProjectUnit{
				ID:           unitID,
				Name:         unitName,
				Type:         unitType,
				Area:         area.Float64,
				Consumptions: make(map[string]*Consumption),
			}
			orderedUnitIDs = append(orderedUnitIDs, unitID)
		}

		if tech.Valid && co2Min.Valid {
			unitsMap[unitID].Consumptions[tech.String] = &Consumption{
				CO2Min:    &co2Min.Float64,
				CO2Max:    &co2Max.Float64,
				EnergyMin: &energyMin.Float64,
				EnergyMax: &energyMax.Float64,
			}
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Calculate totals for each unit
	for _, unit := range unitsMap {
		if len(unit.Consumptions) > 0 {
			total := &Consumption{
				CO2Min:    new(float64),
				CO2Max:    new(float64),
				EnergyMin: new(float64),
				EnergyMax: new(float64),
			}
			for _, consumption := range unit.Consumptions {
				*total.CO2Min += *consumption.CO2Min
				*total.CO2Max += *consumption.CO2Max
				*total.EnergyMin += *consumption.EnergyMin
				*total.EnergyMax += *consumption.EnergyMax
			}
			unit.Consumptions["total"] = total
		}
	}

	var units []ProjectUnit
	for _, id := range orderedUnitIDs {
		units = append(units, *unitsMap[id])
	}
	project.Units = units

	return &project, nil
}

func (m ProjectModel) Update(project *Project) error {
	query := `
		UPDATE projects
		SET name = $1, cep = $2, state = $3, city = $4, neighborhood = $5, street = $6, number = $7, phase = $8
		WHERE id = $9`

	args := []any{
		project.Name,
		project.CEP,
		project.State,
		project.City,
		project.Neighborhood,
		project.Street,
		project.Number,
		project.Phase,
		project.ID,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrEditConflict
	}

	return nil
}

func (m ProjectModel) Delete(projectID uuid.UUID) error {
	query := `
	DELETE FROM projects
	WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, projectID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err

	}

	if rowsAffected == 0 {
		return ErrNoRowsDeleted
	}

	return nil
}

func (m ProjectModel) GetAll(name string, filters Filters, userID uuid.UUID) ([]*ProjectsWithUnits, Metadata, error) {
	query := fmt.Sprintf(`
		WITH project_consumption AS (
			SELECT
				u.project_id,
				SUM(f.co2_min * f.area) / SUM(f.area) as co2_min,
				SUM(f.co2_max * f.area) / SUM(f.area) as co2_max,
				SUM(f.energy_min * f.area) / SUM(f.area) as energy_min,
				SUM(f.energy_max * f.area) / SUM(f.area) as energy_max,
				SUM(f.area) as area
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN units u ON fg.tower_id = u.id
			GROUP BY u.project_id
		)
 		SELECT COUNT(*) OVER(), p.id, p.created_at, p.name,
		p.cep, p.state, p.city, p.neighborhood, p.street, p.number, p.phase,
		COALESCE(pc.co2_min, 0), COALESCE(pc.co2_max, 0), COALESCE(pc.energy_min, 0), COALESCE(pc.energy_max, 0), COALESCE(pc.area, 0)
 		FROM projects p
		INNER JOIN users_projects up ON up.project_id = p.id
		LEFT JOIN project_consumption pc ON p.id = pc.project_id
 		WHERE (to_tsvector('simple', p.name) @@ plainto_tsquery('simple', $1) OR $1 = '')
		AND up.user_id = $2
 		ORDER BY %s %s, p.id DESC
 		LIMIT $3 OFFSET $4`, filters.sortColumn(), filters.sortDirection())

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{name, userID, filters.limit(), filters.offset()}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, Metadata{}, err
	}
	defer rows.Close()

	totalRecords := 0
	projects := []*ProjectsWithUnits{}

	for rows.Next() {
		var project ProjectsWithUnits
		var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

		err := rows.Scan(
			&totalRecords,
			&project.ID,
			&project.CreatedAt,
			&project.Name,
			&project.CEP,
			&project.State,
			&project.City,
			&project.Neighborhood,
			&project.Street,
			&project.Number,
			&project.Phase,
			&co2Min,
			&co2Max,
			&energyMin,
			&energyMax,
			&project.Area,
		)
		if err != nil {
			return nil, Metadata{}, err
		}
		projects = append(projects, &project)
		projectIDs = append(projectIDs, project.ID)
		projectsMap[project.ID] = &project
	}

	if err = rows.Err(); err != nil {
		return nil, Metadata{}, err
	}

	if len(projects) > 0 {
		unitsQuery := `
		WITH tower_consumption_by_tech AS (
			SELECT
				fg.tower_id,
				fc.technology,
				SUM(fc.co2_min * f.area) / NULLIF(SUM(f.area), 0) as co2_min,
				SUM(fc.co2_max * f.area) / NULLIF(SUM(f.area), 0) as co2_max,
				SUM(fc.energy_min * f.area) / NULLIF(SUM(f.area), 0) as energy_min,
				SUM(fc.energy_max * f.area) / NULLIF(SUM(f.area), 0) as energy_max
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			INNER JOIN floors_consumption fc ON f.id = fc.floor_id
			GROUP BY fg.tower_id, fc.technology
		),
		tower_area AS (
			SELECT
				fg.tower_id,
				SUM(f.area) as area
			FROM floor f
			INNER JOIN floor_group fg ON f.group_id = fg.id
			GROUP BY fg.tower_id
		)
		SELECT
			u.project_id,
			u.id,
			u.name,
			u.type,
			ta.area,
			tct.technology,
			tct.co2_min,
			tct.co2_max,
			tct.energy_min,
			tct.energy_max
		FROM units u
		LEFT JOIN tower_consumption_by_tech tct ON u.id = tct.tower_id
		LEFT JOIN tower_area ta ON u.id = ta.tower_id
		WHERE u.project_id = ANY($1)
		ORDER BY u.project_id, u.id, tct.technology
	`
		unitRows, err := m.DB.QueryContext(ctx, unitsQuery, pq.Array(projectIDs))
		if err != nil {
			return nil, Metadata{}, err
		}
		defer unitRows.Close()

		projectUnits := make(map[uuid.UUID]map[uuid.UUID]*ProjectUnit)
		orderedProjectUnitIDs := make(map[uuid.UUID][]uuid.UUID)

		for unitRows.Next() {
			var projectID, unitID uuid.UUID
			var unitName, unitType string
			var area sql.NullFloat64
			var tech sql.NullString
			var co2Min, co2Max, energyMin, energyMax sql.NullFloat64

			if err := unitRows.Scan(&projectID, &unitID, &unitName, &unitType, &area, &tech, &co2Min, &co2Max, &energyMin, &energyMax); err != nil {
				return nil, Metadata{}, err
			}

			if _, ok := projectUnits[projectID]; !ok {
				projectUnits[projectID] = make(map[uuid.UUID]*ProjectUnit)
				orderedProjectUnitIDs[projectID] = []uuid.UUID{}
			}

			if _, ok := projectUnits[projectID][unitID]; !ok {
				projectUnits[projectID][unitID] = &ProjectUnit{
					ID:           unitID,
					Name:         unitName,
					Type:         unitType,
					Area:         area.Float64,
					Consumptions: make(map[string]*Consumption),
				}
				orderedProjectUnitIDs[projectID] = append(orderedProjectUnitIDs[projectID], unitID)
			}

			if tech.Valid && co2Min.Valid {
				projectUnits[projectID][unitID].Consumptions[tech.String] = &Consumption{
					CO2Min:    &co2Min.Float64,
					CO2Max:    &co2Max.Float64,
					EnergyMin: &energyMin.Float64,
					EnergyMax: &energyMax.Float64,
				}
			}
		}

		if err := unitRows.Err(); err != nil {
			return nil, Metadata{}, err
		}

		for projectID, unitsMap := range projectUnits {
			var units []ProjectUnit
			var projectArea float64

			for _, unitID := range orderedProjectUnitIDs[projectID] {
				unit := unitsMap[unitID]
				if len(unit.Consumptions) > 0 {
					total := &Consumption{
						CO2Min:    new(float64),
						CO2Max:    new(float64),
						EnergyMin: new(float64),
						EnergyMax: new(float64),
					}
					for _, consumption := range unit.Consumptions {
						*total.CO2Min += *consumption.CO2Min
						*total.CO2Max += *consumption.CO2Max
						*total.EnergyMin += *consumption.EnergyMin
						*total.EnergyMax += *consumption.EnergyMax
					}
					unit.Consumptions["total"] = total
				}
				projectArea += unit.Area
				units = append(units, *unit)
			}

			if p, ok := projectsMap[projectID]; ok {
				p.Units = units
				p.Area = projectArea
				p.Consumptions = make(map[string]*Consumption)

				// Recalculate project consumptions from units
				for _, unit := range p.Units {
					for tech, cons := range unit.Consumptions {
						if tech == "total" {
							continue
						}
						if _, ok := p.Consumptions[tech]; !ok {
							p.Consumptions[tech] = &Consumption{
								CO2Min:    new(float64),
								CO2Max:    new(float64),
								EnergyMin: new(float64),
								EnergyMax: new(float64),
							}
						}
						*p.Consumptions[tech].CO2Min += *cons.CO2Min
						*p.Consumptions[tech].CO2Max += *cons.CO2Max
						*p.Consumptions[tech].EnergyMin += *cons.EnergyMin
						*p.Consumptions[tech].EnergyMax += *cons.EnergyMax
					}
				}

				if len(p.Consumptions) > 0 {
					projectTotalConsumption := &Consumption{
						CO2Min:    new(float64),
						CO2Max:    new(float64),
						EnergyMin: new(float64),
						EnergyMax: new(float64),
					}
					for _, cons := range p.Consumptions {
						*projectTotalConsumption.CO2Min += *cons.CO2Min
						*projectTotalConsumption.CO2Max += *cons.CO2Max
						*projectTotalConsumption.EnergyMin += *cons.EnergyMin
						*projectTotalConsumption.EnergyMax += *cons.EnergyMax
					}
					p.Consumptions["total"] = projectTotalConsumption
				}
			}
		}
	}

	metadata := calculateMetadata(totalRecords, filters.Page, filters.PageSize)

	return projects, metadata, nil
}

func (m ProjectModel) IsUserInProject(userID uuid.UUID, projectID uuid.UUID) (bool, error) {
	query := `
        SELECT EXISTS (
            SELECT 1
            FROM users_projects
            WHERE user_id = $1 AND project_id = $2
        )`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var exists bool

	err := m.DB.QueryRowContext(ctx, query, userID, projectID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
