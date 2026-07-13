package assets

import (
	"embed"
)

//go:embed fonts/RobotoFlex-VariableFont.ttf
var RobotoFlex []byte

//go:embed svg/logo_color_full.svg
var LogoColorFull string

//go:embed js/d3.min.js
var D3Script string

//go:embed js/d3-regression.min.js
var D3RegressionScript string

//go:embed "templates"
var TemplateFS embed.FS
