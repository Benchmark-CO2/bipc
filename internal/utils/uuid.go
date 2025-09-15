package utils

import (
	"github.com/google/uuid"
)

// NewUUIDv7 generates a new UUID version 7.
func NewUUIDv7() (uuid.UUID, error) {
	return uuid.NewV7()
}
