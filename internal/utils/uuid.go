package utils

import (
	"github.com/gofrs/uuid"
)

// NewUUIDv7 generates a new UUID version 7.
func NewUUIDv7() (uuid.UUID, error) {
	return uuid.NewV7()
}
