package data

import (
	"context"
	"database/sql"
	"slices"
	"time"

	"github.com/lib/pq"
)

type Permissions []string

func (p Permissions) Include(code string) bool {
	return slices.Contains(p, code)
}

type PermissionModel struct {
	DB *sql.DB
}

func (m PermissionModel) GetAllForUser(userID int64, projectID int64) (Permissions, error) {
	query := `
        SELECT p.code
        FROM permissions p
        INNER JOIN users_projects_permissions upp ON upp.permission_id = p.id
        WHERE upp.user_id = $1 AND upp.project_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions Permissions

	for rows.Next() {
		var permission string

		err := rows.Scan(&permission)
		if err != nil {
			return nil, err
		}

		permissions = append(permissions, permission)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return permissions, nil
}

func (m PermissionModel) SetForUser(userID int64, projectID int64, codes ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteQuery := `
        DELETE FROM users_projects_permissions upp
        WHERE upp.user_id = $1 AND upp.project_id = $2 
        AND upp.permission_id NOT IN (SELECT p.id FROM permissions p WHERE p.code = ANY($3))`

	_, err = tx.ExecContext(ctx, deleteQuery, userID, projectID, pq.Array(codes))
	if err != nil {
		return err
	}

	insertQuery := `
        INSERT INTO users_projects_permissions (user_id, project_id, permission_id)
        SELECT $1, $2, p.id FROM permissions p WHERE p.code = ANY($3)
		ON CONFLICT DO NOTHING`

	_, err = tx.ExecContext(ctx, insertQuery, userID, projectID, pq.Array(codes))
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}
