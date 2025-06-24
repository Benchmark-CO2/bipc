package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
	ErrNoRowsDeleted  = errors.New("no rows were deleted")
)

type Models struct {
	Users       UserModel
	Tokens      TokenModel
	Permissions PermissionModel
	Projects    ProjectModel
	Units       UnitModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Users:       UserModel{DB: db},
		Tokens:      TokenModel{DB: db},
		Permissions: PermissionModel{DB: db},
		Projects:    ProjectModel{DB: db},
		Units:       UnitModel{DB: db},
	}
}
