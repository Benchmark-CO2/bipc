package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

var (
	ErrDuplicateRoleName       = errors.New("duplicate role name")
	ErrDuplicatePermissionID   = errors.New("duplicate permission ID")
	ErrInvalidPermissionID     = errors.New("invalid permission ID")
	ErrInvalidRoleID           = errors.New("invalid role ID")
	ErrDuplicateRolePermission = errors.New("duplicate role-permission association")
	ErrDuplicateUserRole       = errors.New("duplicate user-role association")
)

type Role struct {
	ID          uuid.UUID `json:"id"`
	ProjectID   uuid.UUID `json:"project_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitzero"`
	Simulation  bool      `json:"simulation"`
	IsProtected bool      `json:"is_protected"`
}

type RoleWithUsersPermissions struct {
	Role
	PermissionsIDs []int32     `json:"permissions_ids,omitempty"`
	UsersIDs       []uuid.UUID `json:"users_ids,omitempty"`
}

func ValidateRole(v *validator.Validator, role *RoleWithUsersPermissions) {
	v.Check(role.Name != "", "name", "must be provided")
	v.Check(len(role.Name) <= 100, "name", "must not be more than 100 bytes long")

	if role.Description != nil {
		//v.Check(*role.Description != "", "description", "must not be empty string")
		v.Check(len(*role.Description) <= 500, "description", "must not be more than 500 bytes long")
	}

	if len(role.PermissionsIDs) > 0 {
		v.Check(validator.Unique(role.PermissionsIDs), "permissions_ids", "must not contain duplicate IDs")
		v.Check(!slices.Contains(role.PermissionsIDs, 1), "permissions_ids", "cannot contain protected permissionsIDs")
	}

	if len(role.UsersIDs) > 0 {
		v.Check(validator.Unique(role.UsersIDs), "users_ids", "must not contain duplicate IDs")
	}
}

type UserWithRoles struct {
	User
	Roles []string `json:"roles,omitempty"`
}

type Collaborators struct {
	Roles         []RoleWithUsersPermissions `json:"roles,omitempty"`
	Collaborators []UserWithRoles            `json:"collaborators,omitempty"`
}

type Permissions []string

func (p Permissions) Include(code string) bool {
	return slices.Contains(p, code) || slices.Contains(p, "*:*")
}

type RoleModel struct {
	DB *sql.DB
}

func (m RoleModel) Insert(role *RoleWithUsersPermissions) error {
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	role.ID = id

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query1 := `
		INSERT INTO roles (id, project_id, name, description, simulation, is_protected)
		VALUES ($1, $2, $3, $4, $5, $6)`

	args := []any{
		role.ID,
		role.ProjectID,
		role.Name,
		role.Description,
		role.Simulation,
		role.IsProtected,
	}

	_, err = tx.Exec(query1, args...)
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

	if len(role.PermissionsIDs) > 0 {
		query2 := `
		INSERT INTO roles_permissions (role_id, permission_id)
		SELECT $1, UNNEST($2::SMALLINT[])`

		_, err = tx.Exec(query2, role.ID, pq.Array(role.PermissionsIDs))
		if err != nil {
			switch {
			case err.Error() == `pq: duplicate key value violates unique constraint "roles_permissions_pkey"`:
				return ErrDuplicatePermissionID
			case err.Error() == `pq: insert or update on table "roles_permissions" violates foreign key constraint "roles_permissions_permission_id_fkey"`:
				return ErrInvalidPermissionID
			default:
				return err
			}
		}
	}

	if len(role.UsersIDs) > 0 {
		query3 := `
		INSERT INTO users_roles (user_id, role_id)
		SELECT UNNEST($1::UUID[]), $2`

		_, err = tx.Exec(query3, pq.Array(role.UsersIDs), role.ID)
		if err != nil {
			switch {
			case err.Error() == `pq: insert or update on table "users_roles" violates foreign key constraint "users_roles_user_id_fkey"`:
				return ErrInvalidUserID
			case err.Error() == `pq: duplicate key value violates unique constraint "users_roles_pkey"`:
				return ErrDuplicateUserRole
			default:
				return err
			}
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m RoleModel) GetByID(roleID uuid.UUID) (*RoleWithUsersPermissions, error) {
	query := `
	SELECT r.id, r.project_id, r.name, r.description, r.simulation, r.is_protected,
        COALESCE(
            (SELECT ARRAY_AGG(rp.permission_id)
             FROM roles_permissions rp
             WHERE rp.role_id = r.id), '{}'
        ) AS permission_ids,
        COALESCE(
            (SELECT ARRAY_AGG(ur.user_id)
             FROM users_roles ur
             WHERE ur.role_id = r.id), '{}'
        ) AS user_ids
    FROM roles r
    WHERE r.id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var role RoleWithUsersPermissions

	err := m.DB.QueryRowContext(ctx, query, roleID).Scan(&role.ID, &role.ProjectID, &role.Name, &role.Description, &role.Simulation, &role.IsProtected, pq.Array(&role.PermissionsIDs), pq.Array(&role.UsersIDs))
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &role, nil
}

func (m RoleModel) Update(role *RoleWithUsersPermissions) error {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query1 := `
    UPDATE roles
	SET name = $1, description = $2, simulation = $3
	WHERE id = $4`

	args := []any{
		role.Name,
		role.Description,
		role.Simulation,
		role.ID,
	}

	_, err = tx.Exec(query1, args...)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "roles_project_id_name_key"`:
			return ErrDuplicateRoleName
		default:
			return err
		}
	}

	query2 := `
		DELETE FROM roles_permissions WHERE role_id = $1 AND permission_id <> ALL($2)`

	_, err = tx.Exec(query2, role.ID, pq.Array(role.PermissionsIDs))
	if err != nil {
		return err
	}

	query3 := `
		INSERT INTO roles_permissions (role_id, permission_id)
		SELECT $1, UNNEST($2::SMALLINT[])
		ON CONFLICT DO NOTHING
		`

	_, err = tx.Exec(query3, role.ID, pq.Array(role.PermissionsIDs))
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "roles_permissions_pkey"`:
			return ErrDuplicatePermissionID
		case err.Error() == `pq: insert or update on table "roles_permissions" violates foreign key constraint "roles_permissions_permission_id_fkey"`:
			return ErrInvalidPermissionID
		default:
			return err
		}
	}

	query4 := `
	DELETE FROM users_roles WHERE role_id = $1 AND user_id <> ALL($2)`

	_, err = tx.Exec(query4, role.ID, pq.Array(role.UsersIDs))
	if err != nil {
		return err
	}

	query5 := `
	INSERT INTO users_roles (user_id, role_id)
	SELECT UNNEST($1::UUID[]), $2
	ON CONFLICT DO NOTHING`

	_, err = tx.Exec(query5, pq.Array(role.UsersIDs), role.ID)
	if err != nil {
		switch {
		case err.Error() == `pq: insert or update on table "users_roles" violates foreign key constraint "users_roles_user_id_fkey"`:
			return ErrInvalidUserID
		default:
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m RoleModel) Delete(roleID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	DELETE FROM roles WHERE id = $1`

	_, err := m.DB.ExecContext(ctx, query, roleID)
	if err != nil {
		return err
	}

	return nil
}

func (m RoleModel) Collaborators(projectID uuid.UUID) (Collaborators, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT r.id, r.project_id, r.name, r.description, r.simulation, r.is_protected,
        COALESCE(
            (SELECT ARRAY_AGG(rp.permission_id)
             FROM roles_permissions rp
             WHERE rp.role_id = r.id), '{}'
        ) AS permission_ids,
        COALESCE(
            (SELECT ARRAY_AGG(ur.user_id)
             FROM users_roles ur
             WHERE ur.role_id = r.id), '{}'
        ) AS user_ids
    FROM roles r
    WHERE r.project_id = $1`

	var collaborators Collaborators

	rows, err := m.DB.QueryContext(ctx, query, projectID)
	if err != nil {
		return collaborators, err
	}
	defer rows.Close()

	for rows.Next() {
		var role RoleWithUsersPermissions

		err := rows.Scan(&role.ID, &role.ProjectID, &role.Name, &role.Description, &role.Simulation, &role.IsProtected, pq.Array(&role.PermissionsIDs), pq.Array(&role.UsersIDs))
		if err != nil {
			return collaborators, err
		}

		collaborators.Roles = append(collaborators.Roles, role)
	}
	if err = rows.Err(); err != nil {
		return collaborators, err
	}

	query2 := `
	SELECT u.id, u.created_at, u.name, u.email, u.activated, u.crea_cau, u.birthdate, u.city, u.activity, u.enterprise,
    COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
    FROM users u
    JOIN users_projects up ON u.id = up.user_id
    LEFT JOIN users_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id AND r.project_id = up.project_id
    WHERE up.project_id = $1
    GROUP BY u.id`

	rows2, err := m.DB.QueryContext(ctx, query2, projectID)
	if err != nil {
		return collaborators, err
	}
	defer rows2.Close()

	for rows2.Next() {
		var user UserWithRoles

		err := rows2.Scan(&user.ID, &user.CreatedAt, &user.Name, &user.Email, &user.Activated, &user.Crea_Cau, &user.Birthdate, &user.City, &user.Activity, &user.Enterprise, pq.Array(&user.Roles))
		if err != nil {
			return collaborators, err
		}

		collaborators.Collaborators = append(collaborators.Collaborators, user)
	}
	if err = rows.Err(); err != nil {
		return collaborators, err
	}

	return collaborators, nil
}

func (m RoleModel) GetPermissionsForUser(userID uuid.UUID, projectID uuid.UUID) (Permissions, error) {
	query := `
        SELECT DISTINCT p.action, p.resource
		FROM permissions p
		JOIN roles_permissions rp ON p.id = rp.permission_id
		JOIN roles r ON rp.role_id = r.id
		JOIN users_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1 AND r.project_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions Permissions

	for rows.Next() {
		var action string
		var resource string

		err := rows.Scan(&action, &resource)
		if err != nil {
			return nil, err
		}

		permissions = append(permissions, fmt.Sprintf("%s:%s", action, resource))
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return permissions, nil
}

func (m RoleModel) GetAllUserRoles(userID uuid.UUID, projectID uuid.UUID) ([]Role, error) {
	query := `
		SELECT r.id, r.project_id, r.name, r.description, r.simulation, r.is_protected
		FROM roles r
		INNER JOIN users_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1 AND r.project_id = $2
		ORDER BY r.name`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []Role

	for rows.Next() {
		var role Role

		err := rows.Scan(
			&role.ID,
			&role.ProjectID,
			&role.Name,
			&role.Description,
			&role.Simulation,
			&role.IsProtected,
		)
		if err != nil {
			return nil, err
		}

		roles = append(roles, role)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return roles, nil
}

func (m RoleModel) IsUserAssociated(userID uuid.UUID, roleID uuid.UUID) (bool, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT EXISTS (
    SELECT 1
    FROM users_roles
    WHERE user_id = $1 AND role_id = $2)`

	var exists bool

	err := m.DB.QueryRowContext(ctx, query, userID, roleID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
