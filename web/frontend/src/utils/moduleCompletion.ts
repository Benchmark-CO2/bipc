import type { TModulesTypes, TModuleDataV2 } from "@/types/modules";
import moduleSchema from "@/schemas/module-schema.json";

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
const VALID_POSITIONS_BY_TYPE: Record<TModulesTypes, Set<string>> = {
  beam_column: new Set(["column", "beam", "slab", "stair"]),
  concrete_wall: new Set(["wall", "slab", "stair"]),
  structural_masonry: new Set(["column", "beam", "slab", "stair"]),
  raft_foundation: new Set(["raft"]),
  piles_foundation: new Set(["pile"]),
  raft_piles_foundation: new Set(["raft", "pile"]),
};

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

function hasAnyConcreteValid(
  concreteArr: unknown[],
  type: TModulesTypes,
): {
  valid: boolean;
  positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }>;
} {
  const validPositions = VALID_POSITIONS_BY_TYPE[type];
  const acceptedList = Array.from(validPositions);
  const seen = new Set<string>();
  let hasAtLeastOneValid = false;
  let hasDuplicateFckByPosition = false;
  const positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }> = [];
  (concreteArr as unknown[]).forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const el = item as Record<string, unknown>;
    const pos = typeof el.position === "string" ? el.position : undefined;
    const hasVolume = isNonZeroNumber(el.volume);
    const hasFck = isNonZeroNumber(el.fck);
    const validPosOrEmpty = isValidPositionOrEmpty(pos, validPositions);
    if (!validPosOrEmpty && typeof pos === "string" && pos.trim() !== "") {
      positionWarnings.push({
        index: i,
        invalidPosition: pos.trim(),
        accepted: acceptedList,
      });
    }
    if (!hasVolume || !hasFck) return;
    if (!validPosOrEmpty) return;
    const normalizedPos = normalizePosition(pos);
    const fck = Number(el.fck);
    const key = `${normalizedPos ?? "__no_pos__"}:${fck}`;
    if (seen.has(key)) {
      hasDuplicateFckByPosition = true;
      return;
    }
    seen.add(key);
    hasAtLeastOneValid = true;
  });
  return {
    valid: hasAtLeastOneValid && !hasDuplicateFckByPosition,
    positionWarnings,
  };
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
    if (mat === "other") {
      const on = typeof el.other_name === "string" ? el.other_name.trim() : "";
      if (!on) issues.push({ index: i, reasonKey: "steel.other_name" });
      if (!isNonZeroNumber(el.other_resistance)) {
        issues.push({ index: i, reasonKey: "steel.other_resistance" });
      }
    }
    const isItemValid =
      mat &&
      VALID_STEEL_MATERIALS.has(mat) &&
      res &&
      VALID_STEEL_RESISTANCES.has(res) &&
      isValidPositionOrEmpty(pos, validPositions) &&
      (typeof el.mass === "undefined" || isNonZeroNumber(el.mass)) &&
      (mat !== "other" ||
        (typeof el.other_name === "string" &&
          el.other_name.trim() !== "" &&
          isNonZeroNumber(el.other_resistance)));
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

function validateFormArray(
  formArr: unknown[],
  type: TModulesTypes,
): {
  valid: boolean;
  hasValidItem: boolean;
  anyPositionMissingOrInvalid: boolean;
  positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }>;
} {
  const validPositions = VALID_POSITIONS_BY_TYPE[type];
  const acceptedList = Array.from(validPositions);
  const seenPositions = new Set<string>();
  let hasDuplicatePosition = false;
  let hasValidItem = false;
  let anyPositionMissingOrInvalid = false;
  const positionWarnings: Array<{
    index: number;
    invalidPosition: string;
    accepted: string[];
  }> = [];
  for (const [i, item] of formArr.entries()) {
    if (!item || typeof item !== "object") continue;
    const el = item as Record<string, unknown>;
    const rawPos = typeof el.position === "string" ? el.position.trim() : "";
    if (!isValidPositionOrEmpty(rawPos, validPositions)) {
      anyPositionMissingOrInvalid = true;
      if (rawPos !== "") {
        positionWarnings.push({
          index: i,
          invalidPosition: rawPos,
          accepted: acceptedList,
        });
      }
      continue;
    }
    const normalizedPos = normalizePosition(rawPos);
    if (normalizedPos && seenPositions.has(normalizedPos)) {
      hasDuplicatePosition = true;
      continue;
    }
    if (normalizedPos) seenPositions.add(normalizedPos);
    if (typeof el.area !== "undefined" && !isNonZeroNumber(el.area)) {
      continue;
    }
    hasValidItem = true;
  }
  return {
    valid:
      isNonEmptyArray(formArr) &&
      hasValidItem &&
      !hasDuplicatePosition &&
      !anyPositionMissingOrInvalid,
    hasValidItem,
    anyPositionMissingOrInvalid,
    positionWarnings,
  };
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
  if (!isNonEmptyArray(m.blocks)) {
    missing.push({
      key: "masonry.blocks",
      label: `${masonryLabel} > ${label("masonry.blocks")}`,
      reason: reason("masonry.blocks"),
    });
  }
  if (!isNonEmptyArray(m.mortar)) {
    missing.push({
      key: "masonry.mortar",
      label: `${masonryLabel} > ${label("masonry.mortar")}`,
      reason: reason("masonry.mortar"),
    });
  }
  if (!isNonEmptyArray(m.grout)) {
    missing.push({
      key: "masonry.grout",
      label: `${masonryLabel} > ${label("masonry.grout")}`,
      reason: reason("masonry.grout"),
    });
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
        const concreteResult = hasAnyConcreteValid(
          (arr as unknown[]) ?? [],
          type,
        );
        const concreteValid = isNonEmptyArray(arr) && concreteResult.valid;
        for (const w of concreteResult.positionWarnings) {
          warnings.push({
            field: "concrete",
            index: w.index,
            invalidPosition: w.invalidPosition,
            acceptedPositions: w.accepted,
          });
        }
        if (!concreteValid) {
          missing.push({
            key: "concrete",
            label: label("concrete"),
            reason: reason("concrete"),
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
      case "form": {
        const arr = d.form;
        const formResult = validateFormArray((arr as unknown[]) ?? [], type);
        const hasArray = isNonEmptyArray(arr);
        for (const w of formResult.positionWarnings) {
          warnings.push({
            field: "form",
            index: w.index,
            invalidPosition: w.invalidPosition,
            acceptedPositions: w.accepted,
          });
        }
        if (!hasArray || !formResult.valid) {
          if (!hasArray) {
            missing.push({
              key: "form",
              label: label("form"),
              reason: reason("form"),
            });
          } else {
            missing.push({
              key: "form",
              label: label("form"),
              reason: reason("form"),
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

  return {
    completed: missing.length === 0,
    missing,
    warnings,
  };
}
