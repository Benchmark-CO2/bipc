package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
)

var corsHeaderKeys = []string{
	"Access-Control-Allow-Origin",
	"Access-Control-Allow-Methods",
	"Access-Control-Allow-Headers",
	"Access-Control-Allow-Credentials",
	"Access-Control-Expose-Headers",
	"Access-Control-Max-Age",
}

var ifcPasswordEndpoints = []struct {
	method  string
	prefix  string
}{
	{http.MethodPost, "/request/"},
	{http.MethodPost, "/fallbacks/create"},
}

var ifcAdminEndpoints = []struct {
	method  string
	prefix  string
}{
	{http.MethodPost, "/fallbacks/create"},
}

func requiresIfcPassword(method, path string) bool {
	for _, e := range ifcPasswordEndpoints {
		if method == e.method && strings.HasPrefix(path, e.prefix) {
			return true
		}
	}
	return false
}

func requiresIfcAdmin(method, path string) bool {
	for _, e := range ifcAdminEndpoints {
		if method == e.method && strings.HasPrefix(path, e.prefix) {
			return true
		}
	}
	return false
}

func stripUpstreamCORSHeaders(h http.Header) {
	for _, k := range corsHeaderKeys {
		h.Del(k)
	}
}

func (app *application) newServiceProxy() *httputil.ReverseProxy {
	target, err := url.Parse(app.config.ifcURL)
	if err != nil {
		log.Fatal(err)
	}

	return &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.Out.Header.Set("Authorization", "Bearer "+app.config.ifcSecret)

			if requiresIfcPassword(r.In.Method, r.Out.URL.Path) {
				q := r.Out.URL.Query()
				q.Set("password", app.config.ifcSecret)
				r.Out.URL.RawQuery = q.Encode()
			}
		},
		ModifyResponse: func(resp *http.Response) error {
			stripUpstreamCORSHeaders(resp.Header)
			return nil
		},
	}
}

func (app *application) proxyHandler(proxy *httputil.ReverseProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		ps := httprouter.ParamsFromContext(r.Context())
		path := ps.ByName("path")
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		r.URL.Path = path

		if requiresIfcAdmin(r.Method, path) {
			user := app.contextGetUser(r)
			if user.Type != "admin" {
				app.notPermittedResponse(w, r)
				return
			}
		}

		proxy.ServeHTTP(w, r)
	}
}
