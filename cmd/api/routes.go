package main

import (
	"expvar"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/Benchmark-CO2/bipc/web"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)
	router.NotFound = app.notFound(http.FileServer(http.FS(web.DistFs)))

	router.Handler(http.MethodGet, "/v1/metrics", expvar.Handler())
	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/users", app.requireAuthenticatedUser(app.updateUserHandler))
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/password", app.updateUserPasswordHandler)
	router.HandlerFunc(http.MethodGet, "/v1/users/collaborators", app.requireAuthenticatedUser(app.userCollaboratorsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/users/pending-invitations", app.requireAuthenticatedUser(app.pendingInvitationsHandler))
	router.HandlerFunc(http.MethodPut, "/v1/users/reply/:invitationID", app.requireActivatedUser(app.replyInvitationHandler))

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/activation", app.createActivationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/password-reset", app.createPasswordResetTokenHandler)

	router.HandlerFunc(http.MethodPost, "/v1/projects", app.requireActivatedUser(app.createProjectHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects", app.requireAuthenticatedUser(app.listProjectsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID", app.showProjectHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID", app.updateProjectHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID", app.deleteProjectHandler)
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/invitations", app.inviteUserHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/collaborators/:collaboratorID", app.removeCollaboratorHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/pending-invitations", app.projectPendingInvitationsHandler)

	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/roles", app.createRoleHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/roles/:roleID", app.updateRoleHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/roles/:roleID", app.deleteRoleHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/collaborators", app.listCollaboratorsHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/user/permissions", app.listUserPermissionsHandler)

	// todo
	// pending invitations project
	// cancel invitation

	// ----------------------------------------------------------------------------------------------------------------------------------

	router.HandlerFunc(http.MethodPost, "/v1/projects-upload", app.requireActivatedUser(app.createProjectsFromCSVHandler))
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units", app.createUnitHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID", app.readUnitHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID", app.updateUnitHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID", app.deleteUnitHandler)

	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/roles/:roleID/options", app.listTowerOptionsHandler)
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/roles/:roleID/options", app.createTowerOptionHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/options/:optionID", app.readTowerOptionHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID/options/:optionID", app.updateTowerOptionHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID/options/:optionID", app.deleteTowerOptionHandler)

	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/options/:optionID/modules", app.createModuleHandler)
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/options/:optionID/modules/:moduleID", app.readModuleHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID/options/:optionID/modules/:moduleID", app.deleteModuleHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID/options/:optionID/modules/:moduleID", app.updateModuleHandler)

	router.HandlerFunc(http.MethodGet, "/v1/benchmark/floors", app.getFloorsBenchmarkHandler)
	router.HandlerFunc(http.MethodGet, "/v1/benchmark/units", app.getUnitsBenchmarkHandler)
	router.HandlerFunc(http.MethodGet, "/v1/benchmark/projects", app.getProjectsBenchmarkHandler)

	return app.metrics(app.recoverPanic(app.commonHeaders(app.enableCORS(app.rateLimit(app.authenticate(router))))))
}
