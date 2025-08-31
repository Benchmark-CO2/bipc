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
	router.HandlerFunc(http.MethodGet, "/v1/presigned-urls", app.presignedURLHandler)

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
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID", app.requirePermission("project:view", app.showProjectHandler))
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID", app.requirePermission("project:edit", app.updateProjectHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID", app.requirePermission("project:owner", app.deleteProjectHandler))
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/invite", app.requirePermission("project:owner", app.inviteUserHandler))

	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units", app.requirePermission("project:edit", app.createUnitHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID", app.requirePermission("project:view", app.readUnitHandler))
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID", app.requirePermission("project:edit", app.updateUnitHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID", app.requirePermission("project:edit", app.deleteUnitHandler))

	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/tower-options", app.requirePermission("project:view", app.listTowerOptionsHandler))
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/tower-options", app.requirePermission("project:edit", app.createTowerOptionHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/tower-options/:optionID", app.requirePermission("project:view", app.readTowerOptionHandler))
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID/tower-options/:optionID", app.requirePermission("project:edit", app.updateTowerOptionHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID/tower-options/:optionID", app.requirePermission("project:edit", app.deleteTowerOptionHandler))

	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/modules", app.requirePermission("project:edit" ,app.createModuleHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID/units/:unitID/modules/:moduleID", app.requirePermission("project:view", app.readModuleHandler))
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID/units/:unitID/modules/:moduleID", app.requirePermission("project:edit", app.updateModuleHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID/units/:unitID/modules/:moduleID", app.requirePermission("project:edit", app.deleteModuleHandler))

	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/modules/:moduleID", app.requirePermission("project:edit" , app.createVersionHandler))
	router.HandlerFunc(http.MethodPost, "/v1/projects/:projectID/units/:unitID/modules/:moduleID/version", app.requirePermission("project:edit", app.updateModuleInUseHandler))

	return app.metrics(app.recoverPanic(app.commonHeaders(app.enableCORS(app.rateLimit(app.authenticate(router))))))
}
