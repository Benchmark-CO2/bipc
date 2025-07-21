import { TModulesTypes } from "@/types/modules";

const basicDefaultValues = {
  name: "",
  floor_repetition: 1,
  floor_area: 0,
  floor_height: 0,
};

export const concreteWallDefaultValues = {
  ...basicDefaultValues,
  type: "concrete_wall" as const,
  concrete_walls: [{ fck: "25" as const, volume: 0 }],
  concrete_slabs: [{ fck: "30" as const, volume: 0 }],
  steel_ca50: 0,
  steel_ca60: 0,
  wall_thickness: 0,
  slab_thickness: 0,
  form_area: 0,
  wall_area: 0,
};

export const beamColumnDefaultValues = {
  ...basicDefaultValues,
  type: "beam_column" as const,
  concrete_columns: [{ fck: "25" as const, volume: 0 }],
  concrete_beams: [{ fck: "30" as const, volume: 0 }],
  concrete_slabs: [{ fck: "30" as const, volume: 0 }],
  steel_ca50: 0,
  steel_ca60: 0,
  form_columns: 0,
  form_beams: 0,
  form_slabs: 0,
  form_total: 0,
  column_number: 0,
  avg_beam_span: 0,
  avg_slab_span: 0,
};

export const structuralMasonryDefaultValues = {
  ...basicDefaultValues,
  type: "structural_masonry" as const,
  vertical_grout: [{ fck: "25" as const, volume: 0 }],
  horizontal_grout: [{ fck: "25" as const, volume: 0 }],
  blocks: [{ type: "BL 14x19" as const, fbk: "06" as const, quantity: 0 }],
  steel_ca50: 0,
  steel_ca60: 0,
};

// Função para obter valores padrão baseados no tipo de estrutura
export const getDefaultValuesByType = (type: TModulesTypes) => {
  switch (type) {
    case "beam_column":
      return beamColumnDefaultValues;
    case "concrete_wall":
      return concreteWallDefaultValues;
    case "structural_masonry":
      return structuralMasonryDefaultValues;
    default:
      return concreteWallDefaultValues; // Default para concrete_wall
  }
};
