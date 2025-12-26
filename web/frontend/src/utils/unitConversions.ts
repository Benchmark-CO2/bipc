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
  index: number
): FloorSchema["category"] => {
  if (index < 0) return "basement_floor";
  // Para índices >= 0, retorna uma categoria padrão, mas o ideal é sempre ter category definida
  return "standard_floor";
};

// Função para determinar índice baseado na categoria
export const getIndexFromCategory = (
  category: FloorSchema["category"],
  currentIndex?: number
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
  towerFloors: TTowerFloorCategory[]
): FloorSchema[] => {
  // Mapear cada floor individual diretamente
  const floors = towerFloors.map((floor) => ({
    id: floor.id,
    floor_group: floor.floor_group || floor.group_name || "",
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
  floors: FloorSchema[]
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

// Converte IUnit para dados do formulário
export const convertUnitToFormData = (unit: IUnit): UnitFormInput => {
  if (!unit.floors || unit.floors.length === 0) {
    return {
      name: unit.name,
      type: unit.type as "tower",
      data: {
        floors: [],
      },
    };
  }

  // No modo de edição, cada floor vem individual do backend (sem repetition)
  // Converter cada floor individual para o formato do formulário
  const floorFormInputs: FloorFormInput[] = unit.floors.map((floor) => ({
    id: floor.id,
    floor_group: floor.floor_group || floor.group_name || "",
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

// Converte TTowerFloorCategory[] para UnifiedFloor[]
export const convertTowerFloorsToUnified = (
  towerFloors: TTowerFloorCategory[]
): UnifiedFloor[] => {
  return towerFloors.map((floor) => ({
    id: floor.id,
    name: floor.floor_group || floor.group_name || "",
    area: floor.area,
    height: floor.height,
    category: floor.category || getCategoryFromIndex(floor.index),
    index: floor.index,
  }));
};

// Converte FloorSchema[] para UnifiedFloor[]
export const convertFloorSchemaToUnified = (
  floors: FloorSchema[]
): UnifiedFloor[] => {
  return floors.map((floor) => ({
    id: floor.id || `floor-${floor.index}`,
    name: floor.floor_group,
    area: floor.area,
    height: floor.height,
    category: floor.category,
    index: floor.index,
  }));
};

// Converte FloorFormInput[] para UnifiedFloor[] (para uso no formulário)
export const convertFloorFormInputToUnified = (
  floors: FloorFormInput[]
): UnifiedFloor[] => {
  const unifiedFloors: UnifiedFloor[] = [];

  floors.forEach((floor) => {
    // Converter strings para números, tratando vírgulas como separador decimal
    const area = parseFloat(floor.area.replace(",", ".")) || 0;
    const height = parseFloat(floor.height.replace(",", ".")) || 0;
    const repetition = floor.repetition || 1;

    // Expandir floors com repetition > 1 para visualização
    for (let i = 0; i < repetition; i++) {
      unifiedFloors.push({
        id: floor.id || `floor-${floor.index}-${i}`,
        name: floor.floor_group,
        area,
        height,
        category: floor.category,
        index: floor.index + i,
      });
    }
  });

  return unifiedFloors;
};
