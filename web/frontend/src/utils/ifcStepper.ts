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

const STEEL_FIELDS_TO_NORMALIZE = ["steel", "concrete", "masonry"];

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

const validateStepperModule = (
  item: TIfcProcessorResultModuleItem,
): { isValid: boolean; errors: string[]; normalized: any } => {
  const normalizedType = normalizeModuleType(item.type);
  if (!isKnownModuleType(normalizedType)) {
    return {
      isValid: false,
      errors: [
        `Tipo de módulo não suportado: ${String(normalizedType || item.type)}`,
      ],
      normalized: { type: normalizedType || item.type },
    };
  }
  try {
    const normalizedData = deepRenameSteelCaToMaterial(item.data ?? {});
    const defaultsPlusData = mergeModuleDefaults(
      normalizedType,
      normalizedData,
    );
    const candidate = { type: normalizedType, ...defaultsPlusData };
    const result = moduleFormSchema.safeParse(candidate);
    if (result.success) {
      return { isValid: true, errors: [], normalized: result.data };
    }
    const issues = (result.error?.issues ?? []).map((iss: any) => {
      const path = iss.path?.length ? iss.path.join(".") : "";
      const msg = iss.message || "Campo inválido";
      return path ? `${path}: ${msg}` : msg;
    });
    const unique = Array.from(new Set<string>(issues)).slice(0, 10);
    return {
      isValid: false,
      errors: unique.length > 0 ? unique : ["Campos obrigatórios ausentes"],
      normalized: candidate,
    };
  } catch (err) {
    return {
      isValid: false,
      errors: ["Erro ao validar módulo"],
      normalized: { type: normalizedType || item.type },
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

  const modules: TIfcStepperModuleItem[] = (result.modules ?? []).map((m) => {
    const normalizedType = normalizeModuleType(m.type);
    const normalizedRaw = { ...m, type: normalizedType || m.type };
    const summary = buildModuleSummary(normalizedRaw as any);
    const { isValid, errors } = validateStepperModule(normalizedRaw as any);
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
): TIfcStepperModuleItem => {
  const { isValid, errors, normalized } = validateStepperModule(item.raw);
  return {
    ...item,
    summary: buildModuleSummary(item.raw),
    isValid,
    validationErrors: errors,
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

export const prepareModuleForBatch = (
  moduleItem: TIfcStepperModuleItem,
  isFoundation: boolean,
  unitIdOrFloorIds: { unit_id?: string; floor_ids?: string[] },
): { type: TModulesTypes | string; data: Record<string, unknown> } | null => {
  const rawType = moduleItem.raw.type;
  const d = moduleItem.raw.data ?? {};
  const clean: Record<string, unknown> = {};
  Object.keys(d).forEach((k) => {
    (clean as any)[k] = (d as any)[k];
  });
  if (isFoundation) {
    if (unitIdOrFloorIds.unit_id) {
      clean.unit_id = unitIdOrFloorIds.unit_id;
    }
  } else if (unitIdOrFloorIds.floor_ids?.length) {
    clean.floor_ids = unitIdOrFloorIds.floor_ids;
  }
  return { type: rawType, data: clean };
};

export const ifcStepperUtils = {
  generateTempId,
  isKnownModuleType,
};
