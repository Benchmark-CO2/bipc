import { TTowerFloorCategory, IUnit } from "@/types/units";
import { FloorSchema } from "@/validators/unitForm.validator";

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
// IMPORTANTE: A ordenação sempre segue a hierarquia:
// 1. penthouse_floor (cobertura) - topo
// 2. standard_floor (tipo) - meio
// 3. ground_floor (térreo) - nível do solo
// 4. basement_floor (subsolo) - abaixo do solo
export const convertTowerFloorsToFloorGroups = (
  towerFloors: TTowerFloorCategory[]
): FloorSchema[] => {
  // Primeiro, agrupar por group_name
  const grouped = towerFloors.reduce(
    (acc, floor) => {
      const groupName = floor.group_name;
      if (!acc[groupName]) {
        acc[groupName] = {
          name: floor.group_name,
          area: floor.area,
          height: floor.height,
          repetition: 1,
          category: floor.category || getCategoryFromIndex(floor.index),
          index: floor.index, // Incluir o índice
          minIndex: floor.index,
          maxIndex: floor.index,
        };
      } else {
        acc[groupName].repetition += 1;
        acc[groupName].minIndex = Math.min(
          acc[groupName].minIndex,
          floor.index
        );
        acc[groupName].maxIndex = Math.max(
          acc[groupName].maxIndex,
          floor.index
        );
      }
      return acc;
    },
    {} as Record<string, FloorSchema & { minIndex: number; maxIndex: number }>
  );

  // Converter para array e ordenar
  const floorGroups = Object.values(grouped).map(
    ({ minIndex, maxIndex, ...floor }) => ({
      ...floor,
      // Se todos os floors do grupo têm o mesmo índice, usar esse índice
      // Senão, usar o índice mínimo como referência
      index: minIndex === maxIndex ? minIndex : minIndex,
    })
  );

  // Ordenar por categoria primeiro, depois por índice (se disponível), depois por nome
  return floorGroups.sort((a, b) => {
    const categoryOrder = {
      penthouse_floor: 0,
      standard_floor: 1,
      ground_floor: 2,
      basement_floor: 3,
    };

    const aCategoryOrder = categoryOrder[a.category];
    const bCategoryOrder = categoryOrder[b.category];

    if (aCategoryOrder !== bCategoryOrder) {
      return aCategoryOrder - bCategoryOrder;
    }

    // Se mesma categoria, ordenar por índice (se disponível)
    if (a.index !== undefined && b.index !== undefined) {
      // Para todas as categorias: índices maiores ficam acima na visualização
      // Isso significa que para standard_floor com índices 1, 2, 3...
      // o índice 3 aparece antes do índice 1 (mais acima na torre)
      return b.index - a.index; // maior índice primeiro (mais acima)
    }

    // Se não tem índice, ordenar por nome
    return a.name.localeCompare(b.name);
  });
};

// Converte FloorSchema[] para TTowerFloorCategory[]
export const convertFloorGroupsToTowerFloors = (
  floorGroups: FloorSchema[]
): TTowerFloorCategory[] => {
  const towerFloors: TTowerFloorCategory[] = [];

  floorGroups.forEach((group, groupIndex) => {
    const baseIndex =
      group.index !== undefined
        ? group.index
        : getIndexFromCategory(group.category);

    for (let i = 0; i < group.repetition; i++) {
      const floor: TTowerFloorCategory = {
        id: `${group.name}-${i}`,
        group_id: `group-${groupIndex}`,
        group_name: group.name,
        area: group.area,
        height: group.height,
        index: baseIndex + i,
        consumption: {
          co2_max: 0,
          co2_min: 0,
          energy_max: 0,
          energy_min: 0,
        },
        category: group.category,
      };

      towerFloors.push(floor);
    }
  });

  return towerFloors.sort((a, b) => b.index - a.index); // Ordenar do topo para baixo
};

// Converte IUnit para dados do formulário
export const convertUnitToFormData = (unit: IUnit) => {
  if (!unit.floors) {
    return {
      name: unit.name,
      type: unit.type,
      data: {
        floor_groups: [],
      },
    };
  }

  const floorGroups = convertTowerFloorsToFloorGroups(unit.floors);

  return {
    name: unit.name,
    type: unit.type,
    data: {
      floor_groups: floorGroups,
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
  repetition: number;
};

// Converte TTowerFloorCategory[] para UnifiedFloor[]
export const convertTowerFloorsToUnified = (
  towerFloors: TTowerFloorCategory[]
): UnifiedFloor[] => {
  // Primeiro ordenar os floors por categoria e índice
  const sortedFloors = towerFloors.slice().sort((a, b) => {
    const categoryOrder = {
      penthouse_floor: 0,
      standard_floor: 1,
      ground_floor: 2,
      basement_floor: 3,
    };

    const aCategoryOrder =
      categoryOrder[a.category || getCategoryFromIndex(a.index)];
    const bCategoryOrder =
      categoryOrder[b.category || getCategoryFromIndex(b.index)];

    if (aCategoryOrder !== bCategoryOrder) {
      return aCategoryOrder - bCategoryOrder;
    }

    // Se mesma categoria, ordenar por índice (do maior para o menor para ficar visual correto)
    return b.index - a.index;
  });

  return sortedFloors.map((floor) => ({
    id: floor.id,
    name: floor.group_name,
    area: floor.area,
    height: floor.height,
    repetition: 1, // TTowerFloorCategory não tem repetição
    category: floor.category || getCategoryFromIndex(floor.index),
  }));
};

// Converte FloorSchema[] para UnifiedFloor[]
export const convertFloorSchemaToUnified = (
  floors: FloorSchema[]
): UnifiedFloor[] => {
  return floors.map((floor, index) => ({
    id: `floor-${index}`,
    name: floor.name,
    area: floor.area,
    height: floor.height,
    repetition: floor.repetition,
    category: floor.category,
  }));
};
