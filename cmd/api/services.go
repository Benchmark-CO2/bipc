package main

import (
	"errors"
	"fmt"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

// ValidationError carries field-level validation errors across the service boundary,
// decoupling business rules from HTTP response formatting.
type ValidationError struct {
	Errors map[string]string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error: %v", e.Errors)
}

// insertProject validates the project, assigns a new UUID, and persists it.
// Database sentinel errors are translated into *ValidationError so callers
// don't need to import data-layer error types.
func (app *application) insertProject(project *data.Project, userID uuid.UUID) error {
	project.State = strings.ToUpper(project.State)

	v := validator.New()
	if data.ValidateProject(v, project); !v.Valid() {
		return &ValidationError{Errors: v.Errors}
	}

	if project.ID == uuid.Nil {
		projectID, err := uuid.NewV7()
		if err != nil {
			return err
		}
		project.ID = projectID
	}

	err := app.models.Projects.Insert(project, userID)
	if err != nil {
		v := validator.New()
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			v.AddError("projects(id)", "the provided projectID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users(id)", "the provided userID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateUserProject):
			v.AddError("users_projects", "user is already associated with the project")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("roles(name)", "you already have a role with this name")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions(id)", "the provided permissionID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrInvalidRoleID):
			v.AddError("roles(id)", "the provided roleID does not exist")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateRolePermission):
			v.AddError("roles_permissions", "role already has permission associated")
			return &ValidationError{Errors: v.Errors}
		case errors.Is(err, data.ErrDuplicateUserRole):
			v.AddError("users_roles", "user already has role associated")
			return &ValidationError{Errors: v.Errors}
		default:
			return err
		}
	}

	return nil
}
