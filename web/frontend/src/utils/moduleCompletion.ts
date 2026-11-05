import type { TModulesTypes, TModuleDataV2 } from "@/types/modules";
import moduleSchema from "@/schemas/module-schema.json";
import { parseNumber } from "@/utils/numbers";

type SchemaModuleKey = keyof typeof moduleSchema.modules;

export interface ModuleCompletionI18n {
  getFieldLabel: (key: string) => string;
  getReason: (key: string) => string;
}

export interface MissingFieldInfo {
  key: string;
  label: string;
  reason: string;
}

export interface CompletionPositionWarning {
  field: "concrete" | "steel" | "form";
  index: number;
  invalidPosition: string;
  acceptedPositions: string[];
}

export interface CalculateModuleCompletionOpts {
  fallbackUnitId?: string | null | undefined;
}

export interface CompletionResult {
  completed: boolean;
  missing: MissingFieldInfo[];
  warnings: CompletionPositionWarning[];
}

const SCHEMA_KEY_MAP: Record<TModulesTypes, SchemaModuleKey> = {
  beam_column: "beam_column",
  concrete_wall: "concrete_wall",
  structural_masonry: "structural_masonry",
  raft_foundation: "raft_foundation",
  piles_foundation: "piles_foundation",
  raft_piles_foundation: "raft_piles_foundation",
};

export const STRUCTURE_TYPES: Set<TModulesTypes> = new Set([
  "beam_column",
  "concrete_wall",
  "structural_masonry",
]) as Set<TModulesTypes>;
export const FOUNDATION_TYPES: Set<TModulesTypes> = new Set([
  "raft_foundation",
  "piles_foundation",
  "raft_piles_foundation",
]) as Set<TModulesTypes>;
// Suppress TS6133: os tipos são exportados para uso externo (ex.: ifcStepper.ts, Step2ModulesView)
[STRUCTURE_TYPES, FOUNDATION_TYPES];

const EMPTY_POSITION_VALUES = new Set([
  "",
  "geral",
  "general",
  "unspecified",
  "__geral__",
]);

export function normalizeFloorIndexToArray(
  v: number | number[] | undefined | null,
): { valid: true; values: number[] } | { valid: false; reason?: string } {
  if (v === undefined || v === null) return { valid: false, reason: "missing" };
  if (typeof v === "number") {
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0)
      return { valid: false, reason: "invalid_single" };
    return { valid: true, values: [v] };
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return { valid: false, reason: "empty_array" };
    const seen = new Set<number>();
    const out: number[] = [];
    for (const n of v) {
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
        return { valid: false, reason: "invalid_item" };
      if (seen.has(n)) return { valid: false, reason: "duplicate" };
      seen.add(n);
      out.push(n);
    }
    return { valid: true, values: out };
  }
  return { valid: false, reason: "wrong_type" };
}

function normalizePosition(pos: string | undefined): string | undefined {
  if (pos === undefined || pos === null) return undefined;
  const trimmed = typeof pos === "string" ? pos.trim().toLowerCase() : "";
  return EMPTY_POSITION_VALUES.has(trimmed) ? undefined : trimmed;
}

function isValidPositionOrEmpty(
  pos: string | undefined,
  validPositions: Set<string>,
): boolean {
  const normalized = normalizePosition(pos);
  if (!normalized) return true;
  return validPositions.has(normalized);
}

const VALID_STEEL_MATERIALS = new Set([
  "general",
  "rebar",
  "mesh",
  "strand",
  "other",
]);
const VALID_STEEL_RESISTANCES = new Set(["CA50", "CA60", "CP190", "other"]);
// Positions the backend accepts per type (*ValidPositions in
// internal/modules/*.go), read from the schema copy instead of a hand-written
// table that had drifted (piles accepted only "pile").
const VALID_POSITIONS_BY_TYPE = Object.fromEntries(
  Object.entries(SCHEMA_KEY_MAP).map(([type, schemaKey]) => [
    type,
    new Set<string>(
      (moduleSchema.modules[schemaKey] as { positions?: string[] })
        .positions ?? [],
    ),
  ]),
) as Record<TModulesTypes, Set<string>>;

// Resistances the backend accepts (supportedBlockFbkValues,
// supportedMortarFakValues and sidacGroutData in internal/modules/materials.go).
// Any other value is saved with completed=false. Also used as the select
// options in masonry-section.tsx.
export const SUPPORTED_BLOCK_FBK: readonly number[] = [
  4.5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26,
];
export const SUPPORTED_MORTAR_FAK: readonly number[] = [
  4.5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24,
];
export const SUPPORTED_GROUT_FGK: readonly number[] = [
  15, 20, 25, 30, 35, 40, 45, 50,
];

export function isSupportedValue(
  value: unknown,
  supported: readonly number[],
): boolean {
  const n = typeof value === "number" ? value : parseNumber(String(value ?? ""));
  return Number.isFinite(n) && supported.includes(n);
}

function hasDuplicateValue(values: unknown[]): boolean {
  const seen = new Set<number>();
  for (const v of values) {
    const n = typeof v === "number" ? v : parseNumber(String(v ?? ""));
    if (!Number.isFinite(n)) continue;
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isNonZeroNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0;
  }
  return false;
}

function isValidFloorIndex(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  let normalized: number | number[] | undefined | null;
  if (typeof value === "number" || Array.isArray(value)) {
    normalized = value as number | number[];
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return false;
    normalized = n;
  } else {
    return false;
  }
  const result = normalizeFloorIndexToArray(normalized);
  return result.valid && result.values.length > 0;
}

function toRoundedNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }
  return undefined;
}

// Mirrors validatePositionedConcrete (internal/modules/common.go) on the items
// that survive cleanZeroItemsBeforeSubmit (volume > 0): every one needs an
// fck, a valid (or empty) position, and a unique fck per position.
function validateConcreteArray(
  concreteArr: unknown[],
  type: TModulesTypes,
): {
  hasItems: boolean;
  issues: string[];
  positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }>;
} {
  const validPositions = VALID_POSITIONS_BY_TYPE[type];
  const acceptedList = Array.from(validPositions);
  const seen = new Set<string>();
  const issues = new Set<string>();
  let hasItems = false;
  const positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }> = [];
  (concreteArr as unknown[]).forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const el = item as Record<string, unknown>;
    const pos = typeof el.position === "string" ? el.position : undefined;
    const validPosOrEmpty = isValidPositionOrEmpty(pos, validPositions);
    if (!validPosOrEmpty && typeof pos === "string" && pos.trim() !== "") {
      positionWarnings.push({
        index: i,
        invalidPosition: pos.trim(),
        accepted: acceptedList,
      });
    }
    if (!isNonZeroNumber(el.volume)) return;
    hasItems = true;
    if (!validPosOrEmpty) issues.add("concrete.position");
    // Same normalization as the payload (toInt in cleanZeroItemsBeforeSubmit).
    const fck = toRoundedNumber(el.fck);
    if (fck === undefined || fck <= 0) {
      issues.add("concrete.fck");
      return;
    }
    const key = `${normalizePosition(pos) ?? "__no_pos__"}:${fck}`;
    if (seen.has(key)) issues.add("concrete.duplicate");
    seen.add(key);
  });
  return { hasItems, issues: Array.from(issues), positionWarnings };
}

export interface SteelItemIssue {
  index: number;
  reasonKey: string;
}

function validateSteelArray(
  steelArr: unknown[],
  type: TModulesTypes,
): {
  valid: boolean;
  hasValidItem: boolean;
  issues: SteelItemIssue[];
  positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }>;
} {
  const validPositions = VALID_POSITIONS_BY_TYPE[type];
  const acceptedList = Array.from(validPositions);
  const issues: SteelItemIssue[] = [];
  const positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }> = [];
  let hasValidItem = false;
  steelArr.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      issues.push({ index: i, reasonKey: "steel.item_invalid" });
      return;
    }
    const el = item as Record<string, unknown>;
    const mat = typeof el.material === "string" ? el.material.trim() : "";
    const res = typeof el.resistance === "string" ? el.resistance.trim() : "";
    const pos = typeof el.position === "string" ? el.position.trim() : "";
    if (!mat || !VALID_STEEL_MATERIALS.has(mat)) {
      issues.push({ index: i, reasonKey: "steel.material" });
    }
    if (!res || !VALID_STEEL_RESISTANCES.has(res)) {
      issues.push({ index: i, reasonKey: "steel.resistance" });
    }
    if (!isValidPositionOrEmpty(pos, validPositions)) {
      issues.push({ index: i, reasonKey: "steel.position" });
      if (pos !== "") {
        positionWarnings.push({
          index: i,
          invalidPosition: pos,
          accepted: acceptedList,
        });
      }
    }
    if (typeof el.mass !== "undefined" && !isNonZeroNumber(el.mass)) {
      issues.push({ index: i, reasonKey: "steel.mass" });
    }
    // Same rules as the backend's ValidateSteelMaterials: other_name depends on
    // the material, other_resistance on the resistance.
    const hasOtherName =
      typeof el.other_name === "string" && el.other_name.trim() !== "";
    const hasOtherResistance = isNonZeroNumber(el.other_resistance);
    if (mat === "other" && !hasOtherName) {
      issues.push({ index: i, reasonKey: "steel.other_name" });
    }
    if (res === "other" && !hasOtherResistance) {
      issues.push({ index: i, reasonKey: "steel.other_resistance" });
    }
    const isItemValid =
      mat &&
      VALID_STEEL_MATERIALS.has(mat) &&
      res &&
      VALID_STEEL_RESISTANCES.has(res) &&
      isValidPositionOrEmpty(pos, validPositions) &&
      (typeof el.mass === "undefined" || isNonZeroNumber(el.mass)) &&
      (mat !== "other" || hasOtherName) &&
      (res !== "other" || hasOtherResistance);
    if (isItemValid) hasValidItem = true;
  });
  const uniqueIssues: SteelItemIssue[] = [];
  const seenKeys = new Set<string>();
  for (const iss of issues) {
    const k = iss.reasonKey;
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      uniqueIssues.push(iss);
    }
  }
  return {
    valid: isNonEmptyArray(steelArr) && hasValidItem && issues.length === 0,
    hasValidItem,
    issues: uniqueIssues,
    positionWarnings,
  };
}

// Form is optional, but the backend still validates every item it receives
// (validatePositionedForm in internal/modules/common.go): a filled position
// must be valid for the type, and a position (including "no position") can
// appear only once. Items with area <= 0 are dropped by
// cleanZeroItemsBeforeSubmit, so they are ignored here.
function validateFormItems(
  formArr: unknown[],
  type: TModulesTypes,
): {
  issues: string[];
  positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }>;
} {
  const validPositions = VALID_POSITIONS_BY_TYPE[type];
  const acceptedList = Array.from(validPositions);
  const seenPositions = new Set<string>();
  const issues = new Set<string>();
  const positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }> = [];
  for (const [i, item] of formArr.entries()) {
    if (!item || typeof item !== "object") continue;
    const el = item as Record<string, unknown>;
    if (!isNonZeroNumber(el.area)) continue;
    const rawPos = typeof el.position === "string" ? el.position.trim() : "";
    if (!isValidPositionOrEmpty(rawPos, validPositions)) {
      issues.add("form.position");
      positionWarnings.push({
        index: i,
        invalidPosition: rawPos,
        accepted: acceptedList,
      });
    }
    const key = normalizePosition(rawPos) ?? "__no_pos__";
    if (seenPositions.has(key)) {
      issues.add("form.duplicate_position");
    }
    seenPositions.add(key);
  }
  return { issues: Array.from(issues), positionWarnings };
}

function hasMasonryValid(
  masonry: unknown,
  i18n?: ModuleCompletionI18n,
): MissingFieldInfo[] {
  const missing: MissingFieldInfo[] = [];
  const label = (k: string) => i18n?.getFieldLabel(k) ?? k;
  const reason = (k: string) => i18n?.getReason(k) ?? k;
  const masonryLabel = label("masonry");
  if (!masonry || typeof masonry !== "object") {
    missing.push({
      key: "masonry",
      label: masonryLabel,
      reason: reason("masonry"),
    });
    return missing;
  }
  const m = masonry as Record<string, unknown>;
  const pushMissing = (key: string) =>
    missing.push({
      key,
      label: `${masonryLabel} > ${label(key)}`,
      reason: reason(key),
    });
  // Itens com valor zero são descartados no envio (cleanZeroItemsBeforeSubmit)
  // e o backend exige volume > 0 em graute e argamassa
  // (internal/modules/structural_masonry.go). Concreto e aço da alvenaria
  // são opcionais no backend e não entram aqui.
  const items = (arr: unknown) =>
    (Array.isArray(arr) ? arr : []).filter(
      (x): x is Record<string, unknown> => !!x && typeof x === "object",
    );
  if (!isNonEmptyArray(m.blocks)) {
    pushMissing("masonry.blocks");
  } else if (!items(m.blocks).some((b) => isNonZeroNumber(b.quantity))) {
    pushMissing("masonry.blocks.quantity");
  }
  if (!isNonEmptyArray(m.mortar)) {
    pushMissing("masonry.mortar");
  } else if (!items(m.mortar).some((mo) => isNonZeroNumber(mo.volume))) {
    pushMissing("masonry.mortar.volume");
  }
  if (!isNonEmptyArray(m.grout)) {
    pushMissing("masonry.grout");
  } else if (
    !items(m.grout).some((g) =>
      items(g.volumes).some((v) => isNonZeroNumber(v.volume)),
    )
  ) {
    pushMissing("masonry.grout.volume");
  }
  // Only items that survive the submit cleanup (quantity/volume > 0) reach
  // the backend, which rejects fbk/fak/fgk outside its tables.
  if (
    items(m.blocks).some(
      (b) =>
        isNonZeroNumber(b.quantity) &&
        !isSupportedValue(b.fbk, SUPPORTED_BLOCK_FBK),
    )
  ) {
    pushMissing("masonry.blocks.fbk");
  }
  if (
    items(m.mortar).some(
      (mo) =>
        isNonZeroNumber(mo.volume) &&
        !isSupportedValue(mo.fak, SUPPORTED_MORTAR_FAK),
    )
  ) {
    pushMissing("masonry.mortar.fak");
  }
  if (
    items(m.grout).some((g) =>
      items(g.volumes).some(
        (v) =>
          isNonZeroNumber(v.volume) &&
          !isSupportedValue(v.fgk, SUPPORTED_GROUT_FGK),
      ),
    )
  ) {
    pushMissing("masonry.grout.fgk");
  }
  // The backend also rejects a repeated fak across mortar items and a
  // repeated fgk inside the same grout.
  if (
    hasDuplicateValue(
      items(m.mortar)
        .filter((mo) => isNonZeroNumber(mo.volume))
        .map((mo) => mo.fak),
    )
  ) {
    pushMissing("masonry.mortar.fak_duplicate");
  }
  if (
    items(m.grout).some((g) =>
      hasDuplicateValue(
        items(g.volumes)
          .filter((v) => isNonZeroNumber(v.volume))
          .map((v) => v.fgk),
      ),
    )
  ) {
    pushMissing("masonry.grout.fgk_duplicate");
  }
  return missing;
}

export function calculateModuleCompletion(
  type: TModulesTypes,
  data: Partial<TModuleDataV2> | undefined | null,
  i18n?: ModuleCompletionI18n,
  opts?: CalculateModuleCompletionOpts,
): CompletionResult {
  const missing: MissingFieldInfo[] = [];
  const warnings: CompletionPositionWarning[] = [];
  const label = (k: string) => i18n?.getFieldLabel(k) ?? k;
  const reason = (k: string) => i18n?.getReason(k) ?? k;
  if (!data) {
    return { completed: false, missing, warnings };
  }

  const schemaKey = SCHEMA_KEY_MAP[type];
  const schemaMod = (
    moduleSchema.modules as unknown as Record<
      string,
      { required?: string[]; scope_required?: string | string[] }
    >
  )[schemaKey];
  const baseRequired = (schemaMod?.required ?? []) as string[];
  const requiredFields = [...baseRequired];

  const d = data as Record<string, unknown>;
  const fallbackUnitId = opts?.fallbackUnitId;

  for (const field of requiredFields) {
    switch (field) {
      case "floor_ids": {
        const hasFloorIds = isNonEmptyArray(d.floor_ids);
        const hasFloorIndex = isValidFloorIndex(d.floor_index);
        if (!hasFloorIds && !hasFloorIndex) {
          missing.push({
            key: "floor_ids",
            label: label("floor_ids"),
            reason: reason("floor_ids"),
          });
        }
        break;
      }
      case "unit_id": {
        const val = d.unit_id;
        const hasDataUnitId =
          !!val && typeof val === "string" && val.trim() !== "";
        const hasFallback =
          !!fallbackUnitId &&
          typeof fallbackUnitId === "string" &&
          fallbackUnitId.trim() !== "";
        if (!hasDataUnitId && !hasFallback) {
          missing.push({
            key: "unit_id",
            label: label("unit_id"),
            reason: reason("unit_id"),
          });
        }
        break;
      }
      case "concrete": {
        const arr = d.concrete;
        const concreteResult = validateConcreteArray(
          Array.isArray(arr) ? arr : [],
          type,
        );
        for (const w of concreteResult.positionWarnings) {
          warnings.push({
            field: "concrete",
            index: w.index,
            invalidPosition: w.invalidPosition,
            acceptedPositions: w.accepted,
          });
        }
        if (!concreteResult.hasItems) {
          missing.push({
            key: "concrete",
            label: label("concrete"),
            reason: reason("concrete"),
          });
        }
        for (const reasonKey of concreteResult.issues) {
          missing.push({
            key: reasonKey,
            label: `${label("concrete")} > ${label(reasonKey)}`,
            reason: reason(reasonKey),
          });
        }
        break;
      }
      case "steel": {
        const arr = d.steel;
        const steelResult = validateSteelArray((arr as unknown[]) ?? [], type);
        const hasArray = isNonEmptyArray(arr);
        for (const w of steelResult.positionWarnings) {
          warnings.push({
            field: "steel",
            index: w.index,
            invalidPosition: w.invalidPosition,
            acceptedPositions: w.accepted,
          });
        }
        if (!hasArray || !steelResult.valid) {
          if (!hasArray) {
            missing.push({
              key: "steel",
              label: label("steel"),
              reason: reason("steel"),
            });
          } else if (steelResult.issues.length > 0) {
            for (const iss of steelResult.issues) {
              missing.push({
                key: `steel.${iss.reasonKey}`,
                label: `${label("steel")} > ${label(iss.reasonKey)}`,
                reason: reason(iss.reasonKey),
              });
            }
            if (steelResult.issues.length === 0 && !steelResult.valid) {
              missing.push({
                key: "steel",
                label: label("steel"),
                reason: reason("steel"),
              });
            }
          } else {
            missing.push({
              key: "steel",
              label: label("steel"),
              reason: reason("steel"),
            });
          }
        }
        break;
      }
      case "masonry": {
        const masonryMissing = hasMasonryValid(d.masonry, i18n);
        missing.push(...masonryMissing);
        break;
      }
      default:
        break;
    }
  }

  // Concrete is optional in structural masonry, but the backend still runs
  // validatePositionedConcrete when items exist.
  if (
    !requiredFields.includes("concrete") &&
    STRUCTURE_TYPES.has(type) &&
    Array.isArray(d.concrete)
  ) {
    const concreteResult = validateConcreteArray(d.concrete, type);
    for (const w of concreteResult.positionWarnings) {
      warnings.push({
        field: "concrete",
        index: w.index,
        invalidPosition: w.invalidPosition,
        acceptedPositions: w.accepted,
      });
    }
    for (const reasonKey of concreteResult.issues) {
      missing.push({
        key: reasonKey,
        label: `${label("concrete")} > ${label(reasonKey)}`,
        reason: reason(reasonKey),
      });
    }
  }

  // Form is never in `required`; it is checked only when items exist. The
  // backend runs validatePositionedForm for the structure types only.
  if (STRUCTURE_TYPES.has(type) && Array.isArray(d.form)) {
    const formResult = validateFormItems(d.form, type);
    for (const w of formResult.positionWarnings) {
      warnings.push({
        field: "form",
        index: w.index,
        invalidPosition: w.invalidPosition,
        acceptedPositions: w.accepted,
      });
    }
    for (const reasonKey of formResult.issues) {
      missing.push({
        key: reasonKey,
        label: `${label("form")} > ${label(reasonKey)}`,
        reason: reason(reasonKey),
      });
    }
  }

  return {
    completed: missing.length === 0,
    missing,
    warnings,
  };
}
