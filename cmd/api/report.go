package main

import (
	"bytes"
	"crypto"
	"crypto/x509"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/Benchmark-CO2/bipc/assets"
	"github.com/digitorus/pdf"
	"github.com/digitorus/pdfsign/sign"

	"encoding/base64"
	"encoding/json"
	"encoding/pem"
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

func loadPEMCertAndKey() (*x509.Certificate, crypto.Signer, []*x509.Certificate, error) {
	certBlock, _ := pem.Decode(assets.CertPEM)
	if certBlock == nil || certBlock.Type != "CERTIFICATE" {
		return nil, nil, nil, fmt.Errorf("não foi possível decodificar PEM do certificado")
	}

	certificate, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("erro ao parsear certificado: %w", err)
	}

	keyBlock, _ := pem.Decode(assets.KeyPEM)
	if keyBlock == nil {
		return nil, nil, nil, fmt.Errorf("não foi possível decodificar PEM da chave privada")
	}

	var privKey any
	switch keyBlock.Type {
	case "RSA PRIVATE KEY":
		privKey, err = x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
	case "PRIVATE KEY":
		privKey, err = x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
	default:
		return nil, nil, nil, fmt.Errorf("tipo de chave privada não suportado: %s", keyBlock.Type)
	}
	if err != nil {
		return nil, nil, nil, fmt.Errorf("erro ao parsear chave privada: %w", err)
	}

	signer, ok := privKey.(crypto.Signer)
	if !ok {
		return nil, nil, nil, fmt.Errorf("a chave privada não implementa crypto.Signer")
	}

	// Certificado autoassinado: sem cadeia de CAs intermediárias.
	return certificate, signer, nil, nil
}

// signPDFInMemory assina digitalmente um PDF (em bytes) usando digitorus/pdfsign,
// sem escrever arquivos temporários em disco, e retorna o PDF assinado.
func signPDFInMemory(pdfBytes []byte, certificate *x509.Certificate, certChain []*x509.Certificate, signer crypto.Signer, info sign.SignDataSignatureInfo) (*bytes.Buffer, error) {
	inputReader := bytes.NewReader(pdfBytes)
	size := int64(len(pdfBytes))

	rdr, err := pdf.NewReader(inputReader, size)
	if err != nil {
		return nil, fmt.Errorf("erro ao ler PDF para assinatura: %w", err)
	}

	var signed bytes.Buffer
	err = sign.Sign(inputReader, &signed, rdr, size, sign.SignData{
		Signature: sign.SignDataSignature{
			Info:       info,
			CertType:   sign.CertificationSignature,
			DocMDPPerm: sign.AllowFillingExistingFormFieldsAndSignaturesPerms,
		},
		Signer:            signer,
		DigestAlgorithm:   crypto.SHA256,
		Certificate:       certificate,
		CertificateChains: [][]*x509.Certificate{certChain},
		TSA: sign.TSA{
			URL: "https://freetsa.org/tsr",
		},
	})
	if err != nil {
		return nil, fmt.Errorf("erro ao assinar PDF: %w", err)
	}

	return &signed, nil
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

type JSONData struct {
	Sources []SourceData `json:"sources"`
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
		MarginTop:    gson.Num(0.75),
		MarginBottom: gson.Num(0.15),
		MarginLeft:   gson.Num(0.15),
		MarginRight:  gson.Num(0.15),
	})
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer reportPDF.Close()

	// coverBytes, err := io.ReadAll(coverPDF)
	// if err != nil {
	// 	app.serverErrorResponse(w, r, err)
	// 	return
	// }

	// reportBytes, err := io.ReadAll(reportPDF)
	// if err != nil {
	// 	app.serverErrorResponse(w, r, err)
	// 	return
	// }

	// merged, err := mergePDFsInMemory(coverBytes, assets.PDF1A, reportBytes)
	// if err != nil {
	// 	app.serverErrorResponse(w, r, err)
	// 	return
	// }

	// certificate, signer, chain, err := loadPEMCertAndKey()
	// if err != nil {
	// 	app.serverErrorResponse(w, r, err)
	// 	return
	// }

	// signedPDF, err := signPDFInMemory(merged.Bytes(), certificate, chain, signer, sign.SignDataSignatureInfo{
	// 	Name:        "Benchmark CO2",
	// 	Location:    "Brasil",
	// 	Reason:      "Emissão de relatório de carbono embutido",
	// 	ContactInfo: "contato@bipc.org.br",
	// 	Date:        time.Now().Local(),
	// })
	// if err != nil {
	// 	app.serverErrorResponse(w, r, err)
	// 	return
	// }

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="relatorio.pdf"`)
	if _, err := io.Copy(w, reportPDF); err != nil {
		log.Println("erro ao enviar PDF:", err)
	}
}
