package assets

import _ "embed"

//go:embed images/logo.png
var Logo []byte

//go:embed fonts/Inter-Regular.ttf
var InterRegular []byte

//go:embed fonts/Inter-Bold.ttf
var InterBold []byte

//go:embed fonts/Inter-Italic.ttf
var InterItalic []byte

//go:embed fonts/Inter-BoldItalic.ttf
var InterBoldItalic []byte
