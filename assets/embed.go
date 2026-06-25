package assets

import (
	"embed"
)

//go:embed fonts/RobotoFlex-VariableFont.ttf
var RobotoFlex []byte

//go:embed js/d3.min.js
var D3Script string

//go:embed "templates"
var TemplateFS embed.FS
