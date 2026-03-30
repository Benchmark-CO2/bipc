package data

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/i18n"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	types = []string{"member", "company"}

	ErrDuplicateEmail = errors.New("duplicate email")
	ErrInvalidUserID  = errors.New("userID does not exist")
)

var AnonymousUser = &User{}

type User struct {
	ID         uuid.UUID  `json:"id"`
	CreatedAt  time.Time  `json:"created_at"`
	Name       string     `json:"name"`
	Email      string     `json:"email"`
	Password   password   `json:"-"`
	Activated  bool       `json:"activated"`
	Type       string     `json:"type"`
	Cnpj       *string    `json:"cnpj,omitzero"`
	CreaCau    *string    `json:"crea_cau,omitzero"`
	Birthdate  *time.Time `json:"birthdate,omitzero"`
	City       *string    `json:"city,omitzero"`
	Activity   *string    `json:"activity,omitzero"`
	Enterprise *string    `json:"enterprise,omitzero"`
}

func (u *User) IsAnonymous() bool {
	return u == AnonymousUser
}

func ValidateEmail(v *validator.Validator, email string, lang i18n.Language) {
	v.Check(email != "", "email", i18n.GetMessage(lang, "validation_must_be_provided"))
	v.Check(validator.Matches(email, validator.EmailRX), "email", i18n.GetMessage(lang, "validation_valid_email"))
}

func ValidatePasswordPlaintext(v *validator.Validator, password string, lang i18n.Language) {
	v.Check(password != "", "password", i18n.GetMessage(lang, "validation_must_be_provided"))
	v.Check(len(password) >= 8, "password", i18n.GetMessage(lang, "validation_min_8_bytes"))
	v.Check(len(password) <= 72, "password", i18n.GetMessage(lang, "validation_max_72_bytes")) // bcrypt max
}

func ValidateUser(v *validator.Validator, user *User, lang i18n.Language) {
	v.Check(user.Name != "", "name", i18n.GetMessage(lang, "validation_must_be_provided"))
	v.Check(len(user.Name) <= 500, "name", i18n.GetMessage(lang, "validation_max_500_bytes"))

	ValidateEmail(v, user.Email, lang)

	if user.Password.plaintext != nil {
		ValidatePasswordPlaintext(v, *user.Password.plaintext, lang)
	}

	if user.Password.hash == nil {
		panic("missing password hash for user")
	}

	v.Check(validator.PermittedValue(user.Type, types...), "type", fmt.Sprintf(i18n.GetMessage(lang, "validation_valid_type"), strings.Join(types, ", ")))

	if user.Cnpj != nil {
		v.Check(*user.Cnpj != "", "cnpj", i18n.GetMessage(lang, "validation_not_empty_if_provided"))
		v.Check(len(*user.Cnpj) == 14, "cnpj", i18n.GetMessage(lang, "validation_exactly_14_digits"))
		v.Check(validator.Matches(*user.Cnpj, validator.CnpjRX), "cnpj", i18n.GetMessage(lang, "validation_only_digits"))
	}

	if user.CreaCau != nil {
		v.Check(*user.CreaCau != "", "crea_cau", i18n.GetMessage(lang, "validation_not_empty_if_provided"))
		v.Check(len(*user.CreaCau) <= 100, "crea_cau", i18n.GetMessage(lang, "validation_max_100_bytes"))
	}

	if user.City != nil {
		v.Check(*user.City != "", "city", i18n.GetMessage(lang, "validation_not_empty_if_provided"))
		v.Check(len(*user.City) <= 100, "city", i18n.GetMessage(lang, "validation_max_100_bytes"))
	}

	if user.Activity != nil {
		v.Check(*user.Activity != "", "activity", i18n.GetMessage(lang, "validation_not_empty_if_provided"))
		v.Check(len(*user.Activity) <= 100, "activity", i18n.GetMessage(lang, "validation_max_100_bytes"))
	}

	if user.Enterprise != nil {
		v.Check(*user.Enterprise != "", "enterprise", i18n.GetMessage(lang, "validation_not_empty_if_provided"))
		v.Check(len(*user.Enterprise) <= 100, "enterprise", i18n.GetMessage(lang, "validation_max_100_bytes"))
	}
}

type password struct {
	plaintext *string
	hash      []byte
}

func (p *password) Set(plaintextPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintextPassword), 12)
	if err != nil {
		return err
	}

	p.plaintext = &plaintextPassword
	p.hash = hash

	return nil
}

func (p *password) Matches(plaintextPassword string) (bool, error) {
	err := bcrypt.CompareHashAndPassword(p.hash, []byte(plaintextPassword))
	if err != nil {
		switch {
		case errors.Is(err, bcrypt.ErrMismatchedHashAndPassword):
			return false, nil
		default:
			return false, err
		}
	}

	return true, nil
}

type UserModel struct {
	DB *sql.DB
}

func (m UserModel) Insert(user *User) error {
	userID, err := uuid.NewV7()
	if err != nil {
		return err
	}

	user.ID = userID

	query := `
        INSERT INTO users (id, name, email, password_hash, activated, type, cnpj, crea_cau, birthdate, city, activity, enterprise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING created_at`

	args := []any{user.ID, user.Name, user.Email, user.Password.hash, user.Activated, user.Type, user.Cnpj, user.CreaCau, user.Birthdate, user.City, user.Activity, user.Enterprise}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err = m.DB.QueryRowContext(ctx, query, args...).Scan(&user.CreatedAt)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
			return ErrDuplicateEmail
		default:
			return err
		}
	}

	return nil
}

func (m UserModel) GetByEmail(email string) (*User, error) {
	query := `
        SELECT id, created_at, name, email, password_hash, activated, type, cnpj, crea_cau, birthdate, city, activity, enterprise
        FROM users
        WHERE email = $1`

	var user User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Email,
		&user.Password.hash,
		&user.Activated,
		&user.Type,
		&user.Cnpj,
		&user.CreaCau,
		&user.Birthdate,
		&user.City,
		&user.Activity,
		&user.Enterprise,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}

func (m UserModel) Update(user *User) error {
	query := `
        UPDATE users
        SET name = $1, email = $2, password_hash = $3, activated = $4, type = $5, cnpj = $6, crea_cau = $7, birthdate = $8, city = $9, activity = $10, enterprise = $11
        WHERE id = $12`

	args := []any{
		user.Name,
		user.Email,
		user.Password.hash,
		user.Activated,
		user.Type,
		user.Cnpj,
		user.CreaCau,
		user.Birthdate,
		user.City,
		user.Activity,
		user.Enterprise,
		user.ID,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"`:
			return ErrDuplicateEmail
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

func (m UserModel) GetForToken(tokenScope, tokenPlaintext string) (*User, error) {
	tokenHash := sha256.Sum256([]byte(tokenPlaintext))

	query := `
        SELECT u.id, u.created_at, u.name, u.email, u.password_hash, u.activated, u.type, u.cnpj, u.crea_cau, u.birthdate, u.city, u.activity, u.enterprise
        FROM users u
        INNER JOIN tokens t ON u.id = t.user_id
        WHERE t.hash = $1
        AND t.scope = $2
        AND t.expiry > $3`

	args := []any{tokenHash[:], tokenScope, time.Now()}

	var user User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Name,
		&user.Email,
		&user.Password.hash,
		&user.Activated,
		&user.Type,
		&user.Cnpj,
		&user.CreaCau,
		&user.Birthdate,
		&user.City,
		&user.Activity,
		&user.Enterprise,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}

func (m UserModel) Collaborators(userID uuid.UUID) ([]*User, error) {
	query := `
		SELECT u.id, u.created_at, u.name, u.email, u.activated, u.type, u.cnpj, u.crea_cau, u.birthdate, u.city, u.activity, u.enterprise
		FROM users u
		JOIN users_projects up1 ON u.id = up1.user_id
		JOIN users_projects up2 ON up1.project_id = up2.project_id
		WHERE
    	up2.user_id = $1
    	AND up1.user_id != $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*User{}

	for rows.Next() {
		var user User

		err := rows.Scan(
			&user.ID,
			&user.CreatedAt,
			&user.Name,
			&user.Email,
			&user.Activated,
			&user.Type,
			&user.Cnpj,
			&user.CreaCau,
			&user.Birthdate,
			&user.City,
			&user.Activity,
			&user.Enterprise,
		)
		if err != nil {
			return nil, err
		}

		users = append(users, &user)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (m UserModel) Delete(userID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		DELETE FROM users
		WHERE id = $1`

	_, err := m.DB.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}

	return nil
}
