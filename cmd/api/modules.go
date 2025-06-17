package main

import (
	"io"
	"net/http"

	"github.com/Benchmark-CO2/bip/internal/modules"
)

func (app *application) createModuleHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer r.Body.Close()

	module, err := modules.UnmarshalModuleStructure(body)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"teste": module}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}