package data

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/i18n"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

const (
	ScopeActivation     = "activation"
	ScopeAuthentication = "authentication"
	ScopePasswordReset  = "password-reset"
	ScopeAPIKey         = "api-key"
)

type Token struct {
	Plaintext string    `json:"token"`
	Hash      []byte    `json:"-"`
	UserID    uuid.UUID `json:"-"`
	Expiry    time.Time `json:"expiry"`
	Scope     string    `json:"-"`
	IP        *string   `json:"-"`
}

func ValidateTokenPlaintext(v *validator.Validator, tokenPlaintext string, lang i18n.Language) {
	v.Check(tokenPlaintext != "", "token", i18n.GetMessage(lang, "validation_must_be_provided"))
	v.Check(len(tokenPlaintext) == 26, "token", i18n.GetMessage(lang, "validation_token_26_bytes")) // rand.Text() generates 26 byte strings
}

func generateToken(userID uuid.UUID, ttl time.Duration, scope string, ip *string) *Token {
	token := &Token{
		Plaintext: rand.Text(),
		UserID:    userID,
		Expiry:    time.Now().Add(ttl),
		Scope:     scope,
		IP:        ip,
	}

	hash := sha256.Sum256([]byte(token.Plaintext))
	token.Hash = hash[:]

	return token
}

type TokenModel struct {
	DB *sql.DB
}

func (m TokenModel) New(userID uuid.UUID, ttl time.Duration, scope string, ip *string) (*Token, error) {
	token := generateToken(userID, ttl, scope, ip)

	err := m.Insert(token)
	return token, err
}

func (m TokenModel) Insert(token *Token) error {
	query := `
        INSERT INTO tokens (hash, user_id, expiry, scope, ip) 
        VALUES ($1, $2, $3, $4, $5)`

	args := []any{token.Hash, token.UserID, token.Expiry, token.Scope, token.IP}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, args...)

	return err
}

func (m TokenModel) DeleteAllForUser(scope string, userID uuid.UUID) error {
	query := `
        DELETE FROM tokens 
        WHERE scope = $1 AND user_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, scope, userID)

	return err
}
