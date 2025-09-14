import { TModulesTypes } from "@/types/modules";

// Valores padrão seguindo a nova tipagem type2.ts
export const concreteWallDefaultValues = {
  type: "concrete_wall" as const,
  concrete_walls: {
    volumes: [{ fck: 25, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  wall_thickness: 0,
  slab_thickness: 0,
  wall_area: 0,
  slab_area: 0,
  wall_form_area: 0,
  slab_form_area: 0,
};

export const beamColumnDefaultValues = {
  type: "beam_column" as const,
  concrete_columns: {
    volumes: [{ fck: 25, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concrete_beams: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: 0 }],
    steel: [{ ca: 50 as const, mass: 0 }],
  },
  form_columns: 0,
  form_beams: 0,
  form_slabs: 0,
  column_number: 0,
  avg_beam_span: 0,
  avg_slab_span: 0,
};

// Comentado: valores padrão para structural masonry
// export const structuralMasonryDefaultValues = {
//   ...basicDefaultValues,
//   type: "structural_masonry" as const,
//   // será definido depois
// };

export const getDefaultValuesByType = (type: TModulesTypes) => {
  switch (type) {
    case "beam_column":
      return beamColumnDefaultValues;
    case "concrete_wall":
      return concreteWallDefaultValues;
    default:
      return concreteWallDefaultValues;
  }
};
