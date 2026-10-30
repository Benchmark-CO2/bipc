package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/Benchmark-CO2/bipc/assets"

	"encoding/base64"
	"encoding/json"
	"html/template"
	"log"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
	"github.com/ysmood/gson"

	"github.com/pdfcpu/pdfcpu/pkg/api"
)

func mergePDFsInMemory(pdfs ...[]byte) (*bytes.Buffer, error) {
	readers := make([]io.ReadSeeker, len(pdfs))
	for i, p := range pdfs {
		readers[i] = bytes.NewReader(p)
	}

	var out bytes.Buffer

	if err := api.MergeRaw(readers, &out, false, nil); err != nil {
		return nil, err
	}
	return &out, nil
}

func fontFaceCSS(font []byte, fontName string) string {
	encoded := base64.StdEncoding.EncodeToString(font)

	return `
	@font-face {
		font-family: '` + fontName + `';
		src: url(data:font/ttf;base64,` + encoded + `) format('truetype-variations');
	}
	`
}

func generateDocumentContent(templateFile string, templateName string, reportData ReportData, jsonData any, fontFaceCSS string) (string, error) {
	jsonBytes, err := json.Marshal(jsonData)
	if err != nil {
		return "", err
	}

	t := template.Must(template.New("").ParseFS(assets.TemplateFS, "templates/"+templateFile))

	var buf bytes.Buffer
	err = t.ExecuteTemplate(&buf, templateName, struct {
		ReportData  ReportData
		JSONData    template.JS
		FontFaceCSS template.CSS
	}{
		ReportData:  reportData,
		JSONData:    template.JS(jsonBytes),
		FontFaceCSS: template.CSS(fontFaceCSS),
	})
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

type ReportData struct {
	Name         string
	Siopi        string
	Apf          string
	SourcesTotal float32
}

type SourceData struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Color string `json:"color"` // hexadecimal color code, e.g., "#FF5733"
}

type GMItem struct {
	Material string  `json:"material"`
	Kg       float64 `json:"kg"`
}

type GMCategoria struct {
	Nome  string   `json:"nome"`
	Itens []GMItem `json:"itens"`
}

type GCPonto struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Destaque bool    `json:"destaque,omitempty"`
}

type JSONData struct {
	Sources []SourceData  `json:"sources"`
	GM      []GMCategoria `json:"gm"` // Total de Emissões por tecnologia e material (% / Kg CO₂)
	GC      []GCPonto     `json:"gc"` // Impacto de CUM por tecnologia (m³/m²)
}

func (app *application) screenshotHandler(w http.ResponseWriter, r *http.Request) {
	//projectID, _ := app.readUUIDParam(r, "projectID")

	var reportData = ReportData{
		Name:         "Residencial modelo",
		Siopi:        "08.1234.567.890-12",
		Apf:          "0123.4567.8901-23",
		SourcesTotal: 71,
	}

	var jsonData = JSONData{
		Sources: []SourceData{
			{Label: "Softwares (TQS via plugin)", Value: 8, Color: "#8ab4e8"},
			{Label: "Arquivos IFC (via upload)", Value: 46, Color: "#1b7a72"},
			{Label: "Arquivos CSV", Value: 12, Color: "#e8a24a"},
			{Label: "Inseridos manualmente", Value: 5, Color: "#d4736b"},
		},
		GM: []GMCategoria{
			{Nome: "Parede de concreto", Itens: []GMItem{
				{Material: "Concreto", Kg: 2100},
				{Material: "Aço", Kg: 400},
				{Material: "Argamassa", Kg: 1100},
			}},
			{Nome: "Alvenaria", Itens: []GMItem{
				{Material: "Concreto", Kg: 3015},
				{Material: "Aço", Kg: 1450},
				{Material: "Argamassa", Kg: 520},
			}},
			{Nome: "Fundação", Itens: []GMItem{
				{Material: "Concreto", Kg: 4560},
				{Material: "Aço", Kg: 350},
				{Material: "Argamassa", Kg: 70},
			}},
			{Nome: "Cobertura", Itens: []GMItem{
				{Material: "Concreto", Kg: 2220},
				{Material: "Aço", Kg: 1050},
				{Material: "Argamassa", Kg: 1750},
			}},
		},
		GC: []GCPonto{
			{X: 0.15, Y: 0.0179}, {X: 0.18, Y: 0.0357}, {X: 0.20, Y: 0.0536}, {X: 0.205, Y: 0.0714},
			{X: 0.21, Y: 0.0893}, {X: 0.22, Y: 0.1071}, {X: 0.23, Y: 0.1250}, {X: 0.26, Y: 0.1429},
			{X: 0.30, Y: 0.1607}, {X: 0.31, Y: 0.1786}, {X: 0.33, Y: 0.1964}, {X: 0.335, Y: 0.2143},
			{X: 0.36, Y: 0.2321}, {X: 0.37, Y: 0.2500}, {X: 0.375, Y: 0.2679}, {X: 0.39, Y: 0.2857},
			{X: 0.395, Y: 0.3036}, {X: 0.40, Y: 0.3214}, {X: 0.42, Y: 0.3393}, {X: 0.43, Y: 0.3571},
			{X: 0.44, Y: 0.3750}, {X: 0.45, Y: 0.3929}, {X: 0.47, Y: 0.4107}, {X: 0.48, Y: 0.4286},
			{X: 0.485, Y: 0.4464}, {X: 0.49, Y: 0.4643}, {X: 0.50, Y: 0.4821}, {X: 0.51, Y: 0.5000},
			{X: 0.52, Y: 0.5179}, {X: 0.525, Y: 0.5357}, {X: 0.53, Y: 0.5536}, {X: 0.535, Y: 0.5714},
			{X: 0.54, Y: 0.5893}, {X: 0.55, Y: 0.6071, Destaque: true}, {X: 0.555, Y: 0.6250},
			{X: 0.56, Y: 0.6429}, {X: 0.565, Y: 0.6607}, {X: 0.57, Y: 0.6786}, {X: 0.575, Y: 0.6964},
			{X: 0.58, Y: 0.7143}, {X: 0.62, Y: 0.7321}, {X: 0.63, Y: 0.7500}, {X: 0.64, Y: 0.7679},
			{X: 0.645, Y: 0.7857}, {X: 0.655, Y: 0.8036}, {X: 0.665, Y: 0.8214}, {X: 0.68, Y: 0.8393},
			{X: 0.69, Y: 0.8571}, {X: 0.70, Y: 0.8750}, {X: 0.72, Y: 0.8929}, {X: 0.73, Y: 0.9107},
			{X: 0.74, Y: 0.9286}, {X: 0.755, Y: 0.9464}, {X: 0.76, Y: 0.9643}, {X: 0.90, Y: 0.9821},
		},
	}

	reportContent, err := generateDocumentContent("caixa.gohtml", "report", reportData, jsonData, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	coverContent, err := generateDocumentContent("caixa.gohtml", "cover", reportData, nil, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := os.WriteFile("reportContent.html", []byte(reportContent), 0644); err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile("coverContent.html", []byte(coverContent), 0644); err != nil {
		log.Fatal(err)
	}

	url := launcher.New().NoSandbox(true).Headless(true).MustLaunch()

	browser := rod.New().ControlURL(url).MustConnect()
	defer browser.MustClose()

	page := browser.MustPage()
	defer page.MustClose()

	page.MustSetDocumentContent(coverContent).MustWaitLoad()

	coverPDF, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:   true,
		MarginTop:         gson.Num(0),
		MarginBottom:      gson.Num(0),
		MarginLeft:        gson.Num(0),
		MarginRight:       gson.Num(0),
		PaperWidth:        gson.Num(8.27), // A4 em polegadas
		PaperHeight:       gson.Num(11.69),
		PreferCSSPageSize: true,
	})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer coverPDF.Close()

	page.MustSetDocumentContent(reportContent).MustWait(`() => window.chartsReady === true`)

	now := time.Now()
	formatted := now.Format("02/01/2006 às 15:04")

	reportPDF, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:     true,
		PaperWidth:          gson.Num(8.27),
		PaperHeight:         gson.Num(11.69),
		DisplayHeaderFooter: true,
		HeaderTemplate: fmt.Sprintf(`
		<style>
			%s
		</style>
		<div style="display: flex; width: 100%%; justify-content: space-between; align-items: center; padding: 0 20px;">
    		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
        		<div style="align-self: stretch; color: #187B8B; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 18px; font-style: normal; font-weight: 600; line-height: 17.5px; letter-spacing: -0.16px;">Relatório de Carbono Embutido de projeto </div>
       			<div style="align-self: stretch; color: #121F21; font-feature-settings: 'calt' off; font-size: 9px; font-style: normal; font-weight: 400; line-height: 13px; letter-spacing: -0.8px;"> <b>Modelo:</b> CAIXA - Emitido digitalmente em %s </div>
    		</div>
			<div style="display: flex; align-items: center; gap: 5px;">
				<div style=" display: flex; width: 160px; padding: 2px; align-items: center; gap: 5px; border: 1px solid #E4E4E7;">
					<div style="width: 50px; height: 50px; flex-shrink: 0;">
						%s
					</div>
					<div style="display: flex; flex-direction: column; align-items: flex-start; flex: 1 0 0;">
						<div style="color: #121F21; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 7px; font-style: normal; font-weight: 400; line-height: 7.5px; letter-spacing: -0.06px;">
							Escaneie para validar a autenticidade deste relatório, ou acesse <span style="color: #078398">app.bipc.org.br/validar</span> e envie este arquivo.
						</div>
					</div>
				</div>
				<div style="width: 150px; height: 40px;">
					%s
				</div>
			</div>
		</div>`, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"), formatted, assets.QRCode, assets.LogoColorFull),
		FooterTemplate: `
			<div style="width: 100%; display: flex; justify-content: center;">
				<div style="display: flex; padding: 1.5px 7.5px; align-items: center; border-bottom: 1.5px solid #187B8B">
					<div style="color: #187B8B; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 7px; font-style: normal; font-weight: 700; line-height: 7.5px; letter-spacing: -0.06px;">
						Página <span class="pageNumber"></span> de <span class="totalPages"></span>
					</div>
				</div>
			</div>`,
		MarginTop:    gson.Num(0.90),
		MarginBottom: gson.Num(0.15),
		MarginLeft:   gson.Num(0.15),
		MarginRight:  gson.Num(0.15),
	})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer reportPDF.Close()

	coverBytes, err := io.ReadAll(coverPDF)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	reportBytes, err := io.ReadAll(reportPDF)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	merged, err := mergePDFsInMemory(coverBytes, assets.PDF1A, reportBytes)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="relatorio.pdf"`)
	if _, err := io.Copy(w, merged); err != nil {
		log.Println("erro ao enviar PDF:", err)
	}
}
