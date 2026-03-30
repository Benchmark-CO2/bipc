package data

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/i18n"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

var (
	status = []string{"accepted", "declined"}

	ErrDuplicatePendingInvitation = errors.New("a pending invitation already exists for this user in this project")
)

type Invitation struct {
	ID        uuid.UUID `json:"id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	InviterID uuid.UUID `json:"inviter_id"`
	ProjectID uuid.UUID `json:"project_id"`
	Email     string    `json:"email"`
}

type InvitationWithDetails struct {
	Invitation
	InviterName string `json:"inviter_name"`
	ProjectName string `json:"project_name"`
}

func ValidateStatus(v *validator.Validator, s string, lang i18n.Language) {
	v.Check(s != "", "status", i18n.GetMessage(lang, "validation_must_be_provided"))
	v.Check(validator.PermittedValue(s, status...), "status", fmt.Sprintf(i18n.GetMessage(lang, "validation_valid_status"), strings.Join(status, ", ")))
}

type InvitationModel struct {
	DB *sql.DB
}

func (m *InvitationModel) Insert(invitation *Invitation) error {
	id, err := uuid.NewV7()
	if err != nil {
		return err
	}
	invitation.ID = id

	query := `
		INSERT INTO invitations (id, expires_at, inviter_id, project_id, email)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING status,created_at`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{invitation.ID, invitation.ExpiresAt, invitation.InviterID, invitation.ProjectID, invitation.Email}

	err = m.DB.QueryRowContext(ctx, query, args...).Scan(&invitation.Status, &invitation.CreatedAt)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "invitations_project_id_email_pending_idx"`:
			return ErrDuplicatePendingInvitation
		default:
			return err
		}
	}

	return nil
}

func (m *InvitationModel) GetPendingByEmail(email string) ([]*InvitationWithDetails, error) {
	query := `
		SELECT i.id, i.status , i.created_at, i.expires_at, i.inviter_id, i.project_id, i.email, u.name as inviter_name, p.name as project_name
		FROM invitations i INNER JOIN projects p on p.id = i.project_id INNER JOIN users u on u.id = i.inviter_id
		WHERE i.email = $1 AND i.status = 'pending' AND i.expires_at > $2
		`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, email, time.Now())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invitations := []*InvitationWithDetails{}

	for rows.Next() {
		var invitation InvitationWithDetails

		err := rows.Scan(
			&invitation.ID,
			&invitation.Status,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
			&invitation.InviterID,
			&invitation.ProjectID,
			&invitation.Email,
			&invitation.InviterName,
			&invitation.ProjectName,
		)
		if err != nil {
			return nil, err
		}

		invitations = append(invitations, &invitation)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return invitations, nil
}

func (m *InvitationModel) GetByID(id uuid.UUID) (*Invitation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT id, status, created_at, expires_at, inviter_id, project_id, email
	FROM invitations
	WHERE id = $1`

	var invitation Invitation

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&invitation.ID,
		&invitation.Status,
		&invitation.CreatedAt,
		&invitation.ExpiresAt,
		&invitation.InviterID,
		&invitation.ProjectID,
		&invitation.Email,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &invitation, nil
}

func (m *InvitationModel) Reply(invitation *Invitation, status string, user *User) error {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		UPDATE invitations
		SET status = $1
		WHERE id = $2 AND email = $3 AND status = 'pending' AND expires_at > $4`

	result, err := tx.Exec(query, status, invitation.ID, user.Email, time.Now())
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

	if status == "accepted" {
		query2 := `
		INSERT INTO users_projects (user_id, project_id)
		VALUES ($1, $2)`

		_, err = tx.Exec(query2, user.ID, invitation.ProjectID)
		if err != nil {
			return err
		}
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m *InvitationModel) GetPendingByProject(projectID uuid.UUID) ([]*Invitation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT id, status, created_at, expires_at, inviter_id, project_id, email
		FROM invitations
		WHERE project_id = $1 AND status = 'pending' AND expires_at > $2`

	rows, err := m.DB.QueryContext(ctx, query, projectID, time.Now())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invitations := []*Invitation{}

	for rows.Next() {
		var invitation Invitation

		err := rows.Scan(
			&invitation.ID,
			&invitation.Status,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
			&invitation.InviterID,
			&invitation.ProjectID,
			&invitation.Email,
		)
		if err != nil {
			return nil, err
		}

		invitations = append(invitations, &invitation)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return invitations, nil
}

func (m *InvitationModel) Delete(invitationID uuid.UUID, projectID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		DELETE FROM invitations
		WHERE id = $1 AND project_id = $2`

	_, err := m.DB.ExecContext(ctx, query, invitationID, projectID)
	if err != nil {
		return err
	}

	return nil
}
