package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/utils"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/gofrs/uuid"
	"github.com/lib/pq"
)

var (
	states = []string{"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
		"MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
		"RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}

	phases = []string{"preliminary_study", "not_defined", "basic_project", "executive_project", "released_for_construction"}

	ErrDuplicateProjectName = errors.New("duplicate project name")
)

type UnitBasic struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Type string    `json:"type"`
}

type Project struct {
	ID           uuid.UUID   `json:"id"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	UserID       int64       `json:"user_id"`
	Name         string      `json:"name"`
	CEP          *string     `json:"cep,omitzero"`
	State        string      `json:"state"`
	City         string      `json:"city"`
	Neighborhood *string     `json:"neighborhood,omitzero"`
	Street       *string     `json:"street,omitzero"`
	Number       *string     `json:"number,omitzero"`
	Phase        string      `json:"phase"`
	Description  *string     `json:"description,omitzero"`
	ImageURL     *string     `json:"image_url,omitzero"`
	Units        []UnitBasic `json:"units,omitempty"`
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

	if project.ImageURL != nil {
		v.Check(*project.ImageURL != "", "image_url", "empty image URL is not allowed")
		v.Check(validator.IsValidHTTPURL(*project.ImageURL), "image_url", "must be a valid URL")
	}
}

type ProjectModel struct {
	DB *sql.DB
}

func (m ProjectModel) Insert(project *Project) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	projectID, err := utils.NewUUIDv7()
	if err != nil {
		return err
	}
	project.ID = projectID

	query1 := `
		INSERT INTO projects (id, user_id, name, cep, state, city, neighborhood, street, number, phase, description, image_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at, updated_at`

	args := []any{project.ID, project.UserID, project.Name, project.CEP, project.State, project.City, project.Neighborhood,
		project.Street, project.Number, project.Phase, project.Description, project.ImageURL}

	err = tx.QueryRow(query1, args...).Scan(&project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "projects_user_id_name_key"`:
			return ErrDuplicateProjectName
		default:
			return err
		}
	}

	query2 := `
		INSERT INTO users_projects_permissions (user_id, project_id, permission_id)
		SELECT $1, $2, permissions.id FROM permissions WHERE permissions.code = ANY($3)`

	_, err = tx.Exec(query2, project.UserID, project.ID, pq.Array([]string{"project:owner", "project:view", "project:edit"}))
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m ProjectModel) GetByID(id uuid.UUID) (*Project, error) {
	query := `
		SELECT id, created_at, updated_at, user_id, name, cep, state, city, neighborhood, street, number, phase, description, image_url
		FROM projects
		WHERE id = $1`

	var project Project

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&project.ID,
		&project.CreatedAt,
		&project.UpdatedAt,
		&project.UserID,
		&project.Name,
		&project.CEP,
		&project.State,
		&project.City,
		&project.Neighborhood,
		&project.Street,
		&project.Number,
		&project.Phase,
		&project.Description,
		&project.ImageURL,
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
        SELECT id, name, type
        FROM units
        WHERE project_id = $1
        ORDER BY id
    `
	rows, err := m.DB.QueryContext(ctx, unitsQuery, project.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var units []UnitBasic
	for rows.Next() {
		var u UnitBasic
		if err := rows.Scan(&u.ID, &u.Name, &u.Type); err != nil {
			return nil, err
		}
		units = append(units, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	project.Units = units

	return &project, nil
}

func (m ProjectModel) Update(project *Project) error {
	query := `
		UPDATE projects
		SET name = $1, cep = $2, state = $3, city = $4, neighborhood = $5, street = $6,
		number = $7, phase = $8, description = $9, image_url = $10
		WHERE id = $11`

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
		project.ImageURL,
		project.ID,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "projects_user_id_name_key"`:
			return ErrDuplicateProjectName
		default:
			return err
		}
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

func (m ProjectModel) GetAll(name string, filters Filters, userID int64) ([]*Project, Metadata, error) {
	query := fmt.Sprintf(`
 		SELECT COUNT(*) OVER(), p.id, p.created_at, p.updated_at, p.user_id, p.name,
		p.cep, p.state, p.city, p.neighborhood, p.street, p.number, p.phase, p.description, p.image_url
 		FROM projects p
		INNER JOIN users_projects_permissions upp ON upp.project_id = p.id
 		WHERE (to_tsvector('simple', p.name) @@ plainto_tsquery('simple', $1) OR $1 = '')
		AND upp.user_id = $2
		AND upp.permission_id = (SELECT permissions.id FROM permissions WHERE code = 'project:view')
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
	projects := []*Project{}

	for rows.Next() {
		var project Project

		err := rows.Scan(
			&totalRecords,
			&project.ID,
			&project.CreatedAt,
			&project.UpdatedAt,
			&project.UserID,
			&project.Name,
			&project.CEP,
			&project.State,
			&project.City,
			&project.Neighborhood,
			&project.Street,
			&project.Number,
			&project.Phase,
			&project.Description,
			&project.ImageURL,
		)
		if err != nil {
			return nil, Metadata{}, err
		}

		projects = append(projects, &project)
	}
	if err = rows.Err(); err != nil {
		return nil, Metadata{}, err
	}

	metadata := calculateMetadata(totalRecords, filters.Page, filters.PageSize)

	return projects, metadata, nil
}
