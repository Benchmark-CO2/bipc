package tqshtm

import (
	"errors"
	"regexp"
	"strconv"
	"strings"

	"golang.org/x/net/html"
)

var summaryFloorRe = regexp.MustCompile(`(?i)^Piso\s+(\d+)\s*:\s*(.*)$`)

var elementPositionMap = map[string]string{
	"pilares":    "column",
	"vigas":      "beam",
	"lajes":      "slab",
	"fundacoes":  "",
	"fundações":  "",
	"outros":     "",
	"paredes":    "wall",
}

func getFileTitle(doc *html.Node) string {
	var text string
	var find func(*html.Node)
	find = func(n *html.Node) {
		if text != "" {
			return
		}
		if n.Type == html.ElementNode && (n.Data == "title" || n.Data == "h1") {
			text = getTextContent(n)
			return
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			find(child)
		}
	}
	find(doc)
	return strings.TrimSpace(text)
}

func parseSummaryFormat(root *html.Node) (*ParsedFile, error) {
	sectionNode := findSectionNode(root, "B")
	if sectionNode == nil {
		return nil, errors.New("section 'Resumo de materiais' not found")
	}

	floors := map[int]*floorMaterials{}

	tableIter := NewTableIterator(sectionNode)
	for tableIter.Next() {
		table := tableIter.Table()
		cells := extractCells(table)
		if len(cells) < 1 {
			continue
		}

		firstCell := strings.TrimSpace(cells[0])
		matches := summaryFloorRe.FindStringSubmatch(firstCell)
		if matches == nil {
			continue
		}

		floorIndex, err := strconv.Atoi(matches[1])
		if err != nil {
			continue
		}

		mod := parseSummaryTable(table)
		if mod == nil {
			continue
		}

		if _, ok := floors[floorIndex]; !ok {
			floors[floorIndex] = &floorMaterials{floorIndex: floorIndex}
		}
		floors[floorIndex].concrete = append(floors[floorIndex].concrete, mod.concrete...)
		floors[floorIndex].steel = append(floors[floorIndex].steel, mod.steel...)
		floors[floorIndex].form = append(floors[floorIndex].form, mod.form...)
	}

	result := &ParsedFile{}
	for _, f := range floors {
		modType := determineSummaryModuleType(f)
		if len(f.concrete) == 0 && len(f.form) == 0 && len(f.steel) == 0 {
			continue
		}

		if modType == ModuleTypeConcreteWall {
			for i := range f.concrete {
				if f.concrete[i].Position == "beam" || f.concrete[i].Position == "column" {
					f.concrete[i].Position = "wall"
				}
			}
			for i := range f.form {
				if f.form[i].Position == "beam" || f.form[i].Position == "column" {
					f.form[i].Position = "wall"
				}
			}
			for i := range f.steel {
				if f.steel[i].Position == "beam" || f.steel[i].Position == "column" {
					f.steel[i].Position = "wall"
				}
			}
		}

		result.Modules = append(result.Modules, ParsedModule{
			FloorIndex: f.floorIndex,
			Type:       modType,
			Data: ConcreteWallData{
				Concrete: f.concrete,
				Steel:    f.steel,
				Form:     f.form,
			},
		})
	}

	if len(result.Modules) == 0 {
		return nil, errors.New("no floor tables found")
	}

	return result, nil
}

type summaryModuleData struct {
	concrete []ConcreteItem
	steel    []SteelItem
	form     []FormItem
}

func parseSummaryTable(table *html.Node) *summaryModuleData {
	rows := extractDataRows(table)
	if len(rows) < 4 {
		return nil
	}

	data := &summaryModuleData{}

	for _, row := range rows {
		cells := extractCells(row)
		n := len(cells)
		if n < 5 {
			continue
		}

		name := strings.ToLower(strings.TrimSpace(cells[0]))
		if name == "" || name == "totais" || name == "-" {
			continue
		}

		position := elementPositionMap[name]

		totalSteel := parseFloat(strings.TrimSpace(cells[n-4]))
		concreteVol := parseFloat(strings.TrimSpace(cells[n-3]))
		formArea := parseFloat(strings.TrimSpace(cells[n-2]))
		fckRaw := parseFloat(strings.TrimSpace(cells[n-1]))

		if totalSteel > 0 {
			data.steel = append(data.steel, SteelItem{
				Material:   "rebar",
				Resistance: "CA50",
				Mass:       totalSteel,
				Position:   position,
			})
		}

		if concreteVol > 0 {
			data.concrete = append(data.concrete, ConcreteItem{
				Fck:      int(fckRaw),
				Volume:   concreteVol,
				Position: position,
			})
		}

		if formArea > 0 {
			data.form = append(data.form, FormItem{
				Area:     formArea,
				Position: position,
			})
		}
	}

	if len(data.concrete) == 0 && len(data.steel) == 0 && len(data.form) == 0 {
		return nil
	}

	return data
}

func determineSummaryModuleType(f *floorMaterials) ModuleType {
	hasColumnConcrete := false
	hasBeamConcrete := false
	for _, c := range f.concrete {
		if c.Position == "column" {
			hasColumnConcrete = true
		}
		if c.Position == "beam" {
			hasBeamConcrete = true
		}
	}

	if !hasColumnConcrete && hasBeamConcrete {
		return ModuleTypeConcreteWall
	}
	return ModuleTypeBeamColumn
}
