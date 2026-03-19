package main

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/data"
	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

func (app *application) createProjectHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name         string  `json:"name"`
		CEP          *string `json:"cep"`
		State        string  `json:"state"`
		City         string  `json:"city"`
		Neighborhood *string `json:"neighborhood"`
		Street       *string `json:"street"`
		Number       *string `json:"number"`
		Phase        string  `json:"phase"`
		Description  *string `json:"description"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project := &data.Project{
		Name:         input.Name,
		CEP:          input.CEP,
		State:        strings.ToUpper(input.State),
		City:         input.City,
		Neighborhood: input.Neighborhood,
		Street:       input.Street,
		Number:       input.Number,
		Phase:        input.Phase,
		Description:  input.Description,
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	projectID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	project.ID = projectID

	err = app.models.Projects.Insert(project, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrInvalidProjectID):
			v.AddError("projects(id)", "the provided projectID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidUserID):
			v.AddError("users(id)", "the provided userID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserProject):
			v.AddError("users_projects", "user is already associated with the project")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRoleName):
			v.AddError("roles(name)", "you already have a role with this name")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidPermissionID):
			v.AddError("permissions(id)", "the provided permissionID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrInvalidRoleID):
			v.AddError("roles(id)", "the provided roleID does not exist")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateRolePermission):
			v.AddError("roles_permissions", "role already has permission associated")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUserRole):
			v.AddError("users_roles", "user already has role associated")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	headers := make(http.Header)
	headers.Set("Location", fmt.Sprintf("/project/%s", project.ID))

	err = app.writeJSON(w, http.StatusCreated, envelope{"project": project}, headers)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) showProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	project, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) updateProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	projectWithUnits, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	project := &projectWithUnits.Project

	var input struct {
		Name         *string `json:"name"`
		CEP          *string `json:"cep"`
		State        *string `json:"state"`
		City         *string `json:"city"`
		Neighborhood *string `json:"neighborhood"`
		Street       *string `json:"street"`
		Number       *string `json:"number"`
		Phase        *string `json:"phase"`
		Description  *string `json:"description"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if input.Name != nil {
		project.Name = *input.Name
	}

	if input.CEP != nil {
		project.CEP = input.CEP
	}

	if input.State != nil {
		project.State = strings.ToUpper(*input.State)
	}

	if input.City != nil {
		project.City = *input.City
	}

	if input.Neighborhood != nil {
		project.Neighborhood = input.Neighborhood
	}

	if input.Street != nil {
		project.Street = input.Street
	}

	if input.Number != nil {
		project.Number = input.Number
	}

	if input.Phase != nil {
		project.Phase = *input.Phase
	}

	if input.Description != nil {
		project.Description = input.Description
	}

	v := validator.New()

	if data.ValidateProject(v, project); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.Update(project)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"project": project}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	err := app.models.Projects.Delete(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "project successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listProjectsHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	var input struct {
		Name string `json:"name"`
		data.Filters
	}

	v := validator.New()

	qs := r.URL.Query()

	input.Name = app.readString(qs, "name", "")

	input.Filters.Page = app.readInt(qs, "page", 1, v)
	input.Filters.PageSize = app.readInt(qs, "page_size", 10, v)
	input.Filters.Sort = app.readString(qs, "sort", "-id")
	input.Filters.SortSafelist = []string{
		"id",
		"created_at",
		"name",
		"state",
		"city",
		"phase",
		"-id",
		"-created_at",
		"-name",
		"-state",
		"-city",
		"-phase",
	}

	if data.ValidateFilters(v, input.Filters); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	projects, metadata, err := app.models.Projects.GetAll(input.Name, input.Filters, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"projects": projects, "metadata": metadata}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) inviteUserHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	projectID, _ := app.readUUIDParam(r, "projectID")

	var input struct {
		Email string `json:"email"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateEmail(v, input.Email); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	userInvited, err := app.models.Users.GetByEmail(input.Email)
	if err != nil && !errors.Is(err, data.ErrRecordNotFound) {
		app.serverErrorResponse(w, r, err)
		return
	}

	if userInvited != nil {
		isMember, err := app.models.Projects.IsUserInProject(userInvited.ID, projectID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		if isMember {
			v.AddError("email", "this user is already a member of the project")
			app.failedValidationResponse(w, r, v.Errors)
			return
		}
	}

	invitation := &data.Invitation{
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		InviterID: user.ID,
		ProjectID: projectID,
		Email:     input.Email,
	}

	err = app.models.Invitations.Insert(invitation)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicatePendingInvitation):
			v.AddError("email", "a pending invitation already exists for this email in this project")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.background(func() {
		project, err := app.models.Projects.GetByID(projectID)
		if err != nil {
			app.logger.Error(err.Error())
			return
		}

		data := map[string]any{
			"projectName": project.Name,
			"inviterName": user.Name,
			"url":         app.config.url,
		}

		err = app.mailer.Send(input.Email, "invitation.gohtml", data)
		if err != nil {
			app.logger.Error(err.Error())
		}
	})

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "invitation sent successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) removeCollaboratorHandler(w http.ResponseWriter, r *http.Request) {

	projectID, _ := app.readUUIDParam(r, "projectID")

	collaboratorID, err := app.readUUIDParam(r, "collaboratorID")
	if err != nil {
		v := validator.New()
		v.AddError("url", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	permissions, err := app.models.Roles.GetPermissionsForUser(collaboratorID, projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if permissions.Include("*:*") {
		v := validator.New()
		v.AddError("user_id", "cannot remove a user with full permissions from the project")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Projects.RemoveUser(projectID, collaboratorID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "user successfully removed from project"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) projectPendingInvitationsHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")

	invitations, err := app.models.Invitations.GetPendingByProject(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"invitations": invitations}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteInvitationHandler(w http.ResponseWriter, r *http.Request) {
	projectID, _ := app.readUUIDParam(r, "projectID")
	invitationID, err := app.readUUIDParam(r, "invitationID")
	if err != nil {
		v := validator.New()
		v.AddError("url", err.Error())
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Invitations.Delete(invitationID, projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "invitation deleted successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) duplicateProjectHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	user := app.contextGetUser(r)

	originalProject, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	newProjectID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	duplicatedProject := &data.Project{
		ID:           newProjectID,
		Name:         generateDuplicateName(originalProject.Name),
		CEP:          originalProject.CEP,
		State:        originalProject.State,
		City:         originalProject.City,
		Neighborhood: originalProject.Neighborhood,
		Street:       originalProject.Street,
		Number:       originalProject.Number,
		Phase:        originalProject.Phase,
		Description:  originalProject.Description,
		Benchmark:    false,
	}

	err = app.models.Projects.Insert(duplicatedProject, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Get all roles with members and permissions from the original project
	originalCollaborators, err := app.models.Roles.Collaborators(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Get the new project to retrieve the auto-created admin role
	newProject, err := app.models.Projects.GetByID(newProjectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a map to track role ID mappings: oldRoleID -> newRoleID
	roleIDMap := make(map[uuid.UUID]uuid.UUID)

	var adminRoleID uuid.UUID
	for _, role := range newProject.Roles {
		if role.Name == "Administrador" && role.IsProtected {
			adminRoleID = role.ID
			for _, origRole := range originalCollaborators.Roles {
				if origRole.Name == "Administrador" && origRole.IsProtected {
					roleIDMap[origRole.ID] = role.ID
					break
				}
			}
			break
		}
	}

	// Duplicate all other roles (non-Administrador) with their members and permissions
	for _, originalRole := range originalCollaborators.Roles {
		if originalRole.Name == "Administrador" && originalRole.IsProtected {
			continue
		}

		newRoleID, err := uuid.NewV7()
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		newRole := &data.RoleWithUsersPermissions{
			Role: data.Role{
				ID:          newRoleID,
				ProjectID:   newProjectID,
				Name:        originalRole.Name,
				Description: originalRole.Description,
				Simulation:  originalRole.Simulation,
				IsProtected: originalRole.IsProtected,
			},
			PermissionsIDs: originalRole.PermissionsIDs,
			UsersIDs:       originalRole.UsersIDs,
		}

		err = app.models.Roles.Insert(newRole)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		roleIDMap[originalRole.ID] = newRoleID
	}

	for _, unit := range originalProject.Units {
		originalUnit, err := app.models.Units.GetByID(unit.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		_, err = app.duplicateUnit(
			originalUnit,
			newProjectID,
			&originalUnit.Name,
			roleIDMap,
			adminRoleID,
		)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	duplicatedProjectWithUnits, err := app.models.Projects.GetByID(newProjectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"project": duplicatedProjectWithUnits}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) duplicateProjectToUserHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	targetUserID, err := app.readUUIDParam(r, "targetUserID")
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	originalProject, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	newProjectID, err := uuid.NewV7()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	duplicatedProject := &data.Project{
		ID:           newProjectID,
		Name:         generateDuplicateName(originalProject.Name),
		CEP:          originalProject.CEP,
		State:        originalProject.State,
		City:         originalProject.City,
		Neighborhood: originalProject.Neighborhood,
		Street:       originalProject.Street,
		Number:       originalProject.Number,
		Phase:        originalProject.Phase,
		Description:  originalProject.Description,
		Benchmark:    false,
	}

	// Create project for target user
	err = app.models.Projects.Insert(duplicatedProject, targetUserID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Get all roles with members and permissions from the original project
	originalCollaborators, err := app.models.Roles.Collaborators(projectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Get the new project to retrieve the auto-created admin role
	newProject, err := app.models.Projects.GetByID(newProjectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a map to track role ID mappings: oldRoleID -> newRoleID
	roleIDMap := make(map[uuid.UUID]uuid.UUID)

	var adminRoleID uuid.UUID
	for _, role := range newProject.Roles {
		if role.Name == "Administrador" && role.IsProtected {
			adminRoleID = role.ID
			for _, origRole := range originalCollaborators.Roles {
				if origRole.Name == "Administrador" && origRole.IsProtected {
					roleIDMap[origRole.ID] = role.ID
					break
				}
			}
			break
		}
	}

	// Duplicate all other roles with only the target user as member
	for _, originalRole := range originalCollaborators.Roles {
		if originalRole.Name == "Administrador" && originalRole.IsProtected {
			continue
		}

		newRoleID, err := uuid.NewV7()
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		newRole := &data.RoleWithUsersPermissions{
			Role: data.Role{
				ID:          newRoleID,
				ProjectID:   newProjectID,
				Name:        originalRole.Name,
				Description: originalRole.Description,
				Simulation:  originalRole.Simulation,
				IsProtected: originalRole.IsProtected,
			},
			PermissionsIDs: originalRole.PermissionsIDs,
			UsersIDs:       []uuid.UUID{targetUserID}, // Only target user
		}

		err = app.models.Roles.Insert(newRole)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		roleIDMap[originalRole.ID] = newRoleID
	}

	for _, unit := range originalProject.Units {
		originalUnit, err := app.models.Units.GetByID(unit.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		_, err = app.duplicateUnit(
			originalUnit,
			newProjectID,
			&originalUnit.Name,
			roleIDMap,
			adminRoleID,
		)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	duplicatedProjectWithUnits, err := app.models.Projects.GetByID(newProjectID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"project": duplicatedProjectWithUnits}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
