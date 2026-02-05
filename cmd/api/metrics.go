package main

import (
	"expvar"
	"fmt"
	"net/http"
)

func (app *application) metricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	w.Write([]byte("{\n"))

	first := true
	expvar.Do(func(kv expvar.KeyValue) {
		if kv.Key == "cmdline" {
			return
		}

		if !first {
			w.Write([]byte(",\n"))
		}
		first = false

		fmt.Fprintf(w, "%q: %s", kv.Key, kv.Value)
	})

	w.Write([]byte("\n}\n"))
}
