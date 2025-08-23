import { TModulesTypes } from "@/types/modules";

const basicDefaultValues = {
  name: "",
};

// Valores padrão seguindo a nova tipagem type2.ts
export const concreteWallDefaultValues = {
  ...basicDefaultValues,
  type: "concrete_wall" as const,
  concreteWalls: {
    volumes: [{ fck: 25, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concreteSlabs: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  wallThickness: 0,
  slabThickness: 0,
  formArea: 0,
  wallArea: 0,
};

export const beamColumnDefaultValues = {
  ...basicDefaultValues,
  type: "beam_column" as const,
  concreteColumns: {
    volumes: [{ fck: 25, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concreteBeams: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concreteSlabs: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  formColumns: 0,
  formBeams: 0,
  formSlabs: 0,
  columnNumber: 0,
  avgBeamSpan: 0,
  avgSlabSpan: 0,
};

// Comentado: valores padrão para structural masonry
// export const structuralMasonryDefaultValues = {
//   ...basicDefaultValues,
//   type: "structural_masonry" as const,
//   // será definido depois
// };

// Função para obter valores padrão baseados no tipo de estrutura
export const getDefaultValuesByType = (type: TModulesTypes) => {
  switch (type) {
    case "beam_column":
      return beamColumnDefaultValues;
    case "concrete_wall":
      return concreteWallDefaultValues;
    // case "structural_masonry":
    //   return structuralMasonryDefaultValues;
    default:
      return concreteWallDefaultValues; // Default para concrete_wall
  }
};
