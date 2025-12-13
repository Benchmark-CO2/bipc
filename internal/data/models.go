package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
	ErrNoRowsDeleted  = errors.New("no rows deleted")
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
