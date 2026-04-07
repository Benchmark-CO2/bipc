package data

import (
	"time"

	"github.com/google/uuid"
)

type ModuleTargetConsumption struct {
	ID         uuid.UUID
	ModuleID   uuid.UUID
	TargetID   uuid.UUID
	TargetType string
	RoleID     uuid.UUID
	OptionID   uuid.UUID
	CO2Min     float64
	CO2Max     float64
	EnergyMin  float64
	EnergyMax  float64
	CreatedAt  time.Time
}
