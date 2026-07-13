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

	_ "embed"
)

func fontFaceCSS() string {
	encoded := base64.StdEncoding.EncodeToString(assets.RobotoFlex)

	return `
	@font-face {
		font-family: 'Roboto Flex';
		src: url(data:font/ttf;base64,` + encoded + `) format('truetype-variations');
	}
	`
}

func gerarHTMLBuffer(templateFile string, data any) (string, error) {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	t := template.Must(template.New("").ParseFS(assets.TemplateFS, "templates/"+templateFile))

	var buf bytes.Buffer
	err = t.ExecuteTemplate(&buf, "report", struct {
		JSONData           template.JS
		D3Script           template.JS
		D3RegressionScript template.JS
		FontFaceCSS        template.CSS
	}{
		JSONData:           template.JS(jsonBytes),
		D3Script:           template.JS(assets.D3Script),
		D3RegressionScript: template.JS(assets.D3RegressionScript),
		FontFaceCSS:        template.CSS(fontFaceCSS()),
	})
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (app *application) screenshotHandler(w http.ResponseWriter, r *http.Request) {

	htmlContent, err := gerarHTMLBuffer("relatorio.gohtml", nil)
	if err != nil {
		log.Fatal(err)
	}

	if err := os.WriteFile("htmlContent.html", []byte(htmlContent), 0644); err != nil {
		log.Fatal(err)
	}

	url := launcher.New().NoSandbox(true).Headless(true).MustLaunch()

	browser := rod.New().ControlURL(url).MustConnect()
	defer browser.MustClose()

	page := browser.MustPage()
	defer page.MustClose()

	page.MustSetDocumentContent(htmlContent)

	page.MustWait(`() => window.chartReady === true`)

	now := time.Now()
	formatted := now.Format("02/01/2006 às 15:04")

	pdf, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:     true,
		PaperWidth:          gson.Num(8.27),
		PaperHeight:         gson.Num(11.69),
		DisplayHeaderFooter: true,
		HeaderTemplate: fmt.Sprintf(`
		<style>
			%s
		</style>
		<div style="display: flex; width: 100%%; justify-content: space-between; align-items: center; padding: 0 20px; border: 1px solid #ccc;">
    		<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; border: 1px solid #ccc;">
        		<div style="align-self: stretch; color: #187B8B; font-feature-settings: 'calt' off; font-family: 'Roboto Flex'; font-size: 16px; font-style: normal; font-weight: 700; line-height: 17.5px; letter-spacing: -0.16px;">Relatório de Carbono Embutido de projeto </div>
       			<div style="align-self: stretch; color: #121F21; font-feature-settings: 'calt' off; font-size: 8px; font-style: normal; font-weight: 400; line-height: 13px; letter-spacing: -0.8px;"> <b>Modelo:</b> CAIXA - Emitido digitalmente em %s </div>
    		</div>
		</div>`, fontFaceCSS(), formatted),
		FooterTemplate: `
		<div style="font-size:9px; width:100%; text-align:center; color:#555;">
			Página <span class="pageNumber"></span> de <span class="totalPages"></span>
		</div>`,
		MarginTop:    gson.Num(0.7),
		MarginBottom: gson.Num(0.15),
		MarginLeft:   gson.Num(0.15),
		MarginRight:  gson.Num(0.15),
	})
	if err != nil {
		log.Fatal(err)
	}
	defer pdf.Close()

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="relatorio.pdf"`)
	if _, err := io.Copy(w, pdf); err != nil {
		log.Println("erro ao enviar PDF:", err)
	}
}
