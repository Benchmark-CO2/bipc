package main

import (
	"bytes"
	_ "embed"
	"net/http"

	"github.com/go-echarts/go-echarts/v2/charts"
	"github.com/go-echarts/go-echarts/v2/opts"
)

//go:embed geojs-100-mun.json
var brazilGeoJSON string

const brazilMapName = "Brazil"

func (app *application) brazilChartHandler(w http.ResponseWriter, r *http.Request) {
	m := charts.NewMap()
	m.RegisterMapType(brazilMapName)

	m.SetGlobalOptions(
		charts.WithInitializationOpts(opts.Initialization{
			PageTitle: "Mapa do Brasil",
			Width:     "100vw",
			Height:    "100vh",
			Renderer:  "canvas",
		}),
		charts.WithTitleOpts(opts.Title{
			Title:    "Mapa do Brasil",
			Subtitle: "Municípios",
			Left:     "center",
		}),
		charts.WithTooltipOpts(opts.Tooltip{
			Show:      opts.Bool(true),
			Trigger:   "item",
			Formatter: "{b}",
		}),
		charts.WithVisualMapOpts(opts.VisualMap{
			Calculable: opts.Bool(true),
			Min:        0,
			Max:        100,
			InRange:    &opts.VisualMapInRange{Color: []string{"#e0ffff", "#006edd"}},
		}),
		charts.WithGeoComponentOpts(opts.GeoComponent{
			Map:  brazilMapName,
			Roam: opts.Bool(true), // zoom + pan

		}),
	)

	// Empty data set: only renders the geographical boundaries.
	m.AddSeries("Brasil", []opts.MapData{}).
		SetSeriesOptions(
			charts.WithLabelOpts(opts.Label{Show: opts.Bool(false)}),
			charts.WithItemStyleOpts(opts.ItemStyle{
				BorderColor: "#444",
				BorderWidth: 0.3,
				Color:       "#f5f5f5",
			}),
		)

	// Render the chart to a buffer first so we can inject the GeoJSON
	// registration script before echarts.init runs.
	var buf bytes.Buffer
	if err := m.Render(&buf); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	registerScript := []byte("<script type=\"text/javascript\">\n" +
		"echarts.registerMap('" + brazilMapName + "', " + brazilGeoJSON + ");\n" +
		"</script>\n")

	out := bytes.Replace(
		buf.Bytes(),
		[]byte("<script type=\"text/javascript\">\n    \"use strict\";"),
		append(registerScript, []byte("<script type=\"text/javascript\">\n    \"use strict\";")...),
		1,
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if _, err := w.Write(out); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
