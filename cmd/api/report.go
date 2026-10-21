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

// func loadPEMCertAndKey() (*x509.Certificate, crypto.Signer, []*x509.Certificate, error) {
// 	certBlock, _ := pem.Decode(assets.CertPEM)
// 	if certBlock == nil || certBlock.Type != "CERTIFICATE" {
// 		return nil, nil, nil, fmt.Errorf("não foi possível decodificar PEM do certificado")
// 	}

// 	certificate, err := x509.ParseCertificate(certBlock.Bytes)
// 	if err != nil {
// 		return nil, nil, nil, fmt.Errorf("erro ao parsear certificado: %w", err)
// 	}

// 	keyBlock, _ := pem.Decode(assets.KeyPEM)
// 	if keyBlock == nil {
// 		return nil, nil, nil, fmt.Errorf("não foi possível decodificar PEM da chave privada")
// 	}

// 	var privKey any
// 	switch keyBlock.Type {
// 	case "RSA PRIVATE KEY":
// 		privKey, err = x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
// 	case "PRIVATE KEY":
// 		privKey, err = x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
// 	default:
// 		return nil, nil, nil, fmt.Errorf("tipo de chave privada não suportado: %s", keyBlock.Type)
// 	}
// 	if err != nil {
// 		return nil, nil, nil, fmt.Errorf("erro ao parsear chave privada: %w", err)
// 	}

// 	signer, ok := privKey.(crypto.Signer)
// 	if !ok {
// 		return nil, nil, nil, fmt.Errorf("a chave privada não implementa crypto.Signer")
// 	}

// 	// Certificado autoassinado: sem cadeia de CAs intermediárias.
// 	return certificate, signer, nil, nil
// }

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

// type ReportData struct {
// 	Name         string
// 	Siopi        string
// 	Apf          string
// 	SourcesTotal float32
// }

// type SourceData struct {
// 	Label string `json:"label"`
// 	Value int    `json:"value"`
// 	Color string `json:"color"` // hexadecimal color code, e.g., "#FF5733"
// }

// type JSONData struct {
// 	Sources []SourceData `json:"sources"`
// }

type MetricCard struct {
	BestTotal      string `json:"bestTotal"`
	BestBench      string `json:"bestBench"`
	WorstTotal     string `json:"worstTotal"`
	WorstBench     string `json:"worstBench"`
	RefTotal       string `json:"refTotal"`
	RefBench       string `json:"refBench"`
	RedTotal       string `json:"redTotal"`
	RedRel         string `json:"redRel"`
	BaselineString string `json:"baselineString"`
	P              string `json:"p"`
	C              string `json:"c"`
	V              string `json:"v"`
	R              string `json:"r"`
	Grade          string `json:"grade"`
	TotalProjects  int    `json:"totalProjects"`
}

type MaterialPart struct {
	Label   string  `json:"label"`
	Percent float64 `json:"percent"`
	Weight  string  `json:"weight"`
	Color   string  `json:"color"`
}

type TechEmission struct {
	Name  string         `json:"name"`
	Parts []MaterialPart `json:"parts"`
}

type ReportData struct {
	// Dados do Projeto
	Siopi         string
	Apf           string
	Name          string
	BuildingType  string
	UseType       string
	Phase         string
	TotalUH       int
	TotalUC       int
	AreaUC        string
	AreaTotal     string
	Street        string
	ZipCode       string
	Number        string
	Neighborhood  string
	City          string
	State         string

	// Rastreabilidade
	TraceabilityPct int
	SourcesTotal    float32

	// Resumo Benchmark (Cards e Tabelas)
	CO2Metrics    MetricCard
	EnergyMetrics MetricCard
	CUMGrade      string
	CUMProjects   int

	// Barras Horizontais (Tecnologia e Material)
	// TechEmissions []TechEmission // grafico de barras usar esse
	BubbleGrid BubbleGrid // grafico de bolhas usar esse

	DetailTable []DetailTableRow
	TowerImpacts []TowerImpact
	UnitDetails []UnitDetail
	SidacRefs    []SidacRef
	Team         []TeamMember
	DataSources  []DataSourceGroup
	Observations string
}

type SourceData struct {
	Label   string  `json:"label"`
	Value   int     `json:"value"`
	Percent float64 `json:"percent"`
	Color   string  `json:"color"`
}

type BenchmarkPoint struct {
	ID    string  `json:"id"`
	Y     float64 `json:"y"`
	Min   float64 `json:"min"`
	Max   float64 `json:"max"`
	Value float64 `json:"value,omitempty"`
	Label string  `json:"label,omitempty"`
}

type JSONData struct {
	Sources      []SourceData     `json:"sources"`
	CO2Chart     []BenchmarkPoint `json:"co2Chart"`
	EnergyChart  []BenchmarkPoint `json:"energyChart"`
	CUMChart     []BenchmarkPoint `json:"cumChart"`
	SelectedIDs  []string         `json:"selectedIds"`
}

type DetailTableRow struct {
	TechMaterial string `json:"techMaterial"`
	CO2Min       string `json:"co2Min"`
	CO2Prov      string `json:"co2Prov"`
	CO2Max       string `json:"co2Max"`
	EnergyMin    string `json:"energyMin"`
	EnergyProv   string `json:"energyProv"`
	EnergyMax    string `json:"energyMax"`
	CUM          string `json:"cum"`
	IsHeader     bool   `json:"isHeader"` // Para destacar categorias principais a negrito
}

type TowerImpactPart struct {
	Label   string  `json:"label"`
	Percent float64 `json:"percent"`
	Value   float64 `json:"value"` // Valor absoluto para o eixo X
	Color   string  `json:"color"`
}

type TechImpact struct {
	Name    string            `json:"name"`
	Percent string            `json:"percent"`
	Parts   []TowerImpactPart `json:"parts"`
}

type TowerImpact struct {
	Name        string            `json:"name"`
	EnergyParts []TowerImpactPart `json:"energyParts"`
	CO2Parts    []TowerImpactPart `json:"co2Parts"`
	Techs       []TechImpact      `json:"techs"`
}

type UnitTable struct {
	Title string           `json:"title"`
	Rows  []DetailTableRow `json:"rows"`
}

type UnitDetail struct {
	Name           string      `json:"name"`
	Foundation     UnitTable   `json:"foundation"`
	TotalPavements int         `json:"totalPavements"`
	Pavements      []UnitTable `json:"pavements"`
}

type SidacRef struct {
	Material string `json:"material"`
	Date     string `json:"date"`
}

type TeamMember struct {
	Name     string `json:"name"`
	Area     string `json:"area"`
	Registry string `json:"registry"`
	Email    string `json:"email"`
}

type DataSourceItem struct {
	Type     string `json:"type"` // "software", "arquivo", "manual"
	FileName string `json:"fileName"`
	Qty      string `json:"qty"`
	Area     string `json:"area"`
	Date     string `json:"date"`
}

type DataSourceGroup struct {
	GroupName string           `json:"groupName"`
	TotalQty  string           `json:"totalQty"`
	Items     []DataSourceItem `json:"items"`
}

type BubbleData struct {
	SizePx   int
	BorderPx int
	LabelTop string
	LabelBot string
}

type MaterialRow struct {
	Material string
	Color    string
	Bubbles  []BubbleData
}

type BubbleGrid struct {
	TechHeaders []string
	Rows        []MaterialRow
}

func (app *application) screenshotHandler(w http.ResponseWriter, r *http.Request) {
	//projectID, _ := app.readUUIDParam(r, "projectID")
	// Colunas do cabeçalho
	techHeaders := []string{"Fundação", "Parede de concreto", "Alvenaria", "Cobertura", "Laje", "Pilares", "Vedação externa", "Escada"}

	// Valores simulados extraídos da imagem
	topVals := []float64{68.2, 51.9, 44.6, 33.4, 58.0, 62.1, 20.5, 55.3}
	botVals := []float64{24.1, 17.6, 15.1, 11.3, 19.6, 21.0, 6.9, 18.7}

	// Função auxiliar para gerar a linha de bolhas convertendo os valores em píxeis
	makeBubbles := func(scale float64) []BubbleData {
		var bubbles []BubbleData
		for i := range topVals {
			// Regra de três simples para definir o tamanho visual em píxeis
			sizePx := int(topVals[i] * 0.32 * scale)
			if sizePx < 6 { sizePx = 6 }
			
			borderPx := int(botVals[i] * 0.12 * scale)
			if borderPx < 1 { borderPx = 1 }

			bubbles = append(bubbles, BubbleData{
				SizePx:   sizePx,
				BorderPx: borderPx,
				LabelTop: fmt.Sprintf("%.1f", topVals[i]),
				LabelBot: fmt.Sprintf("%.1f", botVals[i]),
			})
		}
		return bubbles
	}

	bubbleGridData := BubbleGrid{
		TechHeaders: techHeaders,
		Rows: []MaterialRow{
			{Material: "Concreto", Color: "#187B8B", Bubbles: makeBubbles(1.0)},
			{Material: "Aço", Color: "#ED8936", Bubbles: makeBubbles(0.85)},
			{Material: "Argamassa", Color: "#9F7AEA", Bubbles: makeBubbles(0.7)},
		},
	}

	reportData := ReportData{
		Siopi:           "08.1234.567.890-12",
		Apf:             "0123.4567.8901-23",
		Name:            "Residencial modelo",
		BuildingType:    "Torre",
		UseType:         "Residencial",
		Phase:           "Projeto executivo",
		TotalUH:         36,
		TotalUC:         4,
		AreaUC:          "561,1",
		AreaTotal:       "2244,4",
		Street:          "Avenida Álvaro Maia",
		ZipCode:         "69025-310",
		Number:          "488",
		Neighborhood:    "Centro",
		City:            "Manaus",
		State:           "AM",
		TraceabilityPct: 93,
		SourcesTotal:    100,

		CO2Metrics: MetricCard{
			BestTotal:      "128.577,25",
			BestBench:      "45,83",
			WorstTotal:     "211.205,95",
			WorstBench:     "75,28",
			RefTotal:       "211.205,95",
			RefBench:       "75,28",
			RedTotal:       "211.205,95",
			RedRel:         "75,28",
			BaselineString: "C52, R86, V77; 5% melhores projetos: C25, R42, V30",
			P:              "25",
			C:              "48",
			V:              "36",
			R:              "82",
			Grade:          "B",
			TotalProjects:  380,
		},
		EnergyMetrics: MetricCard{
			BestTotal:      "45.234,87",
			BestBench:      "16,19",
			WorstTotal:     "74.567,23",
			WorstBench:     "26,54",
			RefTotal:       "74.567,23",
			RefBench:       "26,54",
			RedTotal:       "74.567,23",
			RedRel:         "26,54",
			BaselineString: "C26, R41, V18; 5% melhores projetos: C12, R20, V9",
			P:              "25",
			C:              "48",
			V:              "?",
			R:              "82",
			Grade:          "B",
			TotalProjects:  380,
		},
		CUMGrade:    "C",
		CUMProjects: 380,

		// TechEmissions: []TechEmission{
		// 	{
		// 		Name: "Parede de concreto",
		// 		Parts: []MaterialPart{
		// 			{Label: "Concreto", Percent: 68.77, Weight: "3400Kg", Color: "#187B8B"},
		// 			{Label: "Aço", Percent: 9.08, Weight: "480Kg", Color: "#ED8936"},
		// 			{Label: "Argamassa", Percent: 22.15, Weight: "1100Kg", Color: "#9F7AEA"},
		// 		},
		// 	},
		// 	{
		// 		Name: "Alvenaria",
		// 		Parts: []MaterialPart{
		// 			{Label: "Concreto", Percent: 60.29, Weight: "3015Kg", Color: "#187B8B"},
		// 			{Label: "Aço", Percent: 29.60, Weight: "1450Kg", Color: "#ED8936"},
		// 			{Label: "Argamassa", Percent: 10.10, Weight: "525Kg", Color: "#9F7AEA"},
		// 		},
		// 	},
		// 	{
		// 		Name: "Fundação",
		// 		Parts: []MaterialPart{
		// 			{Label: "Concreto", Percent: 91.28, Weight: "4550Kg", Color: "#187B8B"},
		// 			{Label: "Aço", Percent: 6.77, Weight: "350Kg", Color: "#ED8936"},
		// 			{Label: "Argamassa", Percent: 1.33, Weight: "70Kg", Color: "#9F7AEA"},
		// 		},
		// 	},
		// 	{
		// 		Name: "Cobertura",
		// 		Parts: []MaterialPart{
		// 			{Label: "Concreto", Percent: 44.46, Weight: "2220Kg", Color: "#187B8B"},
		// 			{Label: "Aço", Percent: 20.61, Weight: "1050Kg", Color: "#ED8936"},
		// 			{Label: "Argamassa", Percent: 34.31, Weight: "1750Kg", Color: "#9F7AEA"},
		// 		},
		// 	},
		// },
		BubbleGrid: bubbleGridData,
		DetailTable: []DetailTableRow{
			{TechMaterial: "Geral", CO2Min: "45,83", CO2Prov: "48,56", CO2Max: "75,28", EnergyMin: "401,27", EnergyProv: "544,32", EnergyMax: "687,38", CUM: "0,30", IsHeader: true},
			{TechMaterial: "Concreto FCK25", CO2Min: "40,54", CO2Prov: "41,33", CO2Max: "42,11", EnergyMin: "0,11", EnergyProv: "0,14", EnergyMax: "0,17", CUM: "0,30", IsHeader: false},
			{TechMaterial: "Aço CA50", CO2Min: "1,04", CO2Prov: "1,36", CO2Max: "2,01", EnergyMin: "0,01", EnergyProv: "0,01", EnergyMax: "0,02", CUM: "0,00", IsHeader: false},
			{TechMaterial: "Aço CA60", CO2Min: "4,25", CO2Prov: "7,47", CO2Max: "10,66", EnergyMin: "0,03", EnergyProv: "0,04", EnergyMax: "0,06", CUM: "0,00", IsHeader: false},
			{TechMaterial: "Parede de concreto", CO2Min: "36,37", CO2Prov: "48,06", CO2Max: "59,75", EnergyMin: "318,55", EnergyProv: "432,15", EnergyMax: "545,75", CUM: "0,16", IsHeader: true},
			{TechMaterial: "Concreto FCK25", CO2Min: "33,16", CO2Prov: "40,72", CO2Max: "48,27", EnergyMin: "239,29", EnergyProv: "313,27", EnergyMax: "387,24", CUM: "0,16", IsHeader: false},
			{TechMaterial: "Aço CA50", CO2Min: "0,86", CO2Prov: "1,68", CO2Max: "2,39", EnergyMin: "18,11", EnergyProv: "27,16", EnergyMax: "36,21", CUM: "0,00", IsHeader: false},
			{TechMaterial: "Aço CA60", CO2Min: "2,35", CO2Prov: "5,66", CO2Max: "8,92", EnergyMin: "61,15", EnergyProv: "91,72", EnergyMax: "122,29", CUM: "0,00", IsHeader: false},
			{TechMaterial: "Radier", CO2Min: "9,46", CO2Prov: "12,50", CO2Max: "15,53", EnergyMin: "82,72", EnergyProv: "112,17", EnergyMax: "141,63", CUM: "0,04", IsHeader: true},
			{TechMaterial: "Concreto FCK25", CO2Min: "8,38", CO2Prov: "10,61", CO2Max: "12,84", EnergyMin: "62,36", EnergyProv: "81,64", EnergyMax: "100,92", CUM: "0,04", IsHeader: false},
			{TechMaterial: "Aço CA50", CO2Min: "0,05", CO2Prov: "0,08", CO2Max: "0,12", EnergyMin: "0,91", EnergyProv: "1,36", EnergyMax: "1,81", CUM: "0,00", IsHeader: false},
			{TechMaterial: "Aço CA60", CO2Min: "1,03", CO2Prov: "1,80", CO2Max: "2,57", EnergyMin: "19,45", EnergyProv: "29,18", EnergyMax: "38,90", CUM: "0,00", IsHeader: false},
		},
		TowerImpacts: []TowerImpact{
			{
				Name: "Torre A",
				EnergyParts: []TowerImpactPart{
					{Label: "Parede de concreto", Percent: 52, Color: "#187B8B"},
					{Label: "Fundação radier", Percent: 29, Color: "#ED8936"},
					{Label: "Cobertura", Percent: 19, Color: "#9F7AEA"},
				},
				CO2Parts: []TowerImpactPart{
					{Label: "Parede de concreto", Percent: 50, Color: "#187B8B"},
					{Label: "Fundação radier", Percent: 31, Color: "#ED8936"},
					{Label: "Cobertura", Percent: 19, Color: "#9F7AEA"},
				},
				Techs: []TechImpact{
					{
						Name:    "Parede de concreto",
						Percent: "47%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 53.8, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
						},
					},
					{
						Name:    "Fundação radier",
						Percent: "35%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 53.8, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
						},
					},
					{
						Name:    "Cobertura",
						Percent: "18%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 26.9, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
							{Label: "Areia", Percent: 6.97, Color: "#ECC94B"},
						},
					},
				},
			},
			{
				Name: "Torre B",
				EnergyParts: []TowerImpactPart{
					{Label: "Parede de concreto", Percent: 48, Color: "#187B8B"},
					{Label: "Fundação radier", Percent: 30, Color: "#ED8936"},
					{Label: "Cobertura", Percent: 22, Color: "#9F7AEA"},
				},
				CO2Parts: []TowerImpactPart{
					{Label: "Parede de concreto", Percent: 49, Color: "#187B8B"},
					{Label: "Fundação radier", Percent: 28, Color: "#ED8936"},
					{Label: "Cobertura", Percent: 23, Color: "#9F7AEA"},
				},
				Techs: []TechImpact{
					{
						Name:    "Parede de concreto",
						Percent: "47%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 53.8, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
							{Label: "Areia", Percent: 6.97, Color: "#ECC94B"},
						},
					},
					{
						Name:    "Fundação radier",
						Percent: "35%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 53.8, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
						},
					},
					{
						Name:    "Cobertura",
						Percent: "18%",
						Parts: []TowerImpactPart{
							{Label: "Concreto FCK25", Percent: 30.4, Color: "#187B8B"},
							{Label: "Aço CA50", Percent: 12.5, Color: "#ED8936"},
							{Label: "Areia", Percent: 6.97, Color: "#ECC94B"},
						},
					},
				},
			},
		},
		UnitDetails: []UnitDetail{
			{
				Name: "Torre 1",
				Foundation: UnitTable{
					Title: "Fundação - Radier",
					Rows: []DetailTableRow{
						{TechMaterial: "Radier", CO2Min: "9,46", CO2Prov: "12,50", CO2Max: "15,53", EnergyMin: "82,72", EnergyProv: "112,17", EnergyMax: "141,63", CUM: "0,04", IsHeader: true},
						{TechMaterial: "Concreto FCK25", CO2Min: "8,38", CO2Prov: "10,61", CO2Max: "12,84", EnergyMin: "62,36", EnergyProv: "81,64", EnergyMax: "100,92", CUM: "0,04", IsHeader: false},
						{TechMaterial: "Aço CA50", CO2Min: "0,05", CO2Prov: "0,08", CO2Max: "0,12", EnergyMin: "0,91", EnergyProv: "1,36", EnergyMax: "1,81", CUM: "0,00", IsHeader: false},
						{TechMaterial: "Aço CA60", CO2Min: "1,03", CO2Prov: "1,80", CO2Max: "2,57", EnergyMin: "19,45", EnergyProv: "29,18", EnergyMax: "38,90", CUM: "0,00", IsHeader: false},
					},
				},
				TotalPavements: 5,
				Pavements: []UnitTable{
					{
						Title: "Pavimento 1 - Térreo",
						Rows: []DetailTableRow{
							{TechMaterial: "Parede de concreto", CO2Min: "7,42", CO2Prov: "9,81", CO2Max: "12,27", EnergyMin: "65,92", EnergyProv: "89,68", EnergyMax: "113,43", CUM: "0,03", IsHeader: true},
							{TechMaterial: "Concreto FCK25", CO2Min: "6,48", CO2Prov: "8,20", CO2Max: "9,93", EnergyMin: "48,22", EnergyProv: "63,12", EnergyMax: "78,03", CUM: "0,03", IsHeader: false},
							{TechMaterial: "Aço CA50", CO2Min: "0,30", CO2Prov: "0,52", CO2Max: "0,74", EnergyMin: "5,62", EnergyProv: "8,43", EnergyMax: "11,24", CUM: "0,00", IsHeader: false},
							{TechMaterial: "Aço CA60", CO2Min: "0,64", CO2Prov: "1,12", CO2Max: "1,60", EnergyMin: "12,08", EnergyProv: "18,12", EnergyMax: "24,16", CUM: "0,00", IsHeader: false},
						},
					},
					{
						Title: "Pavimento 2 - Tipo",
						Rows: []DetailTableRow{
							{TechMaterial: "Parede de concreto", CO2Min: "7,42", CO2Prov: "9,81", CO2Max: "12,27", EnergyMin: "65,92", EnergyProv: "89,68", EnergyMax: "113,43", CUM: "0,03", IsHeader: true},
							{TechMaterial: "Concreto FCK25", CO2Min: "6,48", CO2Prov: "8,20", CO2Max: "9,93", EnergyMin: "48,22", EnergyProv: "63,12", EnergyMax: "78,03", CUM: "0,03", IsHeader: false},
							{TechMaterial: "Aço CA50", CO2Min: "0,30", CO2Prov: "0,52", CO2Max: "0,74", EnergyMin: "5,62", EnergyProv: "8,43", EnergyMax: "11,24", CUM: "0,00", IsHeader: false},
							{TechMaterial: "Aço CA60", CO2Min: "0,64", CO2Prov: "1,12", CO2Max: "1,60", EnergyMin: "12,08", EnergyProv: "18,12", EnergyMax: "24,16", CUM: "0,00", IsHeader: false},
						},
					},
					{
						Title: "Pavimento 3 - Tipo",
						Rows: []DetailTableRow{
							{TechMaterial: "Parede de concreto", CO2Min: "7,42", CO2Prov: "9,81", CO2Max: "12,27", EnergyMin: "65,92", EnergyProv: "89,68", EnergyMax: "113,43", CUM: "0,03", IsHeader: true},
							{TechMaterial: "Concreto FCK25", CO2Min: "6,48", CO2Prov: "8,20", CO2Max: "9,93", EnergyMin: "48,22", EnergyProv: "63,12", EnergyMax: "78,03", CUM: "0,03", IsHeader: false},
							{TechMaterial: "Aço CA50", CO2Min: "0,30", CO2Prov: "0,52", CO2Max: "0,74", EnergyMin: "5,62", EnergyProv: "8,43", EnergyMax: "11,24", CUM: "0,00", IsHeader: false},
							{TechMaterial: "Aço CA60", CO2Min: "0,64", CO2Prov: "1,12", CO2Max: "1,60", EnergyMin: "12,08", EnergyProv: "18,12", EnergyMax: "24,16", CUM: "0,00", IsHeader: false},
						},
					},
					{
						Title: "Pavimento 4 - Tipo",
						Rows: []DetailTableRow{
							{TechMaterial: "Parede de concreto", CO2Min: "7,42", CO2Prov: "9,81", CO2Max: "12,27", EnergyMin: "65,92", EnergyProv: "89,68", EnergyMax: "113,43", CUM: "0,03", IsHeader: true},
							{TechMaterial: "Concreto FCK25", CO2Min: "6,48", CO2Prov: "8,20", CO2Max: "9,93", EnergyMin: "48,22", EnergyProv: "63,12", EnergyMax: "78,03", CUM: "0,03", IsHeader: false},
							{TechMaterial: "Aço CA50", CO2Min: "0,30", CO2Prov: "0,52", CO2Max: "0,74", EnergyMin: "5,62", EnergyProv: "8,43", EnergyMax: "11,24", CUM: "0,00", IsHeader: false},
							{TechMaterial: "Aço CA60", CO2Min: "0,64", CO2Prov: "1,12", CO2Max: "1,60", EnergyMin: "12,08", EnergyProv: "18,12", EnergyMax: "24,16", CUM: "0,00", IsHeader: false},
						},
					},
					{
						Title: "Pavimento 5 - Cobertura",
						Rows: []DetailTableRow{
							{TechMaterial: "Parede de concreto", CO2Min: "7,16", CO2Prov: "9,42", CO2Max: "11,68", EnergyMin: "61,39", EnergyProv: "83,71", EnergyMax: "106,03", CUM: "0,03", IsHeader: true},
							{TechMaterial: "Concreto FCK25", CO2Min: "6,40", CO2Prov: "8,10", CO2Max: "9,80", EnergyMin: "47,61", EnergyProv: "62,33", EnergyMax: "77,05", CUM: "0,03", IsHeader: false},
							{TechMaterial: "Aço CA50", CO2Min: "0,11", CO2Prov: "0,19", CO2Max: "0,27", EnergyMin: "2,06", EnergyProv: "3,11", EnergyMax: "4,15", CUM: "0,00", IsHeader: false},
							{TechMaterial: "Aço CA60", CO2Min: "0,65", CO2Prov: "1,13", CO2Max: "1,61", EnergyMin: "12,17", EnergyProv: "18,26", EnergyMax: "24,35", CUM: "0,00", IsHeader: false},
						},
					},
				},
			},
		},
		SidacRefs: []SidacRef{
			{Material: "Concreto FCK25", Date: "25/04/2026"},
			{Material: "Aço CA50", Date: "25/04/2026"},
			{Material: "Aço CA60", Date: "25/04/2026"},
		},
		Team: []TeamMember{
			{Name: "Wagner Cruz Amaral", Area: "Administrador", Registry: "261234567-9 SP", Email: "wagnerca@davasiocorp.com.br"},
			{Name: "José Carlos de Almeida", Area: "Estrutura", Registry: "158987456-0 RJ", Email: "joseca@davasiocorp.com.br"},
			{Name: "Ana Carla Fagundes", Area: "Arquitetura", Registry: "A123456-7", Email: "anacf@davasiocorp.com.br"},
			{Name: "Andréa Guimarães de Alencar Pastokatz", Area: "Arquitetura", Registry: "A987654-3", Email: "andreagap@davasiocorp.com.br"},
			{Name: "Pablo Morass Souza", Area: "Fundações", Registry: "B41122334-0 SP", Email: "pabloms@davasiocorp.com.br"},
		},
		DataSources: []DataSourceGroup{
			{
				GroupName: "Parede de concreto",
				TotalQty:  "63",
				Items: []DataSourceItem{
					{Type: "software", FileName: "EST-00012.3_Tipo-V12.tqs", Qty: "35", Area: "Arquitetura", Date: "25/04/2026"},
					{Type: "software", FileName: "EST-00012.3_Térreo-V12.tqs", Qty: "28", Area: "Arquitetura", Date: "25/04/2026"},
				},
			},
			{
				GroupName: "Radier",
				TotalQty:  "16",
				Items: []DataSourceItem{
					{Type: "arquivo", FileName: "EST-130_paredes_estruturais.ifc", Qty: "4", Area: "Estrutura", Date: "25/04/2026"},
					{Type: "manual", FileName: "-", Qty: "-", Area: "Fundações", Date: "25/04/2026"},
				},
			},
		},
		Observations: "", // Deixe em branco conforme a imagem
	}

	// Gerando pontos de exemplo para a curva S do gráfico (No seu caso real, virá do banco/cálculo)
	var co2Points, energyPoints, cumPoints []BenchmarkPoint
	totalPts := 45
	for i := 0; i < totalPts; i++ {
		y := float64(i) / float64(totalPts-1)
		// Simula uma curva em S (sigmoide/polinomial)
		baseMin := 15.0 + 75.0*(y*y*(3-2*y))
		baseMax := baseMin + 15.0 + 25.0*y

		id := fmt.Sprintf("proj-%d", i)
		if i == 19 { // Ponto selecionado em ~0.42 no eixo Y
			id = "total"
			baseMin = 48
			baseMax = 88
		}

		co2Points = append(co2Points, BenchmarkPoint{ID: id, Y: y, Min: baseMin, Max: baseMax})
		energyPoints = append(energyPoints, BenchmarkPoint{ID: id, Y: y, Min: baseMin, Max: baseMax})

		cumVal := 0.15 + 0.65*(y*y*(3-2*y)) + (float64(i%3)-1)*0.015
		if i == 27 { // Ponto selecionado em ~0.6 no eixo Y para o CUM
			id = "total"
			cumVal = 0.53
		}
		cumPoints = append(cumPoints, BenchmarkPoint{ID: id, Y: y, Min: cumVal, Max: cumVal, Value: cumVal})
	}

	jsonData := JSONData{
		Sources: []SourceData{
			{Label: "Softwares (TQS via plugin)", Value: 37, Percent: 37, Color: "#4A7BB0"},
			{Label: "Arquivos IFC (via upload)", Value: 46, Percent: 46, Color: "#187B8B"},
			{Label: "Arquivos CSV", Value: 12, Percent: 12, Color: "#ED8936"},
			{Label: "Inseridos manualmente", Value: 5, Percent: 5, Color: "#D96B62"},
		},
		CO2Chart:    co2Points,
		EnergyChart: energyPoints,
		CUMChart:    cumPoints,
		SelectedIDs: []string{"total"},
	}

	reportContent, err := generateDocumentContent("caixav3.gohtml", "report", reportData, jsonData, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	coverContent, err := generateDocumentContent("caixav3.gohtml", "cover", reportData, nil, fontFaceCSS(assets.RobotoFlex, "Roboto Flex"))
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
	page.MustSetViewport(1200, 1600, 1, false)
	go page.EachEvent(func(e *proto.RuntimeConsoleAPICalled) {
		log.Println("Browser JS Console:", page.MustObjectsToJSON(e.Args))
	})()
	page.MustSetDocumentContent(coverContent)

	// 2. CAPTURA OS LOGS DO JAVASCRIPT (Isso vai mostrar o erro no seu terminal!)
	go page.EachEvent(func(e *proto.RuntimeConsoleAPICalled) {
		log.Println("Browser JS Console:", page.MustObjectsToJSON(e.Args))
	})()

	// 3. Espera o JS terminar, MAS COM UM TIMEOUT DE 10 SEGUNDOS para não travar o servidor
	err = page.Timeout(10 * time.Second).WaitElementsMoreThan("body", 0)
	if err != nil {
		log.Println("Erro ao carregar o body:", err)
	}

	// Espera a flag do JS com limite de tempo
	_, err = page.Timeout(10 * time.Second).Eval(`() => new Promise(resolve => {
		const check = () => {
			if (window.chartsReady === true || window.chartsError !== undefined) resolve();
			else setTimeout(check, 100);
		};
		check();
	})`)
	if err != nil {
		log.Println("Timeout ou erro ao esperar os gráficos renderizarem:", err)
		// Pode retornar erro para o usuário aqui se quiser
	}
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

	page.MustSetDocumentContent(reportContent).MustWaitLoad().Timeout(10 * time.Second).MustWait(`() => window.chartsReady === true`)

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
