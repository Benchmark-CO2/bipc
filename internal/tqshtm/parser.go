package tqshtm

import (
	"errors"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/modules"
	"golang.org/x/net/html"
)

var floorTitleRe = regexp.MustCompile(`(?i)^(.*?)\s*-\s*Piso\s+(\d+)\s*:\s*(.*)$`)

func Parse(r io.Reader) (*ParsedFile, error) {
	content, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("failed to read input: %w", err)
	}

	utf8Content := decodeLatin1(content)
	doc, err := html.Parse(strings.NewReader(utf8Content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	fileTitle := getFileTitle(doc)
	if strings.Contains(strings.ToLower(fileTitle), "plantas e materiais") {
		return parseSummaryFormat(doc)
	}

	sectionNode := findSectionNode(doc, "A")
	if sectionNode == nil {
		return nil, errors.New("section 'Materiais e custos (por piso)' not found")
	}

	floors := map[int]*floorMaterials{}

	tableIter := NewTableIterator(sectionNode)
	for tableIter.Next() {
		table := tableIter.Table()
		title := extractTableTitle(table)
		if title == "" {
			continue
		}

		matches := floorTitleRe.FindStringSubmatch(title)
		if matches == nil {
			continue
		}

		tableName := strings.ToLower(strings.TrimSpace(matches[1]))
		floorIndex, err := strconv.Atoi(matches[2])
		if err != nil {
			continue
		}

		if _, ok := floors[floorIndex]; !ok {
			floors[floorIndex] = &floorMaterials{floorIndex: floorIndex}
		}

		data, err := extractTableData(table, tableName)
		if err != nil {
			continue
		}

		if data == nil {
			continue
		}

		floors[floorIndex].addMaterial(tableName, data)
	}

	result := &ParsedFile{}
	floorIndices := make([]int, 0, len(floors))
	for idx := range floors {
		floorIndices = append(floorIndices, idx)
	}
	sort.Ints(floorIndices)

	for _, idx := range floorIndices {
		f := floors[idx]
		mod, ok := f.toParsedModule()
		if !ok {
			continue
		}
		result.Modules = append(result.Modules, mod)
	}

	if len(result.Modules) == 0 {
		return nil, errors.New("no recognized module tables found")
	}

	return result, nil
}

func extractTableData(table *html.Node, tableName string) (any, error) {
	switch {
	case strings.Contains(tableName, "blocos"):
		return parseBlocksTable(table)
	case strings.Contains(tableName, "concreto, argamassa e graute"):
		return parseConcreteGroutTable(table)
	case strings.Contains(tableName, "concreto e formas de paredes"):
		return parseConcreteWallMaterialTable(table)
	case strings.Contains(tableName, "aço"):
		return parseSteelTable(table)
	default:
		return nil, nil
	}
}

func parseBlocksTable(table *html.Node) ([]BlockItem, error) {
	rows := extractDataRows(table)
	if len(rows) < 2 {
		return nil, nil
	}

	var blocks []BlockItem
	for _, row := range rows {
		cells := extractCells(row)
		if len(cells) < 5 {
			continue
		}

		name := strings.TrimSpace(cells[0])
		if name == "" || strings.EqualFold(name, "totais") {
			continue
		}

		resistance := parseFloat(strings.TrimSpace(cells[1]))
		if resistance <= 0 {
			continue
		}

		code := strings.TrimSpace(cells[0])
		qty := parseInt(strings.TrimSpace(cells[4]))
		if qty <= 0 {
			continue
		}

		blockType := normalizeBlockCode(code)
		if blockType == "" {
			continue
		}

		fbk := modules.NormalizeBlockFbkToFirstSupportedAbove(resistance / 100)

		blocks = append(blocks, BlockItem{
			Type:     blockType,
			Fbk:      fbk,
			Quantity: qty,
		})
	}

	if len(blocks) == 0 {
		return nil, nil
	}

	return blocks, nil
}

func parseConcreteGroutTable(table *html.Node) (*StructuralMasonryData, error) {
	rows := extractDataRows(table)
	if len(rows) < 2 {
		return nil, nil
	}

	data := &StructuralMasonryData{
		Concrete: []ConcreteItem{},
		Masonry: MasonryElement{
			Grout:  []GroutItem{},
			Mortar: []MortarItem{},
		},
	}

	for _, row := range rows {
		cells := extractCells(row)
		if len(cells) < 4 {
			continue
		}

		name := strings.ToLower(strings.TrimSpace(cells[0]))
		if name == "" || strings.EqualFold(name, "totais") {
			continue
		}

		resistance := parseFloat(strings.TrimSpace(cells[1]))
		volume := parseFloat(strings.TrimSpace(cells[2]))
		if resistance <= 0 || volume <= 0 {
			continue
		}

		fck := int(resistance / 100)

		switch {
		case strings.Contains(name, "concreto") && strings.Contains(name, "lajes"):
			data.Concrete = append(data.Concrete, ConcreteItem{
				Fck:      fck,
				Volume:   volume,
				Position: "slab",
			})
		case strings.Contains(name, "argamassa"):
			data.Masonry.Mortar = append(data.Masonry.Mortar, MortarItem{
				Fak:    modules.NormalizeMortarFakToFirstSupportedAbove(resistance / 1000),
				Volume: volume,
			})
		case strings.Contains(name, "graute"):
			data.Masonry.Grout = append(data.Masonry.Grout, GroutItem{
				Volumes: []GroutVolumeItem{{Fgk: int(modules.NormalizeGroutFgk(resistance / 1000)), Volume: volume}},
				Steel:   []SteelItem{},
				Position: "vertical",
			})
		}
	}

	if len(data.Concrete) == 0 && len(data.Masonry.Grout) == 0 && len(data.Masonry.Mortar) == 0 {
		return nil, nil
	}

	return data, nil
}

func parseConcreteWallMaterialTable(table *html.Node) (*ConcreteWallData, error) {
	rows := extractDataRows(table)
	if len(rows) < 2 {
		return nil, nil
	}

	data := &ConcreteWallData{
		Concrete: []ConcreteItem{},
		Steel:    []SteelItem{},
		Form:     []FormItem{},
	}

	for _, row := range rows {
		cells := extractCells(row)
		if len(cells) < 5 {
			continue
		}

		name := strings.ToLower(strings.TrimSpace(cells[0]))
		if name == "" || strings.EqualFold(name, "totais") {
			continue
		}

		val1 := parseFloat(strings.TrimSpace(cells[1]))
		val2 := parseFloat(strings.TrimSpace(cells[2]))

		switch {
		case strings.Contains(name, "concreto") && strings.Contains(name, "lajes"):
			data.Concrete = append(data.Concrete, ConcreteItem{
				Fck:      int(val1 / 100),
				Volume:   val2,
				Position: "slab",
			})
		case strings.Contains(name, "concreto de paredes"):
			data.Concrete = append(data.Concrete, ConcreteItem{
				Fck:      int(val1 / 100),
				Volume:   val2,
				Position: "wall",
			})
		case strings.Contains(name, "área de formas"):
			area := val2
			if area <= 0 {
				area = val1
			}
			data.Form = append(data.Form, FormItem{
				Area:     area,
				Position: "wall",
			})
		}
	}

	if len(data.Concrete) == 0 && len(data.Form) == 0 {
		return nil, nil
	}

	return data, nil
}

func parseSteelTable(table *html.Node) ([]SteelItem, error) {
	rows := extractDataRows(table)
	if len(rows) < 2 {
		return nil, nil
	}

	var steelItems []modules.SteelMaterial

	for _, row := range rows {
		cells := extractCells(row)
		if len(cells) < 2 {
			continue
		}

		label := strings.ToLower(strings.TrimSpace(cells[0]))
		if label != "pesos (kgf)" {
			continue
		}

		totalsIdx := len(cells) - 1
		totalMass := parseFloat(strings.TrimSpace(cells[totalsIdx]))
		if totalMass > 0 {
			steelItems = append(steelItems, modules.SteelMaterial{
				Material:   "rebar",
				Resistance: "CA50",
				Mass:       totalMass,
				Position:   "",
			})
		}
	}

	if len(steelItems) == 0 {
		return nil, nil
	}

	steelData := make([]SteelItem, len(steelItems))
	for i, s := range steelItems {
		steelData[i] = SteelItem{
			Material:   s.Material,
			Resistance: s.Resistance,
			Mass:       s.Mass,
			Position:   string(s.Position),
		}
	}

	return steelData, nil
}

func extractDataRows(table *html.Node) []*html.Node {
	var rows []*html.Node
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tr" {
			rows = append(rows, n)
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			extract(child)
		}
	}
	extract(table)
	return rows
}

func extractCells(row *html.Node) []string {
	var cells []string
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if n.Type == html.ElementNode && (n.Data == "td" || n.Data == "th") {
			cells = append(cells, getTextContent(n))
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			extract(child)
		}
	}
	extract(row)
	return cells
}

func parseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, ",", ".")
	val, _ := strconv.ParseFloat(s, 64)
	return val
}

func parseInt(s string) int {
	val, _ := strconv.Atoi(strings.TrimSpace(s))
	return val
}

func decodeLatin1(latin1 []byte) string {
	r := make([]rune, len(latin1))
	for i, b := range latin1 {
		r[i] = rune(b)
	}
	return string(r)
}

func findSectionNode(node *html.Node, name string) *html.Node {
	var found *html.Node
	var f func(*html.Node)
	f = func(n *html.Node) {
		if found != nil {
			return
		}
		if n.Type == html.ElementNode && n.Data == "a" {
			for _, attr := range n.Attr {
				if attr.Key == "name" && strings.EqualFold(attr.Val, name) {
					found = n
					return
				}
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			f(child)
		}
	}
	f(node)
	return found
}

type tableIterator struct {
	start *html.Node
	cur   *html.Node
	table *html.Node
	done  bool
}

func NewTableIterator(start *html.Node) *tableIterator {
	return &tableIterator{start: start}
}

func (it *tableIterator) Next() bool {
	if it.done {
		return false
	}

	if it.table == nil {
		it.cur = it.start
	} else {
		it.cur = it.table.NextSibling
	}

	for it.cur != nil {
		if it.cur.Type == html.ElementNode && it.cur.Data == "table" {
			it.table = it.cur
			return true
		}
		it.cur = it.cur.NextSibling
	}

	it.done = true
	return false
}

func (it *tableIterator) Table() *html.Node {
	return it.table
}

func extractTableTitle(table *html.Node) string {
	var title string
	var extract func(*html.Node)
	extract = func(n *html.Node) {
		if title != "" {
			return
		}
		if n.Type == html.ElementNode && n.Data == "th" {
			title = getTextContent(n)
			return
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			extract(child)
		}
	}
	extract(table)
	return strings.TrimSpace(title)
}

func getTextContent(n *html.Node) string {
	var sb strings.Builder
	var extract func(*html.Node)
	extract = func(node *html.Node) {
		if node.Type == html.TextNode {
			sb.WriteString(node.Data)
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			extract(child)
		}
	}
	extract(n)
	return sb.String()
}
