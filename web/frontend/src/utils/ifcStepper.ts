import { Translations } from "@/i18n/translations/pt-BR";
import { IProject } from "@/types/projects";
import { TRole } from "@/types/disciplines";
import { TModulesTypes } from "@/types/modules";
import {
  TIfcProcessorAggregatedResult,
  TIfcProcessorResultUnits,
  TIfcProcessorResultUnitFloor,
  TIfcProcessorResultModuleItem,
  TIfcStepperState,
  TIfcStepperUnitItem,
  TIfcStepperModuleItem,
  TIfcFloorCategory,
} from "@/types/ifc";
import {
  createUnitFormSchema,
  UnitFormInput,
} from "@/validators/unitForm.validator";
import { moduleFormSchema } from "@/validators/moduleFormByType.validator";
import { getDefaultValuesByType } from "@/components/layout/drawer-form-module/module-default-values";
import {
  groupedFormToFlatV2,
  flatV2ToGroupedForm,
  getCompletenessWarnings,
  CompletenessWarningsI18n,
} from "@/components/layout/drawer-form-module/aggregate-helpers";
const generateTempId = () => {
  return `tmp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
};

const KNOWN_MODULE_TYPES: TModulesTypes[] = [
  "beam_column",
  "concrete_wall",
  "structural_masonry",
  "raft_foundation",
  "piles_foundation",
  "raft_piles_foundation",
];

const isKnownModuleType = (t: string | TModulesTypes): t is TModulesTypes => {
  return (KNOWN_MODULE_TYPES as string[]).includes(t as string);
};

// ---------------------------------------------------------------------------
// Filtros para ZOD validationErrors: remover (1) campos read-only / de sistema
// que o usuário não edita no formulário e (2) mensagens genéricas de "min(1)"
// que já são explicadas SEMANTICAMENTE pelo helper getCompletenessWarnings
// (ex.: "Adicione pelo menos um volume de concreto" → substituído por
// "Pilar: faltando dados de concreto (fck e volume) e materiais de aço").
// ---------------------------------------------------------------------------
const SYSTEM_FIELD_PATTERNS = [
  /(^|[\.\[\]])id([\.\[\]]|$)/i,
  /(^|[\.\[\]])floor_index(es)?([\.\[\]]|$)/i,
  /(^|[\.\[\]])outdated([\.\[\]]|$)/i,
  /(^|[\.\[\]])version(_in_use)?([\.\[\]]|$)/i,
  /(^|[\.\[\]])name([\.\[\]]|$)/i,
  /(^|[\.\[\]])unit_id([\.\[\]]|$)/i,
  /(^|[\.\[\]])option_id([\.\[\]]|$)/i,
  /(^|[\.\[\]])created_at([\.\[\]]|$)/i,
  /(^|[\.\[\]])updated_at([\.\[\]]|$)/i,
  /(^|[\.\[\]])raft_area([\.\[\]]|$)/i,
  /(^|[\.\[\]])raft_thickness([\.\[\]]|$)/i,
];

const GENERIC_MINITEMS_MESSAGES_PATTERNS = [
  /adicione\s+pelo\s+menos\s+(um|uma)\s+(volume|material|item)/i,
  /m[oó]dulo\s+sem\s+nenhum\s+(volume|material)/i,
  /array\s+must\s+contain\s+at\s+least\s+\d+\s+element/i,
  /must\s+contain\s+at\s+least\s+\d+/i,
  /expected\s+(array|number|string),\s*received\s+(null|undefined|string|number)/i,
  /campos?\s+obrigat[oó]rios?\s+ausentes?/i,
];

const isSystemFieldWarning = (path: string, message: string): boolean => {
  const p = (path || "").toLowerCase();
  const m = (message || "").toLowerCase();
  if (!p && !m) return false;
  if (p) {
    for (const re of SYSTEM_FIELD_PATTERNS) if (re.test(path)) return true;
  }
  return false;
};

const isGenericMinItemsMessage = (path: string, message: string): boolean => {
  const p = (path || "").toLowerCase();
  const m = (message || "").toLowerCase();
  if (!p && !m) return false;
  for (const re of GENERIC_MINITEMS_MESSAGES_PATTERNS) {
    if (re.test(p) || re.test(m)) return true;
  }
  const concreteOrSteelPath = /(^|[\.\[\]])(concrete|steel)([\.\[\]]|$)/i.test(
    p,
  );
  const hasMinWord = /\bmin\b|pelo\s+menos|adicion(e|ar)/i.test(m);
  if (concreteOrSteelPath && hasMinWord) return true;
  return false;
};

const filterZodValidationErrors = (issues: string[]): string[] => {
  const out: string[] = [];
  for (const raw of issues) {
    const [maybePath, ...rest] = raw.split(": ");
    const pathPart = rest.length > 0 ? (maybePath ?? "") : "";
    const msgPart = rest.length > 0 ? rest.join(": ") : raw;
    if (isSystemFieldWarning(pathPart, msgPart)) continue;
    if (isGenericMinItemsMessage(pathPart, msgPart)) continue;
    out.push(raw);
  }
  return out;
};

export const MODULE_TYPE_ALIASES: Record<string, TModulesTypes | string> = {
  raft: "raft_foundation",
  raft_foundation: "raft_foundation",
  radier: "raft_foundation",
  radier_foundation: "raft_foundation",
  fund_raft: "raft_foundation",
  foundation_raft: "raft_foundation",
  piles: "piles_foundation",
  pile: "piles_foundation",
  piles_foundation: "piles_foundation",
  estaca: "piles_foundation",
  estacas: "piles_foundation",
  foundation_piles: "piles_foundation",
  foundation_pile: "piles_foundation",
  fund_piles: "piles_foundation",
  raft_piles: "raft_piles_foundation",
  raft_pile: "raft_piles_foundation",
  raft_piles_foundation: "raft_piles_foundation",
  mixed_foundation: "raft_piles_foundation",
  radier_estaqueado: "raft_piles_foundation",
  radier_estacas: "raft_piles_foundation",
  foundation_mixed: "raft_piles_foundation",
  beam: "beam_column",
  beam_column: "beam_column",
  beam_col: "beam_column",
  beamcol: "beam_column",
  portico: "beam_column",
  pórtico: "beam_column",
  viga_pilar: "beam_column",
  viga_pilares: "beam_column",
  viga_pilarete: "beam_column",
  frame: "beam_column",
  concrete_wall: "concrete_wall",
  concrete_walls: "concrete_wall",
  parede_concreto: "concrete_wall",
  parede_de_concreto: "concrete_wall",
  wall: "concrete_wall",
  walls: "concrete_wall",
  structural_masonry: "structural_masonry",
  masonry: "structural_masonry",
  alvenaria: "structural_masonry",
  alvenaria_estrutural: "structural_masonry",
  block_masonry: "structural_masonry",
  blocos: "structural_masonry",
};

export const MODULE_TYPE_LABEL_FALLBACK: Record<string, string> = {
  raft: "Fundação: Radier",
  piles: "Fundação: Estacas",
  pile: "Fundação: Estacas",
  raft_piles: "Fundação: Radier + Estacas",
  raft_pile: "Fundação: Radier + Estacas",
  radier: "Fundação: Radier",
  estaca: "Fundação: Estacas",
  estacas: "Fundação: Estacas",
  radier_estaqueado: "Fundação: Radier + Estacas",
  beam: "Pórtico (Viga/Pilar)",
  beam_col: "Pórtico (Viga/Pilar)",
  portico: "Pórtico (Viga/Pilar)",
  pórtico: "Pórtico (Viga/Pilar)",
  viga_pilar: "Pórtico (Viga/Pilar)",
  parede_concreto: "Parede de Concreto",
  parede_de_concreto: "Parede de Concreto",
  concrete_walls: "Parede de Concreto",
  wall: "Parede de Concreto",
  walls: "Parede de Concreto",
  masonry: "Alvenaria Estrutural",
  alvenaria: "Alvenaria Estrutural",
  alvenaria_estrutural: "Alvenaria Estrutural",
  block_masonry: "Alvenaria Estrutural",
  blocos: "Alvenaria Estrutural",
  mixed_foundation: "Fundação: Radier + Estacas",
  foundation_mixed: "Fundação: Radier + Estacas",
};

export const normalizeModuleType = (
  raw: TModulesTypes | string | undefined | null,
): TModulesTypes | string => {
  const safe = (raw ?? "").toString().trim();
  if (safe.length === 0) return "";
  const candidates = [safe, safe.toLowerCase().replace(/[^a-z0-9_]/g, "_")];
  for (const c of candidates) {
    if (MODULE_TYPE_ALIASES[c]) return MODULE_TYPE_ALIASES[c];
  }
  if (isKnownModuleType(safe)) return safe as TModulesTypes;
  return safe;
};

const normalizeFloorIndex = (
  idx: number | string | undefined,
  fallback: number,
): number => {
  if (idx === undefined || idx === null) return fallback;
  if (typeof idx === "number") return Number.isFinite(idx) ? idx : fallback;
  const parsed = parseInt(String(idx), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeIfcFloorCategory = (
  c: TIfcProcessorResultUnitFloor["category"],
  floorIndex: number,
): TIfcFloorCategory => {
  const known: TIfcFloorCategory[] = [
    "standard_floor",
    "ground_floor",
    "basement_floor",
    "penthouse_floor",
  ];
  if (typeof c === "string" && known.includes(c as TIfcFloorCategory)) {
    return c as TIfcFloorCategory;
  }
  if (floorIndex < 0) return "basement_floor";
  if (floorIndex === 0) return "ground_floor";
  return "standard_floor";
};

const mapIfcUnitsRawToItemArray = (
  raw: TIfcProcessorResultUnits | TIfcProcessorResultUnits[],
): TIfcProcessorResultUnits[] => {
  if (Array.isArray(raw)) return raw;
  return [raw];
};

const mapIfcUnitToStepperUnitFormData = (
  raw: TIfcProcessorResultUnits,
): TIfcStepperUnitItem["formData"] => {
  const rawFloors = raw.data?.floors ?? [];
  const mappedFloors: TIfcStepperUnitItem["formData"]["data"]["floors"] = [];

  let lastIndex = 0;

  if (rawFloors.length === 0) {
    mappedFloors.push({
      floor_group: "Térreo",
      area: "0,00",
      height: "3,00",
      category: "ground_floor",
      index: 0,
      repetition: 1,
    });
    lastIndex = 1;
  } else {
    rawFloors.forEach((floor: TIfcProcessorResultUnitFloor, i) => {
      const index = normalizeFloorIndex(floor.index, i === 0 ? 0 : lastIndex);
      lastIndex = Math.max(lastIndex, index + 1);
      const category = normalizeIfcFloorCategory(floor.category, index);
      const maybeArea = floor.area;
      const maybeHeight = floor.height;
      const areaStr =
        typeof maybeArea === "number" && Number.isFinite(maybeArea)
          ? maybeArea.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : typeof maybeArea === "string" && maybeArea.length > 0
            ? maybeArea
            : "0,00";
      const heightStr =
        typeof maybeHeight === "number" && Number.isFinite(maybeHeight)
          ? maybeHeight.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : typeof maybeHeight === "string" && maybeHeight.length > 0
            ? maybeHeight
            : "3,00";
      const floorGroup =
        typeof floor.floor_group === "string" && floor.floor_group.length > 0
          ? floor.floor_group
          : category === "basement_floor"
            ? "Subsolo"
            : category === "ground_floor"
              ? "Térreo"
              : category === "penthouse_floor"
                ? "Cobertura"
                : `Andar ${index >= 0 ? index : i}`;
      mappedFloors.push({
        floor_group: floorGroup,
        area: areaStr,
        height: heightStr,
        category,
        index,
        repetition: 1,
      });
    });
  }

  const aggregatedFloors = aggregateIdenticalFloors(mappedFloors);

  return {
    name: raw.name || "Nova Unidade",
    type: "tower",
    repetition_count: 1,
    data: {
      floors: aggregatedFloors,
    },
  };
};

export type TStepperFloorFormShape =
  TIfcStepperUnitItem["formData"]["data"]["floors"][number];

export const aggregateIdenticalFloors = <T extends TStepperFloorFormShape>(
  floors: T[],
): T[] => {
  if (!Array.isArray(floors)) return [];
  const result: T[] = [];
  for (const current of floors) {
    const key = `${current.floor_group}|${current.area}|${current.height}|${current.category}`;
    const matchIdx = result.findIndex(
      (r) => `${r.floor_group}|${r.area}|${r.height}|${r.category}` === key,
    );
    if (matchIdx >= 0) {
      const prev = result[matchIdx];
      const prevRep = Number(prev.repetition) || 0;
      const curRep = Number(current.repetition) || 1;
      result[matchIdx] = {
        ...prev,
        repetition: Math.max(1, prevRep + curRep),
      } as T;
    } else {
      result.push({
        ...current,
        repetition: Math.max(1, Number(current.repetition) || 1),
      } as T);
    }
  }
  return result;
};

const validateStepperUnit = (
  formData: TIfcStepperUnitItem["formData"],
  t: Translations,
): { isValid: boolean; errors: string[] } => {
  try {
    const schema = createUnitFormSchema(t as any);
    const input = formData as unknown as UnitFormInput;
    const result = schema.safeParse(input);
    if (result.success) {
      return { isValid: true, errors: [] };
    }
    const issues = (result.error?.issues ?? [])
      .map((iss: any) => iss.message)
      .filter(Boolean);
    const unique = Array.from(new Set<string>(issues));
    return {
      isValid: false,
      errors: unique.length > 0 ? unique : ["Verifique os campos obrigatórios"],
    };
  } catch (err) {
    return {
      isValid: false,
      errors: ["Erro ao validar formulário de unidade"],
    };
  }
};

const deepRenameSteelCaToMaterial = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(deepRenameSteelCaToMaterial);
  }
  if (value && typeof value === "object") {
    const obj: any = {};
    for (const key of Object.keys(value)) {
      const v = (value as any)[key];
      if (key === "steel" && Array.isArray(v)) {
        obj[key] = v.map((item) => {
          if (
            item &&
            typeof item === "object" &&
            !("material" in item) &&
            "ca" in item
          ) {
            const ca = (item as any).ca;
            const mass = (item as any).mass ?? 0;
            const resistance =
              ca === 50
                ? "CA50"
                : ca === 60
                  ? "CA60"
                  : ca === 190
                    ? "CP190"
                    : "other";
            return {
              material: "rebar",
              resistance,
              other_resistance: resistance === "other" ? Number(ca) || 0 : 0,
              mass:
                typeof mass === "number"
                  ? mass.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : String(mass ?? "0"),
            };
          }
          return deepRenameSteelCaToMaterial(item);
        });
      } else {
        obj[key] = deepRenameSteelCaToMaterial(v);
      }
    }
    return obj;
  }
  if (typeof value === "number") {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return value;
};

const mergeModuleDefaults = (type: TModulesTypes, overrides: any): any => {
  const defaults = getDefaultValuesByType(type) as any;
  return deepMerge(defaults, overrides ?? {});
};

const deepMerge = (target: any, source: any): any => {
  if (source === null || source === undefined) return target;
  if (typeof source !== "object") return source;
  if (Array.isArray(source)) return source;
  const out = {
    ...(target && typeof target === "object" && !Array.isArray(target)
      ? target
      : {}),
  };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal)) {
      out[key] = deepMerge(out?.[key], srcVal);
    } else {
      out[key] = srcVal;
    }
  }
  return out;
};

const isDataLikelyFlatV2Format = (d: any): boolean => {
  if (!d || typeof d !== "object") return false;
  const flatKeys = [
    "concrete",
    "steel",
    "form",
    "column_number",
    "masonry",
    "raft",
    "piles",
  ];
  const groupedKeys = [
    "concrete_columns",
    "concrete_beams",
    "concrete_slabs",
    "concrete_walls",
    "masonry_blocks",
    "raft_foundation",
    "pile_caps",
  ];
  const hasAnyFlat = flatKeys.some((k) => k in d);
  const hasAnyGrouped = groupedKeys.some((k) => k in d);
  if (hasAnyGrouped) return false;
  if (
    hasAnyFlat &&
    typeof d.concrete === "object" &&
    d.concrete !== null &&
    !Array.isArray(d.concrete)
  ) {
    return true;
  }
  if (hasAnyFlat && !hasAnyGrouped) return true;
  return false;
};

/**
 * Implementação NOVA de validateStepperModule.
 * Mantém compatibilidade de assinatura.
 * - DEBUG configurável (ativado temporariamente até resolvido warning falso de foundations)
 * - Expõe `flatData` calculado (para ser substituído quando temos override mais fresco)
 * - Faz auto-detecção flat vs grouped e corrige antes do parse.
 */
const validateStepperModule = (
  item: TIfcProcessorResultModuleItem,
  i18nCompleteness: CompletenessWarningsI18n,
  DEBUG: boolean = false,
): {
  isValid: boolean;
  errors: string[];
  warnings: { hasWarnings: boolean; messages: string[] };
  normalized: any;
  flatData: any;
} => {
  const normalizedType = normalizeModuleType(item.type);
  if (!isKnownModuleType(normalizedType)) {
    return {
      isValid: false,
      errors: [
        `Tipo de módulo não suportado: ${String(normalizedType || item.type)}`,
      ],
      warnings: { hasWarnings: false, messages: [] },
      normalized: { type: normalizedType || item.type },
      flatData: null,
    };
  }
  try {
    let normalizedData = deepRenameSteelCaToMaterial(item.data ?? {});
    if (isDataLikelyFlatV2Format(normalizedData)) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn(
          "[validateStepperModule] raw.data detectado em formato FLAT. Convertendo para GROUPED via flatV2ToGroupedForm.",
          { type: normalizedType, data: normalizedData },
        );
      }
      try {
        normalizedData = flatV2ToGroupedForm(normalizedType, normalizedData);
      } catch (err) {
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.error(
            "[validateStepperModule] Erro ao converter flat→grouped.",
            err,
          );
        }
      }
    }
    const defaultsPlusData = mergeModuleDefaults(
      normalizedType,
      normalizedData,
    );
    const candidate = { type: normalizedType, ...defaultsPlusData };
    const schemaResult = moduleFormSchema.safeParse(candidate);
    let flatData: any = null;
    try {
      flatData = groupedFormToFlatV2(normalizedType, candidate, [], "");
    } catch (e) {
      flatData = null;
    }
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `[validateStepperModule] Passo a passo (${normalizedType})`,
      );
      // eslint-disable-next-line no-console
      console.log("1. normalizedData (shape de entrada):", normalizedData);
      // eslint-disable-next-line no-console
      console.log("2. candidate (defaults + data):", candidate);
      // eslint-disable-next-line no-console
      console.log(
        "3. groupedFormToFlatV2 resultado (shape p/ warnings):",
        flatData,
      );
      if (flatData) {
        // eslint-disable-next-line no-console
        console.log("   3a. flatData.concrete:", (flatData as any).concrete);
        // eslint-disable-next-line no-console
        console.log("   3b. flatData.steel:", (flatData as any).steel);
      }
    }
    const warnings =
      flatData && isKnownModuleType(normalizedType)
        ? getCompletenessWarnings(flatData, normalizedType, i18nCompleteness)
        : { hasWarnings: false, messages: [] as string[] };
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log("4. warnings (base do grouped→flat):", warnings);
    }
    if (schemaResult.success) {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log("5. schemaParse: SUCCESS");
        // eslint-disable-next-line no-console
        console.groupEnd();
      }
      return {
        isValid: true,
        errors: [],
        warnings,
        normalized: schemaResult.data,
        flatData,
      };
    }
    const issues = (schemaResult.error?.issues ?? []).map((iss: any) => {
      const path = iss.path?.length ? iss.path.join(".") : "";
      const msg = iss.message || "Campo inválido";
      return path ? `${path}: ${msg}` : msg;
    });
    const uniqueAll = Array.from(new Set<string>(issues)).slice(0, 15);
    const filtered = filterZodValidationErrors(uniqueAll).slice(0, 10);
    const allIssuesWereGeneric = uniqueAll.length > 0 && filtered.length === 0;
    const isValid = allIssuesWereGeneric;
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        `5. schemaParse: FAIL. issues=${uniqueAll.length}, filtered=${filtered.length}, isValid=${isValid}`,
        { uniqueAll, filtered },
      );
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
    return {
      isValid,
      errors: filtered,
      warnings,
      normalized: candidate,
      flatData,
    };
  } catch (err) {
    return {
      isValid: false,
      errors: ["Erro ao validar módulo"],
      warnings: { hasWarnings: false, messages: [] },
      normalized: { type: normalizedType || item.type },
      flatData: null,
    };
  }
};

const buildModuleSummary = (item: TIfcProcessorResultModuleItem) => {
  const d = item.data ?? {};
  const parts: string[] = [];
  if (
    Array.isArray((d as any).concrete_columns?.volumes) &&
    (d as any).concrete_columns.volumes.length
  ) {
    const totalCol = (d as any).concrete_columns.volumes.reduce(
      (acc: number, v: any) => acc + (Number(v.volume) || 0),
      0,
    );
    if (totalCol > 0) parts.push(`Col: ${totalCol.toFixed(1)} m³`);
  }
  if (
    Array.isArray((d as any).concrete_slabs?.volumes) &&
    (d as any).concrete_slabs.volumes.length
  ) {
    const totalSl = (d as any).concrete_slabs.volumes.reduce(
      (acc: number, v: any) => acc + (Number(v.volume) || 0),
      0,
    );
    if (totalSl > 0) parts.push(`Laje: ${totalSl.toFixed(1)} m³`);
  }
  if (Array.isArray((d as any).concrete) && (d as any).concrete.length) {
    const total = (d as any).concrete.reduce(
      (acc: number, v: any) => acc + (Number(v.volume) || 0),
      0,
    );
    if (total > 0) parts.push(`Conc: ${total.toFixed(1)} m³`);
  }
  if (typeof (d as any).area === "number" && (d as any).area > 0) {
    parts.push(`Área: ${(d as any).area.toFixed(1)} m²`);
  }
  if (typeof (d as any).thickness === "number" && (d as any).thickness > 0) {
    parts.push(`Esp: ${(d as any).thickness.toFixed(0)} cm`);
  }
  if (
    typeof (d as any).piles?.volume === "number" &&
    (d as any).piles.volume > 0
  ) {
    parts.push(`Estacas: ${(d as any).piles.volume.toFixed(1)} m³`);
  }
  if (typeof (d as any).raft?.area === "number" && (d as any).raft.area > 0) {
    parts.push(`Radier: ${(d as any).raft.area.toFixed(0)} m²`);
  }
  if (
    Array.isArray((d as any).masonry?.blocks) &&
    (d as any).masonry.blocks.length
  ) {
    const totalBl = (d as any).masonry.blocks.reduce(
      (acc: number, v: any) => acc + (Number(v.quantity) || 0),
      0,
    );
    if (totalBl > 0) parts.push(`Blocos: ${Math.round(totalBl)} un`);
  }
  if (parts.length === 0) {
    return "—";
  }
  return parts.join(" · ");
};

export const mapIfcResultToStepperState = (
  result: TIfcProcessorAggregatedResult,
  t: Translations,
): TIfcStepperState => {
  const rawUnits = mapIfcUnitsRawToItemArray(result.units);

  const units: TIfcStepperUnitItem[] = rawUnits.map((u) => {
    const formData = mapIfcUnitToStepperUnitFormData(u);
    const { isValid, errors } = validateStepperUnit(formData, t);
    return {
      tempId: generateTempId(),
      selected: true,
      raw: u,
      name: formData.name,
      formData,
      isValid,
      validationErrors: errors,
    };
  });

  const i18nCompleteness = (t as any).modules?.form
    ?.completeness as CompletenessWarningsI18n;

  const modules: TIfcStepperModuleItem[] = (result.modules ?? []).map((m) => {
    const normalizedType = normalizeModuleType(m.type);
    const normalizedRaw = { ...m, type: normalizedType || m.type };
    const summary = buildModuleSummary(normalizedRaw as any);
    const { isValid, errors, warnings } = validateStepperModule(
      normalizedRaw as any,
      i18nCompleteness,
    );
    return {
      tempId: generateTempId(),
      raw: normalizedRaw as any,
      type: normalizedRaw.type,
      summary,
      selected: true,
      boundUnitTempId: units.length === 1 ? units[0].tempId : null,
      boundUnitId: null,
      boundOptionId: null,
      isValid,
      validationErrors: errors,
      completenessWarnings: warnings,
    };
  });

  return {
    currentStep: "units",
    units,
    unitsCreated: [],
    modules,
  };
};

export const rerunUnitValidation = (
  item: TIfcStepperUnitItem,
  t: Translations,
): TIfcStepperUnitItem => {
  const { isValid, errors } = validateStepperUnit(item.formData, t);
  return {
    ...item,
    name: item.formData.name,
    isValid,
    validationErrors: errors,
  };
};

export const rerunModuleValidation = (
  item: TIfcStepperModuleItem,
  i18nCompleteness: CompletenessWarningsI18n,
  /**
   * (Opcional) Fonte da verdade MAIS FRESCA e VALIDADA pelo DrawerFormModule submit.
   * Quando presente, usamos esse flatData PRÉ-VALIDADO para calcular os
   * warnings de completeness (getCompletenessWarnings), ao invés de recalcular
   * via groupedFormToFlatV2(candidate) — que no caso de foundation types
   * (raft/piles/raft_piles) pode sofrer perda de dados ao converter
   * flat → grouped → flat (2 conversões) e gerar warnings FALSOS
   * ("missing concrete data") mesmo que flat original esteja 100% ok.
   */
  flatDataOverride?: (any & { type?: TModulesTypes }) | null,
): TIfcStepperModuleItem => {
  const validateResult = validateStepperModule(
    item.raw,
    i18nCompleteness,
    typeof window !== "undefined", // DEBUG apenas em client (nunca em SSR)
  );
  const {
    isValid,
    errors,
    warnings,
    flatData: flatDataFromSchema,
  } = validateResult;

  // Se temos override (vindos do DrawerFormModule.submit — fonte MAIS FRESCA e VALIDADA),
  // usamos esse flat para warnings, não o calculado de grouped→flat.
  const finalWarnings =
    flatDataOverride && typeof flatDataOverride === "object" && item.raw.type
      ? (() => {
          try {
            const type_ = (item.raw.type ??
              (flatDataOverride as any).type) as TModulesTypes;
            const w = getCompletenessWarnings(
              flatDataOverride as any,
              type_,
              i18nCompleteness,
            );
            return w;
          } catch (err) {
            return warnings;
          }
        })()
      : warnings;

  return {
    ...item,
    summary: buildModuleSummary(item.raw),
    isValid,
    validationErrors: errors,
    completenessWarnings: finalWarnings,
  };
};

export const resolveSimulationRoleId = (
  project: Pick<IProject, "roles">,
): string | null => {
  const roles = (project.roles ?? []) as unknown as TRole[];
  if (roles.length === 0) return null;
  const withSim = roles.find((r) => r.simulation);
  if (withSim) return withSim.id;
  return roles[0].id;
};

export const buildUniqueSimulationName = (
  unitName: string,
  existingNames: string[],
): string => {
  const base = `Sim. ${unitName}`.trim();
  const taken = new Set<string>(
    existingNames.map((n) => (n || "").toLowerCase()),
  );
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} (${i})`.toLowerCase())) {
    i += 1;
  }
  return `${base} (${i})`;
};

export const prepareUnitForCreate = (
  formData: TIfcStepperUnitItem["formData"],
): {
  name: string;
  type: "tower";
  housing_units_count?: number;
  repetition_count?: number;
  data: { floors: any[] };
} => {
  const input = formData;
  const expanded: any[] = [];
  input.data.floors.forEach((floor) => {
    const repetition = floor.repetition || 1;
    const areaNum = parseFloat(floor.area.replace(",", "."));
    const heightNum = parseFloat(floor.height.replace(",", "."));
    for (let i = 0; i < repetition; i++) {
      expanded.push({
        floor_group: floor.floor_group,
        area: Number.isFinite(areaNum) && areaNum > 0 ? areaNum : 0,
        height: Number.isFinite(heightNum) && heightNum > 0 ? heightNum : 0,
        category: floor.category,
        index: floor.index + i,
      });
    }
  });
  const sorted = expanded.sort((a, b) => a.index - b.index);
  const minIdx = sorted[0]?.index ?? 0;
  const reindexed = sorted.map((f, idx) => ({ ...f, index: minIdx + idx }));
  return {
    name: input.name,
    type: input.type,
    ...(input.housing_units_count !== undefined &&
      input.housing_units_count !== null && {
        housing_units_count: input.housing_units_count,
      }),
    ...(input.repetition_count !== undefined &&
      input.repetition_count !== null && {
        repetition_count: input.repetition_count,
      }),
    data: {
      floors: reindexed,
    },
  };
};

/**
 * Parses recursively all numeric-like strings ("100", "12.5") inside an object/array
 * into actual numbers. Backend Go structs use float64/int and reject string values.
 */
const recursivelyParseNumericStrings = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return value;
    // Only parse if strictly numeric (avoids converting UUIDs, material codes like "CA50")
    // Regex: optional leading minus, digits, optional . digits
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => recursivelyParseNumericStrings(v));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = recursivelyParseNumericStrings(v);
    }
    return out;
  }
  return value;
};

export const prepareModuleForBatch = (
  moduleItem: TIfcStepperModuleItem,
  isFoundation: boolean,
  unitIdOrFloorIds: { unit_id?: string; floor_ids?: string[] },
): { type: TModulesTypes | string; data: Record<string, unknown> } | null => {
  const rawType = moduleItem.raw.type;
  const normalizedType = normalizeModuleType(rawType);
  const knownType = isKnownModuleType(normalizedType) ? normalizedType : null;

  const d = moduleItem.raw.data ?? {};

  // 1) DECIDE qual shape usar. Backend SEMPRE quer FLAT (TModuleDataV2).
  //    - Se raw.data JÁ é flat (shape do IFC inicial) → usa ele direto.
  //    - Se raw.data é GROUPED (shape do form, salvo após drawer submit) →
  //      converte para flat V2 usando groupedFormToFlatV2.
  let effectiveData: Record<string, unknown>;
  const isFlatAlready = isDataLikelyFlatV2Format(d);
  if (isFlatAlready || !knownType) {
    effectiveData = { ...(d as Record<string, unknown>) };
  } else {
    // Converte grouped → flat
    try {
      effectiveData = groupedFormToFlatV2(
        knownType,
        d as any,
        Array.isArray(unitIdOrFloorIds.floor_ids)
          ? unitIdOrFloorIds.floor_ids
          : [],
        unitIdOrFloorIds.unit_id ?? "",
      ) as any;
    } catch (err) {
      // Fallback: usa dados originais mesmo que grouped (melhor tentar do que pular)
      effectiveData = { ...(d as Record<string, unknown>) };
    }
  }

  // 2) Parseia TODAS strings numéricas ("100" → 100) para evitar erro do Go:
  //    "cannot unmarshal string into Go struct field RaftFoundation.area of type float64"
  effectiveData = recursivelyParseNumericStrings(effectiveData) as Record<
    string,
    unknown
  >;

  // 3) Remove campos GROUPED que o backend FLAT NÃO reconhece (evita warnings/unmarshal erros)
  const GROUPED_ONLY_KEYS_TO_STRIP = new Set<string>([
    // Raft grouped-only
    "area",
    "thickness",
    // Pórtico/Wall/Masonry grouped-only
    "concrete_columns",
    "concrete_beams",
    "concrete_slabs",
    "concrete_walls",
    "blocks",
    "grout",
    "mortar",
    "wall_area",
    "wall_thickness",
    "slab_thickness",
    "form_area",
    "form_columns",
    "form_beams",
    "form_slabs",
    "form_total",
    "column_number",
    "avg_beam_span",
    "avg_slab_span",
    // Shared grouped-only
    "unspecified",
    "pile_caps",
    "piles_concrete",
    "piles_steel",
    "block_type",
    "fbk",
    "fak",
    "mortar_volume",
    "grout_vertical_volume",
    "grout_horizontal_volume",
    "grout_general_volume",
  ]);
  const clean: Record<string, unknown> = {};
  Object.keys(effectiveData).forEach((k) => {
    if (GROUPED_ONLY_KEYS_TO_STRIP.has(k)) return;
    (clean as any)[k] = (effectiveData as any)[k];
  });

  // 4) Remove floor_index do data (nunca esperado pelo backend;
  //    usamos só internamente para mapear → floor_ids).
  delete clean.floor_index;
  // Se tem um campo "type" duplicado no data, remova (vai no nível superior).
  delete clean.type;

  // 5) Aplica bindings:
  //    - Fundação: SEMPRE unit_id
  //    - Estruturais (pórtico/parede/alvenaria): SEMPRE floor_ids
  if (isFoundation) {
    if (unitIdOrFloorIds.unit_id) {
      clean.unit_id = unitIdOrFloorIds.unit_id;
    }
    // Fundação NÃO deve ter floor_ids no data (não pertence a 1 andar)
    delete clean.floor_ids;
  } else if (unitIdOrFloorIds.floor_ids?.length) {
    clean.floor_ids = unitIdOrFloorIds.floor_ids;
  }

  return { type: rawType, data: clean };
};

export const ifcStepperUtils = {
  generateTempId,
  isKnownModuleType,
};
