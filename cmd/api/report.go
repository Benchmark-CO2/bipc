package main

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/johnfercher/maroto/v2/pkg/components/code"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/line"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	marotocfg "github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/orientation"
	"github.com/johnfercher/maroto/v2/pkg/core/entity"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"github.com/johnfercher/maroto/v2/pkg/core"

	"github.com/johnfercher/maroto/v2"

	"github.com/Benchmark-CO2/bipc/assets"

	"github.com/Benchmark-CO2/bipc/internal/data"
)

func (app *application) reportHandler(w http.ResponseWriter, r *http.Request) {
	projectID, err := app.readUUIDParam(r, "projectID")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	project, err := app.models.Projects.GetByID(projectID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	err = r.ParseMultipartForm(256 << 10)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	co2, _, err := r.FormFile("co2")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer co2.Close()

	energy, _, err := r.FormFile("energy")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	defer energy.Close()

	co2Bytes, err := io.ReadAll(co2)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	energyBytes, err := io.ReadAll(energy)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	m, err := GetMaroto(project, co2Bytes, energyBytes)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	document, err := m.Generate()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="relatorio.pdf"`)
	w.Write(document.GetBytes())
}

func GetMaroto(project *data.ProjectWithUnits, co2Bytes, energyBytes []byte) (core.Maroto, error) {
	customFonts := []*entity.CustomFont{
		{Family: "Inter", Style: fontstyle.Normal, Bytes: assets.InterRegular},
		{Family: "Inter", Style: fontstyle.Bold, Bytes: assets.InterBold},
		{Family: "Inter", Style: fontstyle.Italic, Bytes: assets.InterItalic},
		{Family: "Inter", Style: fontstyle.BoldItalic, Bytes: assets.InterBoldItalic},
	}

	pageNumber := props.PageNumber{
		Pattern: "Página {current} de {total}",
		Place:   props.Bottom,
		Style:   fontstyle.Bold,
		Size:    6,
		Color:   getTitleColor(),
	}

	cfg := marotocfg.NewBuilder().
		//WithDebug(true).
		WithCustomFonts(customFonts).
		WithDefaultFont(&props.Font{Family: "Inter", Style: fontstyle.Normal, Size: 12, Color: getBlackColor()}).
		WithPageNumber(pageNumber).
		WithMaxGridSize(48).
		Build()

	m := maroto.New(cfg)

	err := m.RegisterHeader(getPageHeader())
	if err != nil {
		return nil, err
	}

	m.AddRow(5)

	m.AddAutoRow(
		col.New(48).Add(
			text.New("Dados do projeto", getTitleStyle()),
			text.New("Informações fundamentais e características de identificação do projeto, incluindo localização, dimensões principais e fase do projeto. ", props.Text{
				Top:  6.5,
				Size: 6,
			}),
		),
	)

	m.AddRow(2.5)

	m.AddAutoRow(
		text.NewCol(7, "SIOPI", getLabelStyle()),
		col.New(1),
		text.NewCol(7, "Identificador do projeto (APF)", getLabelStyle()),
	)

	m.AddAutoRow(
		text.NewCol(7, safe(project.Siop), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(7, safe(project.Apf), getValueStyle()).WithStyle(getBorderStyle()),
	)

	m.AddRow(2)

	m.AddAutoRow(
		text.NewCol(10, "Nome do projeto", getLabelStyle()),
		col.New(1),
		text.NewCol(4, "Tipo do edifício", getLabelStyle()),
		col.New(1),
		text.NewCol(4, "Tipo do uso", getLabelStyle()),
		col.New(1),
		text.NewCol(7, "Fase do projeto", getLabelStyle()),
		col.New(1),
		text.NewCol(5, "Número de UH total", getLabelStyle()),
		col.New(1),
		text.NewCol(4, "Número de UC", getLabelStyle()),
		col.New(1),
		text.NewCol(5, "Área const. UC (m²)", getLabelStyle()),
	)

	m.AddAutoRow(
		text.NewCol(10, truncate(project.Name, 36), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(4, "", getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(4, "", getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(7, data.PhaseMap[project.Phase], getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(5, "", getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(4, "", getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(5, "", getValueStyle()).WithStyle(getBorderStyle()),
	)

	m.AddRow(2)

	m.AddAutoRow(
		text.NewCol(5, "Área const. total (m²)", getLabelStyle()),
	)

	m.AddAutoRow(
		text.NewCol(5, fmt.Sprintf("%.2f", project.Area), getValueStyle()).WithStyle(getBorderStyle()),
	)

	m.AddRow(2)

	m.AddAutoRow(
		text.NewCol(12, "Rua / Avenida", getLabelStyle()),
		col.New(1),
		text.NewCol(4, "CEP", getLabelStyle()),
		col.New(1),
		text.NewCol(2, "Número", getLabelStyle()),
		col.New(1),
		text.NewCol(12, "Bairro", getLabelStyle()),
		col.New(1),
		text.NewCol(11, "Cidade", getLabelStyle()),
		col.New(1),
		text.NewCol(2, "Estado", getLabelStyle()),
	)

	m.AddAutoRow(
		text.NewCol(12, truncate(safe(project.Street), 45), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(4, safe(project.CEP), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(2, safe(project.Number), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(12, truncate(safe(project.Neighborhood), 45), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(11, truncate(project.City, 39), getValueStyle()).WithStyle(getBorderStyle()),
		col.New(1),
		text.NewCol(2, project.State, getValueStyle()).WithStyle(getBorderStyle()),
	)

	m.AddRow(5)

	m.AddAutoRow(
		col.New(48).Add(
			text.New("Resumo dos resultados do Benchmark", getTitleStyle()),
			text.New("O Benchmark compara valores relativos (por m²) dos projetos e os classifica, do melhor ao pior (fração acumulada), atribuindo uma classe a cada quartis, com “A” para os 25% melhores. Destaca os 50% melhores como linha de base e os 5% melhores, utilizados para calcular o potencial de mitigação do projeto (P). O potencial de mitigação da construção (C) é o melhor cenário, corresponde à mitigação do projeto calculado com o índice do melhor fornecedor. O risco de menor mitigação (R) é o pior cenário, corresponde ao cálculo feito com o indice do pior fornecedor. O valor de referencia  (V) corresponde à média da diferença entre o C e o R do 5% e do projeto analisado.", props.Text{
				Size: 6,
				Top:  6.5,
			}),
			text.New("Vn = (C5% - Cn) + (R5% - Rn) / 2", props.Text{
				Size:  6,
				Top:   12.75,
				Left:  118.5,
				Style: fontstyle.BoldItalic,
			}),
		),
	)

	m.AddRow(2.5)

	m.AddAutoRow(
		col.New(23).Add(
			text.New("Emissões de CO₂", getTitleStyle()),
		),
		line.NewCol(2, getDividerStyle()),
		col.New(23).Add(
			text.New("Consumo de energia", getTitleStyle()),
		),
	)

	m.AddRow(2,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddAutoRow(
		col.New(23).Add(
			text.New("Total de Emissões de Carbono do edifício (kg CO2)", getSubtitleStyle()),
		),
		line.NewCol(2, getDividerStyle()),
		col.New(23).Add(
			text.New("Consumo total de energia do edifício (mj)", getSubtitleStyle()),
		),
	)

	m.AddRow(3,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddAutoRow(
		col.New(7).Add(
			text.New("Melhor cenário (kg CO₂)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("128.577,25", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Melhor cenário (kg/m² CO₂)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("45,83", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Pior cenário(kg CO₂)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Pior cenário (kg/m² CO₂)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Valor de Ref. (kg CO₂)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Valor de Ref. (kg/m² CO₂)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
		line.NewCol(2, getDividerStyle()),
		col.New(7).Add(
			text.New("Melhor cenário (mj)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("128.577,25", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Melhor cenário (mj/m²)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("45,83", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Pior cenário (mj)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Pior cenário (mj/m²)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Valor de Ref. (mj)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Valor de Ref. (mj/m²)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
	)

	m.AddRow(6,
		line.NewCol(23, getDividerStyle(orientation.Horizontal)),
		line.NewCol(2, getDividerStyle()),
		line.NewCol(23, getDividerStyle(orientation.Horizontal)),
	)

	m.AddAutoRow(
		col.New(23).Add(
			text.New("Redução das Emissões de Carbono do edifício em relação à Linha de Base", props.Text{
				Style: fontstyle.Bold,
				Size:  7,
			}),
		),
		line.NewCol(2, getDividerStyle()),
		col.New(23).Add(
			text.New("Redução do consumo de energia do edifício em relação à Linha de Base", props.Text{
				Style: fontstyle.Bold,
				Size:  7,
			}),
		),
	)

	m.AddRow(3,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddAutoRow(
		col.New(7).Add(
			text.New("Melhor cenário (kg CO₂)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("128.577,25", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Melhor cenário (kg/m² CO₂)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("45,83", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Pior cenário(kg CO₂)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Pior cenário (kg/m² CO₂)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Redução total de CO₂ (kg)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Redução relativa (kg/m²)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
		line.NewCol(2, getDividerStyle()),
		col.New(7).Add(
			text.New("Melhor cenário (mj)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("128.577,25", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Melhor cenário (mj/m²)", props.Text{
				Size:  5.5,
				Color: getBlueColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("45,83", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Pior cenário (mj)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Pior cenário (mj/m²)", props.Text{
				Size:  5.5,
				Color: getRedColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(7).Add(
			text.New("Redução de energia (mj)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   1,
				Left:  1,
			}),
			text.New("211.205,95 ", props.Text{
				Size: 5.5,
				Top:  4,
				Left: 1,
			}),
			text.New("Redução relativa (mj/m²)", props.Text{
				Size:  5.5,
				Color: getGreenColor(),
				Top:   8,
				Left:  1,
			}),
			text.New("75,28", props.Text{
				Size:   5.5,
				Top:    11,
				Left:   1,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
	)

	m.AddRow(3,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddRow(65,
		image.NewFromBytesCol(23, co2Bytes, extension.Png),
		line.NewCol(2, getDividerStyle()),
		image.NewFromBytesCol(23, energyBytes, extension.Png),
	)

	m.AddRow(2,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddAutoRow(
		text.NewCol(23, "Linha de base (50% melhores projetos): C53, R86, V71; 5% melhores projetos: C25, R42, V33", props.Text{
			Size:  5,
			Color: getGrayColor(),
			Align: align.Right,
		}),
		line.NewCol(2, getDividerStyle()),
		text.NewCol(23, "Linha de base (50% melhores projetos): C26, R41, V18; 5% melhores projetos: C12, R20, V9", props.Text{
			Size:  5,
			Color: getGrayColor(),
			Align: align.Right,
		}),
	)

	m.AddRow(2,
		col.New(23),
		line.NewCol(2, getDividerStyle()),
		col.New(23),
	)

	m.AddAutoRow(
		col.New(1),
		col.New(3).Add(
			text.New("P", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getPurpleColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getPurpleColor())),
		col.New(1),
		col.New(3).Add(
			text.New("C", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getBlueColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(3).Add(
			text.New("V", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getGreenColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
		col.New(1),
		col.New(3).Add(
			text.New("R", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getRedColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(5).Add(
			text.New("B", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New("Classificação", props.Text{
				Size:  5.5,
				Top:   0.25,
				Left:  4,
				Style: fontstyle.Bold,
			}),
			text.New("N: 300 projetos", props.Text{
				Size:  5,
				Top:   2.25,
				Left:  4,
				Color: getGrayColor(),
			}),
		).WithStyle(&props.Cell{
			BackgroundColor: getClassificationColor("a"),
		}),
		line.NewCol(4, getDividerStyle()),
		col.New(3).Add(
			text.New("P", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getPurpleColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getPurpleColor())),
		col.New(1),
		col.New(3).Add(
			text.New("C", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getBlueColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getBlueColor())),
		col.New(1),
		col.New(3).Add(
			text.New("V", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getGreenColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getGreenColor())),
		col.New(1),
		col.New(3).Add(
			text.New("R", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Color:  getRedColor(),
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New(truncate("234.2342434", 9), props.Text{
				Size:   5.5,
				Top:    1.25,
				Left:   3,
				Bottom: 1.5,
			}),
		).WithStyle(getBorderStyle(getRedColor())),
		col.New(1),
		col.New(5).Add(
			text.New("B", props.Text{
				Size:   6,
				Style:  fontstyle.Bold,
				Top:    1,
				Left:   1,
				Bottom: 1.5,
			}),
			text.New("Classificação", props.Text{
				Size:  5.5,
				Top:   0.25,
				Left:  4,
				Style: fontstyle.Bold,
			}),
			text.New("N: 300 projetos", props.Text{
				Size:  5,
				Top:   2.25,
				Left:  4,
				Color: getGrayColor(),
			}),
		).WithStyle(&props.Cell{
			BackgroundColor: getClassificationColor("a"),
		}),
	)

	m.AddAutoRow(
		col.New(1),
		text.NewCol(3, "Kg/m2", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "Kg/m2", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "Kg/m2", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "Kg/m2", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(6),
		line.NewCol(4, getDividerStyle()),
		text.NewCol(3, "mj/m²", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "mj/m²", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "mj/m²", props.Text{
			Size:  4,
			Align: align.Center,
		}),
		col.New(1),
		text.NewCol(3, "mj/m²", props.Text{
			Size:  4,
			Align: align.Center,
		}),
	)

	m.AddRow(6,
		line.NewCol(23, getDividerStyle(orientation.Horizontal)),
		line.NewCol(2, getDividerStyle()),
		line.NewCol(23, getDividerStyle(orientation.Horizontal)),
	)

	return m, nil
}

func getPageHeader() core.Row {
	return row.New(15).Add(
		col.New(22).Add(
			text.New("Relatório de Carbono Embutido de projeto", props.Text{
				Style: fontstyle.Bold,
				Size:  12,
				Color: getTitleColor(),
				Top:   3,
			}),
			text.New("Modelo:", props.Text{
				Top:   9,
				Style: fontstyle.Bold,
				Size:  6,
			}),
			text.New("CAIXA - Emitido digitalmente em "+time.Now().Format("02/01/2006 às 15:04"), props.Text{
				Top:  9,
				Left: 9,
				Size: 6,
			}),
		),
		col.New(4),
		col.New(12).Add(
			code.NewQr("https://app.bipc.org.br/validar", props.Rect{Percent: 90, Left: 1, Top: 1}),
			text.New("Escaneie para validar a autenticidade deste relatório, ou acesse", props.Text{
				Left:            16,
				Top:             2.5,
				VerticalPadding: 0.5,
				Size:            5.5,
			}),
			text.New("app.bipc.org.br/validar", props.Text{
				Left:  23.25,
				Top:   7.25,
				Size:  5.5,
				Color: getTitleColor(),
			}),
			text.New("e envie este arquivo.", props.Text{
				Left: 16,
				Top:  9.75,
				Size: 5.5,
			}),
		).WithStyle(getBorderStyle()),
		col.New(10).Add(
			image.NewFromBytes(assets.Logo, extension.Png, props.Rect{Left: 1, Top: 2.5}),
		),
	)
}

func getTitleColor() *props.Color {
	return &props.Color{
		Red:   24,
		Green: 123,
		Blue:  139,
	}
}

func getBlackColor() *props.Color {
	return &props.Color{
		Red:   18,
		Green: 31,
		Blue:  33,
	}
}

func getGrayColor() *props.Color {
	return &props.Color{
		Red:   113,
		Green: 113,
		Blue:  122,
	}
}

func getLightGrayColor() *props.Color {
	return &props.Color{
		Red:   228,
		Green: 228,
		Blue:  231,
	}
}

func getBlueColor() *props.Color {
	return &props.Color{
		Red:   108,
		Green: 158,
		Blue:  224,
	}
}

func getRedColor() *props.Color {
	return &props.Color{
		Red:   224,
		Green: 117,
		Blue:  108,
	}
}

func getGreenColor() *props.Color {
	return &props.Color{
		Red:   99,
		Green: 179,
		Blue:  50,
	}
}

func getPurpleColor() *props.Color {
	return &props.Color{
		Red:   159,
		Green: 112,
		Blue:  219,
	}
}

func getClassificationColor(letter string) *props.Color {
	switch letter {
	case "A":
		return &props.Color{
			Red:   209,
			Green: 239,
			Blue:  206,
		}
	case "B":
		return &props.Color{
			Red:   226,
			Green: 241,
			Blue:  193,
		}
	case "C":
		return &props.Color{
			Red:   249,
			Green: 248,
			Blue:  188,
		}
	case "D":
		return &props.Color{
			Red:   253,
			Green: 227,
			Blue:  192,
		}
	default:
		return getLightGrayColor()
	}
}

func getBorderStyle(color ...*props.Color) *props.Cell {
	colorProp := getLightGrayColor()

	if len(color) > 0 {
		colorProp = color[0]
	}

	return &props.Cell{
		BorderType:      border.Full,
		BorderThickness: 0.1,
		BorderColor:     colorProp,
	}
}

func getLabelStyle() props.Text {
	return props.Text{
		Size:   5.5,
		Color:  getGrayColor(),
		Bottom: 1,
	}
}

func getValueStyle() props.Text {
	return props.Text{
		Size:   6,
		Top:    1,
		Left:   1,
		Bottom: 1.5,
	}
}

func getTitleStyle() props.Text {
	return props.Text{
		Style: fontstyle.Bold,
		Size:  12,
		Color: getTitleColor(),
	}
}

func getSubtitleStyle() props.Text {
	return props.Text{
		Style: fontstyle.Bold,
		Size:  9,
	}
}

func getDividerStyle(o ...orientation.Type) props.Line {
	orientationProp := orientation.Vertical

	if len(o) > 0 {
		orientationProp = o[0]
	}

	return props.Line{
		Thickness:     0.1,
		Orientation:   orientationProp,
		Color:         getLightGrayColor(),
		OffsetPercent: 50,
		SizePercent:   100,
	}
}

func truncate(s string, maxRunes int) string {
	r := []rune(s)
	if len(r) <= maxRunes {
		return s
	}
	return string(r[:maxRunes-3]) + "..."
}

func safe(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
