package tqshtm

import (
	"strings"
)

var tqsCodeToBlockType = map[string]string{
	"P2015":   "meio (14x19x19)",
	"P3515":   "amarração L (14x19x34)",
	"P4015":   "inteiro (14x19x39)",
	"P5515":   "amarração T (14x19x54)",
	"PCB2015": "meia canaleta (14x19x19)",
	"PCB4015": "canaleta inteira (14x19x39)",
	"PCN2015": "meia canaleta (14x19x19)",
	"PCN4015": "canaleta inteira (14x19x39)",
	"PJT2015": "meia canaleta (14x19x19)",
	"PVR15":   "meio (14x19x19)",
}

func normalizeBlockCode(code string) string {
	code = strings.ToUpper(strings.TrimSpace(code))
	if mapped, ok := tqsCodeToBlockType[code]; ok {
		return mapped
	}
	return ""
}
