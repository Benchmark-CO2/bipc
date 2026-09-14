package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Module struct {
	ID                uuid.UUID              `json:"id"`
	Type              string                 `json:"type"`
	OptionID          uuid.UUID              `json:"option_id"`
	Data              map[string]interface{} `json:"data"`
	Source            string                 `json:"-"`
	TotalCO2Min       *float64               `json:"total_co2_min,omitempty"`
	TotalCO2Max       *float64               `json:"total_co2_max,omitempty"`
	TotalEnergyMin    *float64               `json:"total_energy_min,omitempty"`
	TotalEnergyMax    *float64               `json:"total_energy_max,omitempty"`
	TotalMaterial     *float64               `json:"total_material,omitempty"`
	RelativeCO2Min    *float64               `json:"relative_co2_min,omitempty"`
	RelativeCO2Max    *float64               `json:"relative_co2_max,omitempty"`
	RelativeEnergyMin *float64               `json:"relative_energy_min,omitempty"`
	RelativeEnergyMax *float64               `json:"relative_energy_max,omitempty"`
	Outdated          bool                   `json:"outdated"`
	Completed         bool                   `json:"completed"`
	FloorIDs          []uuid.UUID            `json:"floor_ids"`
	FloorIndexes      []int                  `json:"-"`
	UnitID            *uuid.UUID             `json:"unit_id,omitempty"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

type ModuleModel struct {
	DB *sql.DB
	Tx *sql.Tx
}

func validateModuleTargetScope(module *Module) error {
	hasFloors := len(module.FloorIDs) > 0
	hasUnit := module.UnitID != nil

	if hasFloors && hasUnit {
		return errors.New("module cannot have both floor_ids and unit_id")
	}

	if !hasFloors && !hasUnit {
		return errors.New("module must have either floor_ids or unit_id")
	}

	return nil
}

func runInTx(ctx context.Context, db *sql.DB, fn func(tx *sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := fn(tx); err != nil {
		return err
	}

	return tx.Commit()
}

func checkForeignKeyError(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "module_option_id_fkey") {
		return ErrInvalidOptionID
	}
	return err
}

// ---------------------------------------------------------------------------
// Source tagging and fine-grained merge for module data
//
// The canonical stored shape is:
//   - root scalar fields (simple values like slab_type) -> {"value": x, "source": s}
//   - object containers / array items (concrete[], steel[], form[], masonry, raft)
//     -> each object gains a "source" key; interior scalar fields stay plain.
//   - functional fields (denylist) are never tagged.
// ---------------------------------------------------------------------------

var sourceStampDenylist = map[string]bool{
	"type": true, "outdated": true, "floor_ids": true, "unit_id": true, "floor_index": true, "source": true,
}

func sourceKeyDenylisted(key string) bool {
	_, ok := sourceStampDenylist[key]
	return ok
}

func asAnyMap(v interface{}) (map[string]interface{}, bool) {
	m, ok := v.(map[string]interface{})
	return m, ok
}

func asAnyList(v interface{}) ([]interface{}, bool) {
	l, ok := v.([]interface{})
	return l, ok
}

// stampRootMap applies the canonical source shape to a parsed module data object.
func stampRootMap(root map[string]interface{}, source string) map[string]interface{} {
	out := make(map[string]interface{}, len(root))
	for key, value := range root {
		if sourceKeyDenylisted(key) {
			out[key] = value
			continue
		}

		switch v := value.(type) {
		case map[string]interface{}:
			out[key] = stampContainerMap(v, source)
		case []interface{}:
			out[key] = stampListMap(v, source)
		default:
			out[key] = boxScalar(value, source)
		}
	}
	return out
}

// boxScalar wraps a simple value in the canonical {value, source} box. When
// source is empty the "source" key is omitted (no explicit origin).
func boxScalar(value interface{}, source string) map[string]interface{} {
	m := map[string]interface{}{"value": value}
	if source != "" {
		m["source"] = source
	}
	return m
}

// setContainerSource adds/moves the "source" tag to an object container. It is
// a no-op for an empty source (container keeps no explicit origin).
func setContainerSource(m map[string]interface{}, source string) {
	if source == "" {
		return
	}
	if _, has := m["source"]; !has {
		m["source"] = source
	}
}

// stampContainerMap tags a single object (array item or grouped object) with
// "source" while leaving its scalar fields plain.
func stampContainerMap(m map[string]interface{}, source string) map[string]interface{} {
	out := make(map[string]interface{}, len(m))
	for key, value := range m {
		if sourceKeyDenylisted(key) {
			out[key] = value
			continue
		}

		switch v := value.(type) {
		case map[string]interface{}:
			out[key] = stampContainerMap(v, source)
		case []interface{}:
			out[key] = stampListMap(v, source)
		default:
			out[key] = v
		}
	}
	setContainerSource(out, source)
	return out
}

func stampListMap(list []interface{}, source string) []interface{} {
	if len(list) == 0 {
		return list
	}

	allObjects := true
	for _, item := range list {
		if _, ok := asAnyMap(item); !ok {
			allObjects = false
			break
		}
	}
	if !allObjects {
		return list
	}

	out := make([]interface{}, 0, len(list))
	for _, item := range list {
		itemMap, _ := asAnyMap(item)
		out = append(out, stampContainerMap(itemMap, source))
	}
	return out
}

// StandardizeSource returns the source untouched. Empty means "no explicit
// source" and results in no source tag being written for changed values.
func StandardizeSource(source string) string {
	return source
}

// stampModuleData parses and re-applies the canonical source shape to a data map.
func stampModuleData(data map[string]interface{}, source string) (map[string]interface{}, error) {
	bytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(bytes, &parsed); err != nil {
		return nil, err
	}

	return stampRootMap(parsed, StandardizeSource(source)), nil
}

// ---------------------------------------------------------------------------
// Fine-grained merge for updates: only changed values are rewritten, preserving
// the original source of untouched values.
// ---------------------------------------------------------------------------

func unwrapScalarValue(v interface{}) interface{} {
	if m, ok := asAnyMap(v); ok {
		if val, has := m["value"]; has {
			return val
		}
	}
	return v
}

func sourceOfValue(v interface{}) string {
	if m, ok := asAnyMap(v); ok {
		if s, has := m["source"]; has {
			if str, isStr := s.(string); isStr {
				return str
			}
		}
	}

	return ""
}

func numericScalar(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	case uint64:
		return float64(val), true
	}
	return 0, false
}

func scalarValuesEqual(a, b interface{}) bool {
	a = unwrapScalarValue(a)
	b = unwrapScalarValue(b)

	af, aok := numericScalar(a)
	bf, bok := numericScalar(b)
	if aok && bok {
		return af == bf
	}
	if aok != bok {
		return false
	}

	return a == b
}

// containerObjectsEqual compares two container objects ignoring the "source" marker.
func containerObjectsEqual(a, b map[string]interface{}) bool {
	keysA := make([]string, 0, len(a))
	for key := range a {
		if key == "source" {
			continue
		}
		keysA = append(keysA, key)
	}

	for _, key := range keysA {
		if _, present := b[key]; !present {
			return false
		}
		if !valuesEqualIgnoreSource(a[key], b[key]) {
			return false
		}
	}

	return true
}

func valuesEqualIgnoreSource(a, b interface{}) bool {
	switch av := a.(type) {
	case map[string]interface{}:
		bv, ok := asAnyMap(b)
		if !ok {
			return false
		}
		return containerObjectsEqual(av, bv)
	case []interface{}:
		bv, ok := asAnyList(b)
		if !ok || len(av) != len(bv) {
			return false
		}
		for i := range av {
			if !valuesEqualIgnoreSource(av[i], bv[i]) {
				return false
			}
		}
		return true
	default:
		return scalarValuesEqual(av, b)
	}
}

func stampNewValue(key string, value interface{}, source string) interface{} {
	if sourceKeyDenylisted(key) {
		return value
	}

	switch v := value.(type) {
	case map[string]interface{}:
		return stampContainerMap(v, source)
	case []interface{}:
		return stampListMap(v, source)
	default:
		return boxScalar(v, source)
	}
}

// mergeRootData merges incoming (plain, typed) data over existing (canonical,
// tagged) data, retagging only the values that effectively changed.
func mergeRootData(existing, incoming map[string]interface{}, source string) map[string]interface{} {
	source = StandardizeSource(source)
	result := make(map[string]interface{}, len(incoming))

	for key, newValue := range incoming {
		if sourceKeyDenylisted(key) {
			result[key] = newValue
			continue
		}

		hasOld := false
		var oldValue interface{}
		if val, ok := existing[key]; ok {
			oldValue = val
			hasOld = true
		}

		if !hasOld {
			result[key] = stampNewValue(key, newValue, source)
			continue
		}

		result[key] = mergeRootValue(key, oldValue, newValue, source)
	}

	// preserve existing keys that are absent from the incoming payload
	for key, oldValue := range existing {
		if _, present := incoming[key]; !present {
			result[key] = oldValue
		}
	}

	return result
}

func mergeRootValue(key string, oldValue, newValue interface{}, source string) interface{} {
	switch nv := newValue.(type) {
	case []interface{}:
		oldList, ok := asAnyList(oldValue)
		if !ok {
			return stampListMap(nv, source)
		}
		return mergeSourceList(oldList, nv, source)
	case map[string]interface{}:
		oldMap, ok := asAnyMap(oldValue)
		if !ok {
			return stampContainerMap(nv, source)
		}
		return mergeContainerMap(oldMap, nv, source)
	default:
		if scalarValuesEqual(oldValue, newValue) {
			return oldValue
		}
		return boxScalar(newValue, source)
	}
}

func mergeContainerMap(oldMap, newMap map[string]interface{}, source string) map[string]interface{} {
	if containerObjectsEqual(oldMap, newMap) {
		return oldMap
	}

	out := make(map[string]interface{}, len(oldMap)+len(newMap))
	for key, value := range oldMap {
		out[key] = value
	}

	for key, newValue := range newMap {
		if sourceKeyDenylisted(key) {
			out[key] = newValue
			continue
		}

		if oldPresent := out[key]; oldPresent != nil {
			out[key] = mergeContainerValue(key, oldPresent, newValue, source)
		} else {
			out[key] = stampNewValue(key, newValue, source)
		}
	}

	// Re-check whether anything actually changed relative to the old container.
	// If it did, the item is considered altered: it must receive the resolved
	// source. Otherwise it preserves its original source. An empty source means
	// no tag is (re)written.
	if containerObjectsEqual(out, oldMap) {
		setContainerSource(out, source)
		return out
	}

	if source != "" {
		out["source"] = source
	}
	return out
}

func mergeContainerValue(key string, oldValue, newValue interface{}, source string) interface{} {
	switch nv := newValue.(type) {
	case []interface{}:
		oldList, ok := asAnyList(oldValue)
		if !ok {
			return stampListMap(nv, source)
		}
		return mergeSourceList(oldList, nv, source)
	case map[string]interface{}:
		oldMap, ok := asAnyMap(oldValue)
		if !ok {
			return stampContainerMap(nv, source)
		}
		return mergeContainerMap(oldMap, nv, source)
	default:
		if scalarValuesEqual(oldValue, newValue) {
			return oldValue
		}
		// interior scalar of a container stays plain
		return newValue
	}
}

func scalarKeyString(v interface{}) string {
	switch val := v.(type) {
	case string:
		return "s:"+val
	case bool:
		if val {
			return "b:1"
		}
		return "b:0"
	case float64:
		return "n:"+strconv.FormatFloat(val, 'f', -1, 64)
	case float32:
		return "n:"+strconv.FormatFloat(float64(val), 'f', -1, 32)
	case int:
		return "n:"+strconv.Itoa(val)
	case int64:
		return "n:"+strconv.FormatInt(val, 10)
	default:
		return ""
	}
}

// listItemKey returns a stable match key for an array item: its "position"
// when present, otherwise a compact string of its scalar fields.
func listItemKey(item interface{}) (string, bool) {
	m, ok := asAnyMap(item)
	if !ok {
		return "", false
	}

	if pos, present := m["position"]; present {
		if s, isStr := pos.(string); isStr {
			return "p:"+s, true
		}
		return "p:", true
	}

	// Fallback for position-less arrays: deterministic encoding of scalar fields.
	return "s:"+scalarKeyStringOfMap(m), true
}

func scalarKeyStringOfMap(m map[string]interface{}) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	// insertion sort (small N), deterministic independent of map iteration order
	for i := 1; i < len(keys); i++ {
		x := keys[i]
		j := i-1
		for j >= 0 && keys[j] > x {
			keys[j+1] = keys[j]
			j--
		}
		keys[j+1] = x
	}

	out := ""
	for _, k := range keys {
		if k == "source" {
			continue
		}
		out += k+"="+scalarKeyString(m[k])+";"
	}
	return out
}

func mergeSourceList(oldList, newList []interface{}, source string) []interface{} {
	result := make([]interface{}, 0, len(newList))
	consumed := make([]bool, len(oldList))

	for _, newItem := range newList {
		newItemMap, isObject := asAnyMap(newItem)

		var matchedOld interface{}
		matchedIndex := -1

		if isObject {
			newKey, _ := listItemKey(newItemMap)
			for i := range oldList {
				if consumed[i] {
					continue
				}
				oldItem, ok := asAnyMap(oldList[i])
				if !ok {
					continue
				}
				oldKey, _ := listItemKey(oldItem)
				if oldKey == newKey {
					matchedOld = oldList[i]
					matchedIndex = i
					break
				}
			}
		}

		if matchedIndex >= 0 {
			consumed[matchedIndex] = true
			oldItemMap, _ := asAnyMap(matchedOld)
			result = append(result, mergeContainerMap(oldItemMap, newItemMap, source))
		} else {
			result = append(result, stampContainerMap(newItemMap, source))
		}
	}

	return result
}

func insertModuleTargetConsumptions(tx *sql.Tx, ctx context.Context, targets []ModuleTargetConsumption) error {
	insertQuery := `
		INSERT INTO module_target_consumption 
		(id, module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max, material)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	for _, target := range targets {
		target.ID = uuid.Must(uuid.NewV7())
		_, err := tx.ExecContext(ctx, insertQuery,
			target.ID, target.ModuleID, target.TargetID, target.TargetType, target.RoleID, target.OptionID,
			target.CO2Min, target.CO2Max, target.EnergyMin, target.EnergyMax, target.Material)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m ModuleModel) UpsertModuleTargetConsumptions(moduleID uuid.UUID, targets []ModuleTargetConsumption) error {
	if len(targets) == 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := m.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO module_target_consumption
		(module_id, target_id, target_type, role_id, option_id, co2_min, co2_max, energy_min, energy_max, material)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (module_id, target_id)
		DO UPDATE SET
			target_type = EXCLUDED.target_type,
			role_id = EXCLUDED.role_id,
			option_id = EXCLUDED.option_id,
			co2_min = EXCLUDED.co2_min,
			co2_max = EXCLUDED.co2_max,
			energy_min = EXCLUDED.energy_min,
			energy_max = EXCLUDED.energy_max,
			material = EXCLUDED.material`

	for _, target := range targets {
		_, err := tx.ExecContext(ctx, query,
			target.ModuleID,
			target.TargetID,
			target.TargetType,
			target.RoleID,
			target.OptionID,
			target.CO2Min,
			target.CO2Max,
			target.EnergyMin,
			target.EnergyMax,
			target.Material,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m ModuleModel) ListModuleIDsMissingConsumption() ([]uuid.UUID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT DISTINCT m.id
		FROM module m
		INNER JOIN module_target_consumption mtc ON m.id = mtc.module_id
		WHERE mtc.material IS NULL
		  AND NOT EXISTS (
			SELECT 1
			FROM module_target_consumption mtc_floor
			LEFT JOIN floor f ON f.id = mtc_floor.target_id
			WHERE mtc_floor.module_id = m.id
			  AND mtc_floor.target_type = 'floor'
			  AND (f.id IS NULL OR COALESCE(f.area, 0) = 0)
		  )
		  AND NOT EXISTS (
			SELECT 1
			FROM module_target_consumption mtc_unit
			WHERE mtc_unit.module_id = m.id
			  AND mtc_unit.target_type = 'unit'
			  AND COALESCE((
				SELECT SUM(f.area)
				FROM floor f
				WHERE f.unit_id = mtc_unit.target_id
			), 0) = 0
		  )`

	rows, err := m.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	moduleIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		var moduleID uuid.UUID
		err := rows.Scan(&moduleID)
		if err != nil {
			return nil, err
		}
		moduleIDs = append(moduleIDs, moduleID)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return moduleIDs, nil
}

func (m ModuleModel) insertTx(tx *sql.Tx, module *Module) (*Module, error) {
	moduleData, err := stampModuleData(module.Data, module.Source)
	if err != nil {
		return nil, err
	}
	module.Data = moduleData

	jsonData, err := json.Marshal(module.Data)
	if err != nil {
		return nil, err
	}

	query := `
        INSERT INTO module (id, option_id, type, data,
			total_co2_min, total_co2_max, total_energy_min, total_energy_max, total_material,
			relative_co2_min, relative_co2_max, relative_energy_min, relative_energy_max,
			outdated, completed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING created_at, updated_at`

	err = tx.QueryRowContext(context.Background(), query,
		module.ID, module.OptionID, module.Type, jsonData,
		module.TotalCO2Min, module.TotalCO2Max, module.TotalEnergyMin, module.TotalEnergyMax, module.TotalMaterial,
		module.RelativeCO2Min, module.RelativeCO2Max, module.RelativeEnergyMin, module.RelativeEnergyMax,
		module.Outdated, module.Completed,
	).Scan(&module.CreatedAt, &module.UpdatedAt)

	if err != nil {
		return nil, checkForeignKeyError(err)
	}

	return module, nil
}

func (m ModuleModel) validateModuleTargets(tx *sql.Tx, ctx context.Context, module *Module) error {
	var optionUnitID uuid.UUID

	err := tx.QueryRowContext(ctx, `SELECT unit_id FROM options WHERE id = $1`, module.OptionID).Scan(&optionUnitID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrInvalidOptionID
		}
		return err
	}

	if module.UnitID != nil && *module.UnitID != optionUnitID {
		return ErrInvalidUnitID
	}

	if len(module.FloorIDs) == 0 {
		return nil
	}

	var validFloorCount int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM floor
		WHERE unit_id = $1 AND id = ANY($2)`, optionUnitID, pq.Array(module.FloorIDs)).Scan(&validFloorCount)
	if err != nil {
		return err
	}

	if validFloorCount != len(module.FloorIDs) {
		return ErrInvalidFloorID
	}

	return nil
}

func (m ModuleModel) insertWithTx(tx *sql.Tx, ctx context.Context, module *Module, targets []ModuleTargetConsumption) (*Module, error) {
	if err := m.validateModuleTargets(tx, ctx, module); err != nil {
		return nil, err
	}

	_, err := m.insertTx(tx, module)
	if err != nil {
		return nil, err
	}

	if err := insertModuleTargetConsumptions(tx, ctx, targets); err != nil {
		return nil, err
	}

	return module, nil
}

func (m ModuleModel) Insert(module *Module, targets []ModuleTargetConsumption) (*Module, error) {
	if err := validateModuleTargetScope(module); err != nil {
		return nil, err
	}

	if m.Tx != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		return m.insertWithTx(m.Tx, ctx, module, targets)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := runInTx(ctx, m.DB, func(tx *sql.Tx) error {
		_, txErr := m.insertWithTx(tx, ctx, module, targets)
		return txErr
	})
	if err != nil {
		return nil, err
	}

	return m.Get(module.ID)
}

func (m ModuleModel) Get(id uuid.UUID) (*Module, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var module Module
	var jsonData []byte

	query := `
		SELECT 
			m.id, m.option_id, m.type, m.data,
			m.completed,
			m.total_co2_min, m.total_co2_max, m.total_energy_min, m.total_energy_max, m.total_material,
			m.relative_co2_min, m.relative_co2_max, m.relative_energy_min, m.relative_energy_max,
			m.outdated, m.created_at, m.updated_at
		FROM module m
		WHERE m.id = $1`

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&module.ID, &module.OptionID, &module.Type, &jsonData,
		&module.Completed,
		&module.TotalCO2Min, &module.TotalCO2Max, &module.TotalEnergyMin, &module.TotalEnergyMax, &module.TotalMaterial,
		&module.RelativeCO2Min, &module.RelativeCO2Max, &module.RelativeEnergyMin, &module.RelativeEnergyMax,
		&module.Outdated, &module.CreatedAt, &module.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRecordNotFound
		}
		return nil, err
	}

	if err := json.Unmarshal(jsonData, &module.Data); err != nil {
		return nil, err
	}

	rows, err := m.DB.QueryContext(ctx, `
		SELECT DISTINCT target_id FROM module_target_consumption 
		WHERE module_id = $1 AND target_type = 'floor'`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var floorIDs []uuid.UUID
	for rows.Next() {
		var floorID uuid.UUID
		if err := rows.Scan(&floorID); err != nil {
			return nil, err
		}
		floorIDs = append(floorIDs, floorID)
	}
	module.FloorIDs = floorIDs

	if len(floorIDs) > 0 {
		floorIndexRows, err := m.DB.QueryContext(ctx, `
			SELECT id, "index" FROM floor WHERE id = ANY($1)`, pq.Array(floorIDs))
		if err != nil {
			return nil, err
		}
		defer floorIndexRows.Close()

		floorIndices := make([]int, 0, len(floorIDs))
		for floorIndexRows.Next() {
			var floorID uuid.UUID
			var floorIndex int
			if err := floorIndexRows.Scan(&floorID, &floorIndex); err != nil {
				return nil, err
			}
			floorIndices = append(floorIndices, floorIndex)
		}

		if err := floorIndexRows.Err(); err != nil {
			return nil, err
		}

		module.FloorIndexes = floorIndices
	}

	var unitID uuid.UUID
	err = m.DB.QueryRowContext(ctx, `
		SELECT DISTINCT target_id FROM module_target_consumption 
		WHERE module_id = $1 AND target_type = 'unit'`, id).Scan(&unitID)
	if err == nil {
		module.UnitID = &unitID
	} else if err != sql.ErrNoRows {
		return nil, err
	}

	return &module, nil
}

func (m ModuleModel) updateTx(tx *sql.Tx, module *Module) error {
	query := `SELECT id, data FROM module WHERE id = $1 AND type = $2`
	var existingID uuid.UUID
	var existingDataBytes []byte
	err := tx.QueryRowContext(context.Background(), query, module.ID, module.Type).Scan(&existingID, &existingDataBytes)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrRecordNotFound
		}
		return err
	}

	// Load existing canonical data + merge only changed values, preserving the
	// source of untouched values.
	var parsedIncoming map[string]interface{}
	incomingBytes, err := json.Marshal(module.Data)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(incomingBytes, &parsedIncoming); err != nil {
		return err
	}

	var existingParsed map[string]interface{}
	if len(existingDataBytes) > 0 {
		if err := json.Unmarshal(existingDataBytes, &existingParsed); err != nil {
			return err
		}
	}

	var mergedData map[string]interface{}
	if len(existingParsed) == 0 {
		mergedData, err = stampModuleData(parsedIncoming, module.Source)
	} else {
		mergedData = mergeRootData(existingParsed, parsedIncoming, module.Source)
	}
	if err != nil {
		return err
	}

	jsonData, err := json.Marshal(mergedData)
	if err != nil {
		return err
	}

	query = `
        UPDATE module
        SET data = $1,
            total_co2_min = $2, total_co2_max = $3,
			total_energy_min = $4, total_energy_max = $5,
			total_material = $6,
			relative_co2_min = $7, relative_co2_max = $8,
			relative_energy_min = $9, relative_energy_max = $10,
            outdated = FALSE,
            completed = $12,
            updated_at = NOW()
		WHERE id = $11`

	_, err = tx.ExecContext(context.Background(), query,
		jsonData,
		module.TotalCO2Min, module.TotalCO2Max,
		module.TotalEnergyMin, module.TotalEnergyMax,
		module.TotalMaterial,
		module.RelativeCO2Min, module.RelativeCO2Max,
		module.RelativeEnergyMin, module.RelativeEnergyMax,
		module.ID, module.Completed)

	return err
}

func (m ModuleModel) Update(module *Module, targets []ModuleTargetConsumption) error {
	if err := validateModuleTargetScope(module); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return runInTx(ctx, m.DB, func(tx *sql.Tx) error {
		if err := m.validateModuleTargets(tx, ctx, module); err != nil {
			return err
		}

		if err := m.updateTx(tx, module); err != nil {
			return err
		}

		_, err := tx.ExecContext(ctx, "DELETE FROM module_target_consumption WHERE module_id = $1", module.ID)
		if err != nil {
			return err
		}

		return insertModuleTargetConsumptions(tx, ctx, targets)
	})
}

func (m ModuleModel) Delete(id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	return runInTx(ctx, m.DB, func(tx *sql.Tx) error {
		query := `DELETE FROM module WHERE id = $1`
		result, err := tx.ExecContext(ctx, query, id)
		if err != nil {
			return err
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if rowsAffected == 0 {
			return ErrRecordNotFound
		}

		return nil
	})
}

func (m ModuleModel) GetModuleType(id uuid.UUID) (string, error) {
	query := `
		SELECT type
		FROM module
		WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var moduleType string
	err := m.DB.QueryRowContext(ctx, query, id).Scan(&moduleType)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", ErrRecordNotFound
		}
		return "", err
	}

	return moduleType, nil
}

func (m ModuleModel) HasModulesForUnit(tx *sql.Tx, unitID uuid.UUID) (bool, error) {
	query := `
		SELECT COUNT(DISTINCT m.id)
		FROM module m
		INNER JOIN module_target_consumption mtc ON m.id = mtc.module_id
		INNER JOIN floor f ON mtc.target_id = f.id AND mtc.target_type = 'floor'
		WHERE f.unit_id = $1`

	var moduleCount int
	err := tx.QueryRow(query, unitID).Scan(&moduleCount)
	if err != nil {
		return false, err
	}

	return moduleCount > 0, nil
}

func (m ModuleModel) MarkModulesAsOutdatedForUnit(tx *sql.Tx, unitID uuid.UUID) error {
	query := `
		UPDATE module m
		SET outdated = TRUE
		FROM module_target_consumption mtc
		INNER JOIN floor f ON mtc.target_id = f.id AND mtc.target_type = 'floor'
		WHERE m.id = mtc.module_id AND f.unit_id = $1`

	_, err := tx.Exec(query, unitID)
	return err
}

func (m ModuleModel) MarkModulesAsOutdatedForFloors(tx *sql.Tx, floorIDs []uuid.UUID) error {
	query := `
		UPDATE module m
		SET outdated = TRUE
		FROM module_target_consumption mtc
		WHERE m.id = mtc.module_id 
			AND mtc.target_type = 'floor' 
			AND mtc.target_id = ANY($1)`

	_, err := tx.Exec(query, pq.Array(floorIDs))
	return err
}

// tallyDataSources walks a module data object and counts, per source, the number
// of tagged occurrences: boxed scalars ({value}) count once each, and object
// container items (e.g. concrete[], masonry, raft) count once each. Occurrences
// with no explicit source (missing or empty) are attributed to "manual". The
// root data map itself is walked but never counted as an occurrence.
func tallyDataSources(v interface{}, counts map[string]int) {
	switch root := v.(type) {
	case map[string]interface{}:
		for key, child := range root {
			if key == "source" {
				continue
			}
			tallyDataSource(child, counts)
		}
	case []interface{}:
		for _, item := range root {
			tallyDataSources(item, counts)
		}
	}
}

func tallyDataSource(v interface{}, counts map[string]int) {
	switch val := v.(type) {
	case map[string]interface{}:
		// Boxed scalar ({value, ?source}) is a single leaf occurrence.
		if _, isBox := val["value"]; isBox {
			counts[dataSourceOf(val)]++
			return
		}
		// Object container (item/object) counts once, then recurses into children.
		counts[dataSourceOf(val)]++
		for key, child := range val {
			if key == "source" {
				continue
			}
			tallyDataSource(child, counts)
		}
	case []interface{}:
		for _, item := range val {
			tallyDataSource(item, counts)
		}
	default:
		return
	}
}

// dataSourceOf returns the source tag of an object map, falling back to "manual"
// when it is absent or empty. The "manual" fallback happens only here, at
// aggregation time, and is never written to the stored data.
func dataSourceOf(m map[string]interface{}) string {
	if s, ok := m["source"].(string); ok && s != "" {
		return s
	}
	return "manual"
}

func roundSourcePercent(value float64) float64 {
	return math.Round(value*100)/100
}

// SourceDistribution returns the percentage composition of the data sources
// across all modules of a project, keyed by source name, e.g.
// {manual: 50, tqs: 30, plugin: 10, ifc: 10}. When the project has no
// tagged data it returns an empty map.
func (m ModuleModel) SourceDistribution(projectID uuid.UUID) (map[string]float64, error) {
	query := `
		SELECT m.data
		FROM module m
		INNER JOIN options o ON o.id = m.option_id
		INNER JOIN units u ON u.id = o.unit_id
		WHERE u.project_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var jsonData []byte
		if err := rows.Scan(&jsonData); err != nil {
			return nil, err
		}
		if len(jsonData) == 0 {
			continue
		}

		var dataMap map[string]interface{}
		if err := json.Unmarshal(jsonData, &dataMap); err != nil {
			return nil, err
		}
		tallyDataSources(dataMap, counts)
	}

	total := 0
	for _, count := range counts {
		total += count
	}
	if total == 0 {
		return map[string]float64{}, nil
	}

	result := make(map[string]float64, len(counts))
	for source, count := range counts {
		result[source] = roundSourcePercent(float64(count)*100/float64(total))
	}
	return result, nil
}
