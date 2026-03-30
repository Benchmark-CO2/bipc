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
	"github.com/lib/pq"
)

var (
	states = []string{"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
		"MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
		"RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

	phases = []string{"preliminary_study", "not_defined", "basic_project", "executive_project", "released_for_construction"}

	ErrNilProjectID         = errors.New("project ID must be provided")
	ErrInvalidProjectID     = errors.New("projectID does not exist")
	ErrDuplicateUserProject = errors.New("duplicate user-project association")
)

type ProjectUnit struct {
	ID              uuid.UUID               `json:"id"`
	Name            string                  `json:"name"`
	Type            string                  `json:"type"`
	RepetitionCount int                     `json:"repetition_count"`
	Consumptions    map[string]*Consumption `json:"consumptions,omitempty"`
	Area            float64                 `json:"area"`
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
	Description  *string   `json:"description,omitzero"`
	Benchmark    bool      `json:"benchmark"`
}

type ProjectWithUnits struct {
	Project
	IsAdministrator bool   `json:"is_administrator,omitzero"`
	Roles           []Role `json:"roles,omitempty"`

	Units        []ProjectUnit           `json:"units,omitempty"`
	Consumptions map[string]*Consumption `json:"consumption,omitempty"`
	Area         float64                 `json:"area,omitzero"`
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

	if project.Description != nil {
		v.Check(*project.Description != "", "description", "empty description is not allowed")
		v.Check(len(*project.Description) <= 500, "description", "must not be more than 500 bytes long")
	}
}

type ProjectModel struct {
	DB *sql.DB
}

func (m ProjectModel) Insert(project *Project, userID uuid.UUID) error {
	if project.ID == uuid.Nil {
		return ErrNilProjectID
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
		INSERT INTO projects (id, name, cep, state, city, neighborhood, street, number, phase, description, benchmark)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING created_at, benchmark`

	args := []any{project.ID, project.Name, project.CEP, project.State, project.City, project.Neighborhood,
		project.Street, project.Number, project.Phase, project.Description, project.Benchmark}

	err = tx.QueryRow(query1, args...).Scan(&project.CreatedAt, &project.Benchmark)
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

func (m ProjectModel) GetByID(id uuid.UUID) (*ProjectWithUnits, error) {
	query := `
		SELECT id, created_at, name, cep, state, city, neighborhood, street, number, phase, description, benchmark
		FROM projects
		WHERE id = $1`

	var project ProjectWithUnits

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
		&project.Description,
		&project.Benchmark,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	// Get all roles for this project
	rolesQuery := `
		SELECT id, project_id, name, description, simulation, is_protected
		FROM roles
		WHERE project_id = $1
		ORDER BY name`

	rolesRows, err := m.DB.QueryContext(ctx, rolesQuery, project.ID)
	if err != nil {
		return nil, err
	}
	defer rolesRows.Close()

	var roles []Role
	for rolesRows.Next() {
		var role Role
		if err := rolesRows.Scan(&role.ID, &role.ProjectID, &role.Name, &role.Description, &role.Simulation, &role.IsProtected); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}

	if err := rolesRows.Err(); err != nil {
		return nil, err
	}

	project.Roles = roles

	unitsQuery := `
		SELECT id, name, type, repetition_count
		FROM units
		WHERE project_id = $1
		ORDER BY id`

	rows, err := m.DB.QueryContext(ctx, unitsQuery, project.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []ProjectUnit
	for rows.Next() {
		var unit ProjectUnit
		if err := rows.Scan(&unit.ID, &unit.Name, &unit.Type, &unit.RepetitionCount); err != nil {
			return nil, err
		}

		if unit.Type == "tower" {
			consumptions, area, err := GetUnitConsumptionByTechnology(m.DB, unit.ID)
			if err != nil {
				return nil, err
			}
			unit.Consumptions = consumptions
			unit.Area = area
		}

		units = append(units, unit)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	project.Units = units
	project.Consumptions, project.Area = CalculateProjectConsumptions(units)

	return &project, nil
}

func (m ProjectModel) Update(project *Project) error {
	query := `
		UPDATE projects
		SET name = $1, cep = $2, state = $3, city = $4, neighborhood = $5, street = $6, number = $7, phase = $8, description = $9
		WHERE id = $10`

	args := []any{
		project.Name,
		project.CEP,
		project.State,
		project.City,
		project.Neighborhood,
		project.Street,
		project.Number,
		project.Phase,
		project.Description,
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

func (m ProjectModel) GetAll(name string, filters Filters, userID uuid.UUID) ([]*ProjectWithUnits, Metadata, error) {
	query := fmt.Sprintf(`
		SELECT COUNT(*) OVER(), p.id, p.created_at, p.name,
		p.cep, p.state, p.city, p.neighborhood, p.street, p.number, p.phase, p.description,
		EXISTS(
			SELECT 1
			FROM users_roles ur
			JOIN roles r ON ur.role_id = r.id
			JOIN roles_permissions rp ON r.id = rp.role_id
			WHERE ur.user_id = $2 
			AND r.project_id = p.id 
			AND rp.permission_id = 1
		) as is_administrator
		FROM projects p
		INNER JOIN users_projects up ON up.project_id = p.id
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
	projects := []*ProjectWithUnits{}
	projectIDs := []uuid.UUID{}
	projectsMap := make(map[uuid.UUID]*ProjectWithUnits)

	for rows.Next() {
		var project ProjectWithUnits
		project.Consumptions = make(map[string]*Consumption)
		project.Units = []ProjectUnit{}

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
			&project.Description,
			&project.IsAdministrator,
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
			SELECT project_id, id, name, type, repetition_count
			FROM units
			WHERE project_id = ANY($1)
			ORDER BY project_id, id`

		unitRows, err := m.DB.QueryContext(ctx, unitsQuery, pq.Array(projectIDs))
		if err != nil {
			return nil, Metadata{}, err
		}
		defer unitRows.Close()

		projectUnits := make(map[uuid.UUID][]ProjectUnit)

		for unitRows.Next() {
			var projectID uuid.UUID
			var unit ProjectUnit
			if err := unitRows.Scan(&projectID, &unit.ID, &unit.Name, &unit.Type, &unit.RepetitionCount); err != nil {
				return nil, Metadata{}, err
			}

			if unit.Type == "tower" {
				consumptions, area, err := GetUnitConsumptionByTechnology(m.DB, unit.ID)
				if err != nil {
					return nil, Metadata{}, err
				}
				unit.Consumptions = consumptions
				unit.Area = area
			} else {
				unit.Consumptions = make(map[string]*Consumption)
			}

			projectUnits[projectID] = append(projectUnits[projectID], unit)
		}

		if err := unitRows.Err(); err != nil {
			return nil, Metadata{}, err
		}

		for projectID, units := range projectUnits {
			if p, ok := projectsMap[projectID]; ok {
				p.Units = units
				p.Consumptions, p.Area = CalculateProjectConsumptions(units)
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

func (m ProjectModel) RemoveUser(projectID uuid.UUID, userID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query1 := `
	DELETE FROM users_projects
	WHERE project_id = $1 AND user_id = $2`

	_, err = tx.Exec(query1, projectID, userID)
	if err != nil {
		return err
	}

	query2 := `
	DELETE FROM users_roles
	WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE project_id = $2)`

	_, err = tx.Exec(query2, userID, projectID)
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}
