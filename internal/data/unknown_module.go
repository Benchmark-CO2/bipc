package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Benchmark-CO2/bipc/internal/validator"
	"github.com/google/uuid"
)

var (
	unknownModuleCategories        = []string{"fundação", "estrutura", "vedações"}
	unknownModuleUnits             = []string{"kg", "m2", "m3", "m", "other"}
	ErrInvalidUnknownModuleID      = errors.New("unknown_module_id does not exist or is invalid")
	ErrUnknownModuleAlreadyApplied = errors.New("this module type is already applied to the option")
)

// OccurrenceMaterial is the snapshot of a material inside an occurrence: the
// name/unit describe the material and the quantity belongs to the occurrence.
type OccurrenceMaterial struct {
	Name     string  `json:"name"`
	Unit     string  `json:"unit"`
	Quantity float64 `json:"quantity"`
}

type UnknownModule struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Category    string    `json:"category"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	References  []string  `json:"references,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UnknownModuleOccurrence struct {
	ID              uuid.UUID            `json:"id"`
	OptionID        uuid.UUID            `json:"option_id"`
	UnknownModuleID uuid.UUID            `json:"unknown_module_id"`
	UnknownModule   *UnknownModule       `json:"unknown_module,omitempty"`
	UserID          uuid.UUID            `json:"user_id"`
	Materials       []OccurrenceMaterial `json:"materials"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
}

type UnknownModuleModel struct {
	DB *sql.DB
}

// ValidateUnknownModule validates the user-authored content of a custom module
// type. Materials are not part of the type: each occurrence stores its own
// material snapshot with quantities. The creator is enforced by the caller.
func ValidateUnknownModule(v *validator.Validator, module *UnknownModule) {
	v.Check(validator.PermittedValue(module.Category, unknownModuleCategories...),
		"category", "must be one of: "+strings.Join(unknownModuleCategories, ", "))

	v.Check(module.Name != "", "name", "must be provided")
	v.Check(len(module.Name) <= 200, "name", "must not be more than 200 bytes long")

	v.Check(len(module.Description) <= 2000, "description", "must not be more than 2000 bytes long")

	for i, reference := range module.References {
		v.Check(len(reference) <= 500,
			fmt.Sprintf("references[%d]", i), "must not be more than 500 bytes long")
	}
	v.Check(validator.Unique(module.References), "references", "must not contain duplicates")
}

func materialNameSet(materials []OccurrenceMaterial) bool {
	seen := make(map[string]bool)
	for _, material := range materials {
		if seen[material.Name] {
			return false
		}
		seen[material.Name] = true
	}
	return true
}

// ValidateUnknownModuleOccurrence validates the occurrence-level data: the
// materials of the occurrence (name, unit and per-occurrence quantity).
func ValidateUnknownModuleOccurrence(v *validator.Validator, occurrence *UnknownModuleOccurrence) {
	v.Check(occurrence.UnknownModuleID != uuid.Nil, "unknown_module_id", "must be provided")
	v.Check(materialNameSet(occurrence.Materials), "materials", "must not contain duplicate names")

	for i, material := range occurrence.Materials {
		prefix := fmt.Sprintf("materials[%d]", i)
		v.Check(material.Name != "", prefix+".name", "must be provided")
		v.Check(len(material.Name) <= 200, prefix+".name", "must not be more than 200 bytes long")
		v.Check(validator.PermittedValue(material.Unit, unknownModuleUnits...),
			prefix+".unit", "must be one of: "+strings.Join(unknownModuleUnits, ", "))
		v.Check(material.Quantity >= 0, prefix+".quantity", "cannot be negative")
	}
}

// ---------------------------------------------------------------------------
// UnknownModule type (definition, global to the creator user)
// ---------------------------------------------------------------------------

func (m UnknownModuleModel) insertTypeTx(tx *sql.Tx, ctx context.Context, module *UnknownModule) error {
	referencesBytes, err := json.Marshal(module.References)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO unknown_module (id, user_id, category, name, description, "references")
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`

	err = tx.QueryRowContext(ctx, query,
		module.ID, module.UserID, module.Category, module.Name, module.Description, referencesBytes,
	).Scan(&module.CreatedAt, &module.UpdatedAt)
	if err != nil {
		return err
	}

	return nil
}

func (m UnknownModuleModel) Insert(module *UnknownModule) (*UnknownModule, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := runInTx(ctx, m.DB, func(tx *sql.Tx) error {
		return m.insertTypeTx(tx, ctx, module)
	})
	if err != nil {
		if strings.Contains(err.Error(), "unknown_module_user_id_fkey") {
			return nil, ErrInvalidUserID
		}
		return nil, err
	}

	return module, nil
}

// ---------------------------------------------------------------------------
// Occurrences (instances of a type inside an option, mirroring module.option_id)
// ---------------------------------------------------------------------------

// insertOccurrenceTx persists the occurrence with its per-material quantities
// (snapshot JSONB) in a single row.
func (m UnknownModuleModel) insertOccurrenceTx(tx *sql.Tx, ctx context.Context, occurrence *UnknownModuleOccurrence) error {
	materialsBytes, err := json.Marshal(occurrence.Materials)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO unknown_module_occurrence (id, option_id, unknown_module_id, user_id, materials)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at, updated_at`

	err = tx.QueryRowContext(ctx, query,
		occurrence.ID, occurrence.OptionID, occurrence.UnknownModuleID, occurrence.UserID, materialsBytes,
	).Scan(&occurrence.CreatedAt, &occurrence.UpdatedAt)
	if err != nil {
		return err
	}

	return nil
}

func (m UnknownModuleModel) InsertOccurrence(occurrence *UnknownModuleOccurrence) (*UnknownModuleOccurrence, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := runInTx(ctx, m.DB, func(tx *sql.Tx) error {
		return m.insertOccurrenceTx(tx, ctx, occurrence)
	})
	if err != nil {
		switch {
		case strings.Contains(err.Error(), "unknown_module_occurrence_option_module_unique"):
			return nil, ErrUnknownModuleAlreadyApplied
		case strings.Contains(err.Error(), "unknown_module_occurrence_option_id_fkey"):
			return nil, ErrInvalidOptionID
		case strings.Contains(err.Error(), "unknown_module_occurrence_unknown_module_id_fkey"):
			return nil, ErrInvalidUnknownModuleID
		case strings.Contains(err.Error(), "unknown_module_occurrence_user_id_fkey"):
			return nil, ErrInvalidUserID
		default:
			return nil, err
		}
	}

	return occurrence, nil
}

func scanUnknownModuleRow(rows *sql.Rows) (*UnknownModule, error) {
	var module UnknownModule
	var referencesBytes []byte

	err := rows.Scan(
		&module.ID,
		&module.UserID,
		&module.Category,
		&module.Name,
		&module.Description,
		&referencesBytes,
		&module.CreatedAt,
		&module.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(referencesBytes, &module.References); err != nil {
		return nil, err
	}

	return &module, nil
}

func (m UnknownModuleModel) GetByID(id uuid.UUID) (*UnknownModule, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module UnknownModule
	var referencesBytes []byte

	err := m.DB.QueryRowContext(ctx, `
		SELECT id, user_id, category, name, description, "references", created_at, updated_at
		FROM unknown_module
		WHERE id = $1`, id).Scan(
		&module.ID,
		&module.UserID,
		&module.Category,
		&module.Name,
		&module.Description,
		&referencesBytes,
		&module.CreatedAt,
		&module.UpdatedAt,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	if err := json.Unmarshal(referencesBytes, &module.References); err != nil {
		return nil, err
	}

	return &module, nil
}

// ListByUser returns the module types created by the given user (the creator
// is the owner of the definition).
func (m UnknownModuleModel) ListByUser(userID uuid.UUID) ([]*UnknownModule, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, `
		SELECT id, user_id, category, name, description, "references", created_at, updated_at
		FROM unknown_module
		WHERE user_id = $1
		ORDER BY created_at, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	modules := []*UnknownModule{}
	for rows.Next() {
		module, err := scanUnknownModuleRow(rows)
		if err != nil {
			return nil, err
		}
		modules = append(modules, module)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return modules, nil
}

// getUnknownModulesByOption returns the unknown module occurrences of an
// option with the nested module type (joined by unknown_module_id). Mirror of
// getModuleConsumptionByOption for conventional modules: the same-level
// sibling field of Option.Modules.
func getUnknownModulesByOption(ctx context.Context, db *sql.DB, optionID uuid.UUID) ([]*UnknownModuleOccurrence, error) {
	query := `
		SELECT
			uo.id, uo.option_id, uo.unknown_module_id, uo.user_id, uo.materials, uo.created_at, uo.updated_at,
			um.id, um.user_id, um.category, um.name, um.description, um.references, um.created_at, um.updated_at
		FROM unknown_module_occurrence uo
		JOIN unknown_module um ON um.id = uo.unknown_module_id
		WHERE uo.option_id = $1
		ORDER BY uo.created_at, uo.id`

	rows, err := db.QueryContext(ctx, query, optionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var occurrences = []*UnknownModuleOccurrence{}
	for rows.Next() {
		var occurrence UnknownModuleOccurrence
		var materialsBytes []byte
		var module UnknownModule
		var referencesBytes []byte

		err := rows.Scan(
			&occurrence.ID,
			&occurrence.OptionID,
			&occurrence.UnknownModuleID,
			&occurrence.UserID,
			&materialsBytes,
			&occurrence.CreatedAt,
			&occurrence.UpdatedAt,
			&module.ID,
			&module.UserID,
			&module.Category,
			&module.Name,
			&module.Description,
			&referencesBytes,
			&module.CreatedAt,
			&module.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(materialsBytes, &occurrence.Materials); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(referencesBytes, &module.References); err != nil {
			return nil, err
		}

		occurrence.UnknownModule = &module
		occurrences = append(occurrences, &occurrence)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return occurrences, nil
}
