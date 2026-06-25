package main

import (
	"bytes"
	"io"
	"net/http"

	"github.com/Benchmark-CO2/bipc/assets"

	"encoding/base64"
	"encoding/json"
	"html/template"
	"log"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
	"github.com/ysmood/gson"

	_ "embed"
)

func fontFaceCSS() string {
	encoded := base64.StdEncoding.EncodeToString(assets.RobotoFlex)

	return `
	@font-face {
		font-family: 'Roboto Flex';
		font-weight: 100 1000;
		font-stretch: 25% 151%;
		src: url(data:font/ttf;base64,` + encoded + `) format('truetype-variations');
	}
	body {
		font-family: 'Roboto Flex';
		font-weight: 400;
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
		JSONData    template.JS
		D3Script    template.JS
		FontFaceCSS template.CSS
	}{
		JSONData:    template.JS(jsonBytes),
		D3Script:    template.JS(assets.D3Script),
		FontFaceCSS: template.CSS(fontFaceCSS()),
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

	browser := rod.New().MustConnect()
	defer browser.MustClose()

	page := browser.MustPage()
	defer page.MustClose()
	page.MustSetDocumentContent(htmlContent)

	page.MustWait(`() => window.chartReady === true`)

	pdf, err := page.PDF(&proto.PagePrintToPDF{
		PrintBackground:     true,
		PaperWidth:          gson.Num(8.27),
		PaperHeight:         gson.Num(11.69),
		DisplayHeaderFooter: true,
		HeaderTemplate:      `<div style="font-size:12px;"></div>`,
		FooterTemplate: `
		<div style="font-size:9px; width:100%; text-align:center; color:#555;">
			Página <span class="pageNumber"></span> de <span class="totalPages"></span>
		</div>`,
		MarginTop:    gson.Num(0.6),
		MarginBottom: gson.Num(0.6),
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
