package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/julienschmidt/httprouter"
)

func (app *application) newServiceProxy() *httputil.ReverseProxy {
	target, err := url.Parse(app.config.ifcURL)
	if err != nil {
		log.Fatal(err)
	}

	return &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.Out.Header.Set("Authorization", "Bearer "+app.config.ifcSecret)
		},
	}
}

func (app *application) proxyHandler(proxy *httputil.ReverseProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		ps := httprouter.ParamsFromContext(r.Context())
		r.URL.Path = ps.ByName("path")

		proxy.ServeHTTP(w, r)
	}
}
