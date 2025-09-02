package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound       = errors.New("record not found")
	ErrEditConflict         = errors.New("edit conflict")
	ErrNoRowsDeleted        = errors.New("no rows were deleted")
	ErrInvalidTowerOptionID = errors.New("tower_option_id does not exist or is invalid")
	ErrInvalidFloorID       = errors.New("one or more floor_ids are invalid or do not exist")
)

type Models struct {
	Users               UserModel
	Tokens              TokenModel
	Permissions         PermissionModel
	Projects            ProjectModel
	Units               UnitModel
	TowerOptions        TowerOptionModel
	Invitations         InvitationModel
	BeamColumnModules   BeamColumnModuleModel
	ConcreteWallModules ConcreteWallModuleModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Users:               UserModel{DB: db},
		Tokens:              TokenModel{DB: db},
		Permissions:         PermissionModel{DB: db},
		Projects:            ProjectModel{DB: db},
		Units:               UnitModel{DB: db},
		TowerOptions:        TowerOptionModel{DB: db},
		Invitations:         InvitationModel{DB: db},
		BeamColumnModules:   BeamColumnModuleModel{DB: db},
		ConcreteWallModules: ConcreteWallModuleModel{DB: db},
	}
}
