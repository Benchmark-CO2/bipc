package data

import (
	"fmt"
	"strings"

	"github.com/Benchmark-CO2/bipc/internal/i18n"
	"github.com/Benchmark-CO2/bipc/internal/validator"
)

type Filters struct {
	Page         int
	PageSize     int
	Sort         string
	SortSafelist []string
}

func ValidateFilters(v *validator.Validator, f Filters, lang i18n.Language) {
	v.Check(f.Page > 0, "page", i18n.GetMessage(lang, "validation_greater_than_zero"))
	v.Check(f.Page <= 10_000_000, "page", i18n.GetMessage(lang, "validation_max_10_million"))
	v.Check(f.PageSize > 0, "page_size", i18n.GetMessage(lang, "validation_greater_than_zero"))
	v.Check(f.PageSize <= 50, "page_size", i18n.GetMessage(lang, "validation_max_50"))

	v.Check(validator.PermittedValue(f.Sort, f.SortSafelist...), "sort", fmt.Sprintf(i18n.GetMessage(lang, "validation_valid_sort_value"), strings.Join(f.SortSafelist, ", ")))
}

func (f Filters) sortColumn() string {
	for _, safeValue := range f.SortSafelist {
		if f.Sort == safeValue {
			return strings.TrimPrefix(f.Sort, "-")
		}
	}

	panic("unsafe sort parameter: " + f.Sort)
}

func (f Filters) sortDirection() string {
	if strings.HasPrefix(f.Sort, "-") {
		return "DESC"
	}

	return "ASC"
}

func (f Filters) limit() int {
	return f.PageSize
}

func (f Filters) offset() int {
	return (f.Page - 1) * f.PageSize
}

type Metadata struct {
	CurrentPage  int `json:"current_page,omitzero"`
	PageSize     int `json:"page_size,omitzero"`
	FirstPage    int `json:"first_page,omitzero"`
	LastPage     int `json:"last_page,omitzero"`
	TotalRecords int `json:"total_records,omitzero"`
}

func calculateMetadata(totalRecords, page, pageSize int) Metadata {
	if totalRecords == 0 {
		return Metadata{}
	}

	return Metadata{
		CurrentPage:  page,
		PageSize:     pageSize,
		FirstPage:    1,
		LastPage:     (totalRecords + pageSize - 1) / pageSize,
		TotalRecords: totalRecords,
	}
}
