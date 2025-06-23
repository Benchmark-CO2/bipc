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

	router.Handler(http.MethodGet, "/v1/metrics", expvar.Handler()) // restrict access
	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/users", app.requireAuthenticatedUser(app.updateUserHandler))
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/password", app.updateUserPasswordHandler)

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/activation", app.createActivationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/password-reset", app.createPasswordResetTokenHandler)

	router.HandlerFunc(http.MethodPost, "/v1/projects", app.requireActivatedUser(app.createProjectHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects", app.requireAuthenticatedUser(app.listProjectsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/projects/:projectID", app.requirePermission("project:view", app.showProjectHandler))
	router.HandlerFunc(http.MethodPatch, "/v1/projects/:projectID", app.requirePermission("project:edit", app.updateProjectHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/projects/:projectID", app.requirePermission("project:owner", app.deleteProjectHandler))

	router.HandlerFunc(http.MethodGet, "/v1/presigned-urls", app.presignedURLHandler)

	router.HandlerFunc(http.MethodPost, "/v1/module", app.createModuleHandler)

	return app.metrics(app.recoverPanic(app.commonHeaders(app.enableCORS(app.rateLimit(app.authenticate(router))))))
}
