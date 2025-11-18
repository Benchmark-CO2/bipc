package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
	ErrNoRowsDeleted  = errors.New("no rows deleted")

	ErrInvalidOptionID    = errors.New("option_id does not exist or is invalid")
	ErrInvalidFloorID     = errors.New("one or more floor_ids are invalid or do not exist")
	ErrInvalidUnitID      = errors.New("unit_id does not exist or is invalid")
	ErrUnitIsNotTower     = errors.New("the specified unit is not a tower")
	ErrInvalidFloorFilter = errors.New("invalid floor filter")
)

type Models struct {
	Users       UserModel
	Tokens      TokenModel
	Roles       RoleModel
	Projects    ProjectModel
	Units       UnitModel
	Options     OptionModel
	Invitations InvitationModel
	Modules     ModuleModel
	Benchmark   BenchmarkModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Users:       UserModel{DB: db},
		Tokens:      TokenModel{DB: db},
		Roles:       RoleModel{DB: db},
		Projects:    ProjectModel{DB: db},
		Units:       UnitModel{DB: db},
		Options:     OptionModel{DB: db},
		Invitations: InvitationModel{DB: db},
		Modules:     ModuleModel{DB: db},
		Benchmark:   BenchmarkModel{DB: db},
	}
}
