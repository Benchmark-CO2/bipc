package modules

import (
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/validator"
)

var allowedSlabTypes = []string{
	// Feita em obra
	"solid",              // Laje macica (concreto armado) com vigas ou paredes estruturais
	"ribbed",             // Laje nervurada (unidirecional, bidirecional / tipo waffle)
	"mushroom_solid",     // Laje macica (concreto armado) cogumelo (com capitel)
	"mushroom_ribbed",    // Laje nervurada (unidirecional, bidirecional / tipo waffle) cogumelo (com capitel)
	"flat",               // Laje plana / sem vigas
	"band_beam",          // Laje com vigas-faixa
	"pt_solid",           // Laje protendida macica
	"pt_ribbed",          // Laje protendida nervurada
	"pt_mushroom_solid",  // Laje protendida macica cogumelo (com capitel)
	"pt_mushroom_ribbed", // Laje protendida nervurada cogumelo (com capitel)
	"pt_flat",            // Laje plana protendida / sem vigas
	"pt_band_beam",       // Laje protendida com vigas-faixa

	// Semi pre-fabricada ou pre-fabricada
	"trussed",        // Laje trelicada (vigota trelicada + enchimento + capa)
	"joist",          // Laje de vigotas pre-moldadas (viga T/invertida etc. + enchimento + capa)
	"filigree",       // Pre-laje / laje filigrana (placa fina pre-moldada + armaduras + capa)
	"hollow_core",    // Laje alveolar (protendida)
	"precast_solid",  // Painel macico pre-moldado (placa macica)
	"precast_ribbed", // Paineis nervurados pre-moldados (T, TT e variacoes industriais)
	"pt_precast",     // Lajes protendidas pre-moldadas (macicas ou com alveolos, conforme sistema)
}

func normalizeSlabType(slabType *string) *string {
	if slabType == nil {
		return nil
	}

	normalized := strings.ToLower(strings.TrimSpace(*slabType))
	if normalized == "" {
		return nil
	}

	return &normalized
}

func validateSlabType(v *validator.Validator, slabType *string) {
	normalized := normalizeSlabType(slabType)
	if normalized == nil {
		return
	}

	v.Check(
		validator.PermittedValue(*normalized, allowedSlabTypes...),
		"slab_type",
		"must be one of: "+strings.Join(allowedSlabTypes, ", "),
	)
}
