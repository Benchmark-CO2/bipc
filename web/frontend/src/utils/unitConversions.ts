import { TTowerFloorCategory, IUnit } from "@/types/units";
import {
  FloorSchema,
  FloorFormInput,
  UnitFormInput,
} from "@/validators/unitForm.validator";

// Função para determinar categoria baseada no índice
// IMPORTANTE: Agora a categoria é definida pelo usuário, não automaticamente pelo índice
// Esta função só é usada como fallback quando não há categoria definida
export const getCategoryFromIndex = (
  index: number,
): FloorSchema["category"] => {
  if (index < 0) return "basement_floor";
  // Para índices >= 0, retorna uma categoria padrão, mas o ideal é sempre ter category definida
  return "standard_floor";
};

// Função para determinar índice baseado na categoria
export const getIndexFromCategory = (
  category: FloorSchema["category"],
  currentIndex?: number,
): number => {
  // Se já tem um índice, usa ele
  if (currentIndex !== undefined) return currentIndex;

  // Senão, define um índice padrão baseado na categoria
  switch (category) {
    case "basement_floor":
      return -1;
    case "ground_floor":
      return 0;
    case "standard_floor":
      return 1;
    case "penthouse_floor":
      return 21;
    default:
      return 1;
  }
};

// Converte TTowerFloorCategory[] para FloorSchema[]
// IMPORTANTE: Agora cada floor é individual, sem agrupamento
// A ordenação segue o índice de cada floor
export const convertTowerFloorsToFloorSchema = (
  towerFloors: TTowerFloorCategory[],
): FloorSchema[] => {
  // Mapear cada floor individual diretamente
  const floors = towerFloors.map((floor) => ({
    id: floor.id,
    floor_group:
      floor.floor_group ||
      (floor as unknown as { group_name?: string })?.group_name ||
      "",
    area: floor.area,
    height: floor.height,
    category: floor.category || getCategoryFromIndex(floor.index),
    index: floor.index,
  }));

  // Ordenar por índice (do menor para o maior para lógica interna)
  return floors.sort((a, b) => a.index - b.index);
};

// Converte FloorSchema[] para TTowerFloorCategory[]
export const convertFloorSchemaToTowerFloors = (
  floors: FloorSchema[],
): TTowerFloorCategory[] => {
  return floors.map((floor) => ({
    id: floor.id || `temp-${floor.index}`,
    floor_group: floor.floor_group,
    group_id: floor.floor_group,
    group_name: floor.floor_group,
    area: floor.area,
    height: floor.height,
    index: floor.index,
    category: floor.category,
  }));
};

// Converte FloorFormInput[] (state do formulário de unidade, com strings área/altura)
// para TTowerFloorCategory[] (formato compatível com BuildingVisualizer e DrawerFormModule)
export const convertFloorFormInputToTowerFloors = (
  floors: FloorFormInput[],
): TTowerFloorCategory[] => {
  const result: TTowerFloorCategory[] = [];
  for (const floor of floors) {
    const repetition = Math.max(1, Number(floor.repetition ?? 1) || 1);
    const baseArea =
      typeof floor.area === "string"
        ? Number(String(floor.area).replace(",", ".")) || 0
        : (floor.area as unknown as number) || 0;
    const baseHeight =
      typeof floor.height === "string"
        ? Number(String(floor.height).replace(",", ".")) || 0
        : (floor.height as unknown as number) || 0;
    const baseFloorGroup = floor.floor_group || undefined;
    const baseCategory = floor.category || getCategoryFromIndex(floor.index);

    for (let i = 0; i < repetition; i++) {
      const realIndex = floor.index + i;
      const realCategory =
        repetition > 1 ? getCategoryFromIndex(realIndex) : baseCategory;
      result.push({
        id:
          repetition > 1
            ? `${floor.id || `temp-${floor.index}`}-r${i}`
            : floor.id || `temp-${floor.index}`,
        floor_group: baseFloorGroup,
        area: baseArea,
        height: baseHeight,
        index: realIndex,
        category: realCategory,
      });
    }
  }
  return result;
};

export function mapFloorIndexToFloorIds(
  floorIndex: number | number[] | undefined | null,
  towerFloors: TTowerFloorCategory[],
): string[] {
  if (floorIndex === undefined || floorIndex === null) return [];
  if (!towerFloors || towerFloors.length === 0) return [];
  const indexes: number[] = Array.isArray(floorIndex)
    ? floorIndex
    : [floorIndex];
  const set = new Set(indexes.filter(Number.isFinite));
  return towerFloors.filter((f) => set.has(f.index)).map((f) => f.id);
}

// Converte IUnit para dados do formulário
export const convertUnitToFormData = (unit: IUnit): UnitFormInput => {
  if (!unit.floors || unit.floors.length === 0) {
    return {
      name: unit.name,
      type: unit.type as "tower",
      ...(unit.housing_units_count !== undefined && {
        housing_units_count: unit.housing_units_count,
      }),
      repetition_count: unit.repetition_count ?? 1,
      data: {
        floors: [],
      },
    };
  }

  // No modo de edição, cada floor vem individual do backend (sem repetition)
  // Converter cada floor individual para o formato do formulário
  const floorFormInputs: FloorFormInput[] = unit.floors.map((floor) => ({
    id: floor.id,
    floor_group:
      floor.floor_group ||
      (floor as unknown as { group_name?: string })?.group_name ||
      "",
    area: floor.area.toString().replace(".", ","), // Converter número para string com formato BR
    height: floor.height.toString().replace(".", ","),
    category: floor.category || getCategoryFromIndex(floor.index),
    index: floor.index,
    // Não incluir repetition no modo de edição
  }));

  // Ordenar por índice para exibição correta
  floorFormInputs.sort((a, b) => a.index - b.index);

  return {
    name: unit.name,
    type: unit.type as "tower",
    ...(unit.housing_units_count !== undefined && {
      housing_units_count: unit.housing_units_count,
    }),
    repetition_count: unit.repetition_count ?? 1,
    data: {
      floors: floorFormInputs,
    },
  };
};

// Tipo unificado para o BuildingVisualizer
export type UnifiedFloor = {
  id: string;
  name: string;
  area: number;
  height: number;
  category: FloorSchema["category"];
  index: number;
};

export interface FloorFallbackLabels {
  ground: string;
  penthouse: string;
  basementOnly: string;
  basementNumbered: (n: number) => string;
  standardOrdinalPositive: (n: number) => string;
  standardNumbered: (n: number) => string;
}

const DEFAULT_FALLBACK_LABELS_PT: FloorFallbackLabels = {
  ground: "Térreo",
  penthouse: "Cobertura",
  basementOnly: "Subsolo",
  basementNumbered: (n) => `Subsolo ${n}`,
  standardOrdinalPositive: (n) => `${n}º Andar`,
  standardNumbered: (n) => `Andar ${n}`,
};

export const makeFloorFallbackLabels = (opts: {
  ground: string;
  penthouse: string;
  basementOnly: string;
  basementNumberedTemplate: string;
  standardOrdinalPositiveTemplate: string;
  standardNumberedTemplate: string;
}): FloorFallbackLabels => {
  const interpolate = (template: string, n: number): string =>
    template.split("{n}").join(String(n));
  return {
    ground: opts.ground,
    penthouse: opts.penthouse,
    basementOnly: opts.basementOnly,
    basementNumbered: (n) => interpolate(opts.basementNumberedTemplate, n),
    standardOrdinalPositive: (n) =>
      interpolate(opts.standardOrdinalPositiveTemplate, n),
    standardNumbered: (n) => interpolate(opts.standardNumberedTemplate, n),
  };
};

const fallbackNameForFloor = (
  category: FloorSchema["category"] | undefined,
  index: number,
  labels: FloorFallbackLabels = DEFAULT_FALLBACK_LABELS_PT,
): string => {
  switch (category) {
    case "ground_floor":
      return labels.ground;
    case "penthouse_floor":
      return labels.penthouse;
    case "basement_floor": {
      const n = Math.abs(index);
      return n > 0 ? labels.basementNumbered(n) : labels.basementOnly;
    }
    case "standard_floor":
    default:
      return index >= 0
        ? labels.standardOrdinalPositive(index)
        : labels.standardNumbered(index);
  }
};

// Converte TTowerFloorCategory[] para UnifiedFloor[]
export const convertTowerFloorsToUnified = (
  towerFloors: TTowerFloorCategory[],
  labels?: FloorFallbackLabels,
): UnifiedFloor[] => {
  const result: UnifiedFloor[] = [];
  for (const floor of towerFloors) {
    const repetition = Math.max(
      1,
      Number(
        (floor as unknown as { repetition?: number | string })?.repetition ?? 1,
      ) || 1,
    );
    const category = floor.category || getCategoryFromIndex(floor.index);
    const baseName =
      floor.floor_group?.trim() ||
      (floor as unknown as { group_name?: string })?.group_name?.trim() ||
      "";
    for (let i = 0; i < repetition; i++) {
      const realIndex = floor.index + i;
      const realCategory =
        repetition > 1 ? getCategoryFromIndex(realIndex) : category;
      const name =
        baseName || fallbackNameForFloor(realCategory, realIndex, labels);
      result.push({
        id:
          repetition > 1
            ? `${floor.id}-r${i}`
            : (floor as unknown as { id?: string })?.id ||
              `floor-${realIndex}-${i}`,
        name,
        area: floor.area,
        height: floor.height,
        category: realCategory,
        index: realIndex,
      });
    }
  }
  return result;
};

// Converte FloorSchema[] para UnifiedFloor[]
export const convertFloorSchemaToUnified = (
  floors: FloorSchema[],
  labels?: FloorFallbackLabels,
): UnifiedFloor[] => {
  return floors.map((floor) => {
    const category = floor.category || getCategoryFromIndex(floor.index);
    const baseName = (floor.floor_group || "").trim();
    return {
      id: floor.id || `floor-${floor.index}`,
      name: baseName || fallbackNameForFloor(category, floor.index, labels),
      area: floor.area,
      height: floor.height,
      category,
      index: floor.index,
    };
  });
};

// Converte FloorFormInput[] para UnifiedFloor[] (para uso no formulário)
export const convertFloorFormInputToUnified = (
  floors: FloorFormInput[],
  labels?: FloorFallbackLabels,
): UnifiedFloor[] => {
  const unifiedFloors: UnifiedFloor[] = [];

  floors.forEach((floor) => {
    const area = parseFloat(floor.area.replace(",", ".")) || 0;
    const height = parseFloat(floor.height.replace(",", ".")) || 0;
    const repetition = Math.max(1, Number(floor.repetition ?? 1) || 1);
    const baseName = (floor.floor_group || "").trim();
    const baseCategory = floor.category || getCategoryFromIndex(floor.index);

    for (let i = 0; i < repetition; i++) {
      const realIndex = floor.index + i;
      const realCategory =
        repetition > 1 ? getCategoryFromIndex(realIndex) : baseCategory;
      const name =
        baseName || fallbackNameForFloor(realCategory, realIndex, labels);
      unifiedFloors.push({
        id: floor.id || `floor-${floor.index}-${i}`,
        name,
        area,
        height,
        category: realCategory,
        index: realIndex,
      });
    }
  });

  return unifiedFloors;
};
