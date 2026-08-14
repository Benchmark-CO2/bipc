package assets

import (
	"embed"
)

//go:embed fonts/RobotoFlex-VariableFont.ttf
var RobotoFlex []byte

//go:embed pdfs/1A_resized.pdf
var PDF1A []byte

//go:embed svgs/logo_color_full.svg
var LogoColorFull string

//go:embed svgs/qrcode.svg
var QRCode string

//go:embed "templates"
var TemplateFS embed.FS

//go:embed cert.pem
var CertPEM []byte

//go:embed key.pem
var KeyPEM []byte
