package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
	ErrNoRowsDeleted  = errors.New("no rows deleted")

	ErrInvalidTowerOptionID = errors.New("tower_option_id does not exist or is invalid")
	ErrInvalidFloorID       = errors.New("one or more floor_ids are invalid or do not exist")
	ErrInvalidUnitID        = errors.New("unit_id does not exist or is invalid")
	ErrUnitIsNotTower       = errors.New("the specified unit is not a tower")
)

type Models struct {
	Users                    UserModel
	Tokens                   TokenModel
	Roles                    RoleModel
	Projects                 ProjectModel
	Units                    UnitModel
	TowerOptions             TowerOptionModel
	Invitations              InvitationModel
	BeamColumnModules        BeamColumnModuleModel
	StructuralMasonryModules StructuralMasonryModuleModel
	ConcreteWallModules      ConcreteWallModuleModel
	Benchmark                BenchmarkModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Users:                    UserModel{DB: db},
		Tokens:                   TokenModel{DB: db},
		Roles:                    RoleModel{DB: db},
		Projects:                 ProjectModel{DB: db},
		Units:                    UnitModel{DB: db},
		TowerOptions:             TowerOptionModel{DB: db},
		Invitations:              InvitationModel{DB: db},
		BeamColumnModules:        BeamColumnModuleModel{DB: db},
		StructuralMasonryModules: StructuralMasonryModuleModel{DB: db},
		ConcreteWallModules:      ConcreteWallModuleModel{DB: db},
		Benchmark:                BenchmarkModel{DB: db},
	}
}
