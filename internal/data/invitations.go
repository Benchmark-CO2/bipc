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
	status = []string{"pending", "accepted", "declined"}

	ErrDuplicatePendingInvitation = errors.New("a pending invitation already exists for this user in this project")
)

type Invitation struct {
	ID          int64     `json:"id"`
	Token       uuid.UUID `json:"token"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	Status      string    `json:"status"`
	InviterID   int64     `json:"inviter_id"`
	ProjectID   int64     `json:"project_id"`
	Email       string    `json:"email"`
	Permissions []string  `json:"permissions"`
}

func ValidateStatus(v *validator.Validator, s string) {
	v.Check(s != "", "status", "must be provided")
	v.Check(validator.PermittedValue(s, status...), "status", fmt.Sprintf("must be a valid state code (allowed: %s)", strings.Join(status, ", ")))
}

type InvitationModel struct {
	DB *sql.DB
}

func (m *InvitationModel) Insert(invitation *Invitation) error {
	query := `
		INSERT INTO invitations (inviter_id, project_id, email, permissions)
		VALUES ($1, $2, $3, $4)
		RETURNING id, token, created_at, expires_at, status`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{invitation.InviterID, invitation.ProjectID, invitation.Email, pq.Array(invitation.Permissions)}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&invitation.ID, &invitation.Token, &invitation.CreatedAt, &invitation.ExpiresAt, &invitation.Status)
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

func (m *InvitationModel) GetPendingByEmail(email string) ([]*Invitation, error) {
	query := `
		SELECT id, token, created_at, expires_at, status, inviter_id, project_id, email, permissions
		FROM invitations
		WHERE email = $1 AND status = 'pending' AND expires_at > $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, email, time.Now())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invitations := []*Invitation{}

	for rows.Next() {
		var invitation Invitation

		err := rows.Scan(
			&invitation.ID,
			&invitation.Token,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
			&invitation.Status,
			&invitation.InviterID,
			&invitation.ProjectID,
			&invitation.Email,
			pq.Array(&invitation.Permissions),
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

func (m *InvitationModel) Reply(invitationID int64, status string, email string) error {
	query := `
		UPDATE invitations
		SET status = $1
		WHERE id = $2 AND email = $3 AND status = 'pending' AND expires_at > $4`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, status, invitationID, email, time.Now())
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

func (m *InvitationModel) GetByID(id int64) (*Invitation, error) {
	query := `
		SELECT id, token, created_at, expires_at, status, inviter_id, project_id, email, permissions
		FROM invitations
		WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var invitation Invitation
	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&invitation.ID,
		&invitation.Token,
		&invitation.CreatedAt,
		&invitation.ExpiresAt,
		&invitation.Status,
		&invitation.InviterID,
		&invitation.ProjectID,
		&invitation.Email,
		pq.Array(&invitation.Permissions),
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
