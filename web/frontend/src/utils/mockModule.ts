import { TModuleStructure } from "@/types/modules";

export const mockModuleConcreteWall: TModuleStructure = {
  id: 1,
  name: "Mov1",
  type: "concrete_wall",
  floor_repetition: 4,
  floor_area: 80,
  floor_height: 3,
  concrete_walls: [
    {
      fck: "20",
      volume: 19.67,
    },
  ],
  concrete_slabs: [
    {
      fck: "30",
      volume: 28.17,
    },
  ],
  steel_ca50: 30,
  steel_ca60: 40,
  wall_thickness: 20,
  slab_thickness: 10,
  form_area: 10,
  wall_area: 10,
};

export const mockModuleBeamColumn: TModuleStructure = {
  id: 2,
  name: "Mov2",
  type: "beam_column",
  floor_repetition: 3,
  floor_area: 100,
  floor_height: 3,
  concrete_columns: [
    {
      fck: "25",
      volume: 15.5,
    },
  ],
  concrete_beams: [
    {
      fck: "30",
      volume: 20.3,
    },
  ],
  concrete_slabs: [
    {
      fck: "30",
      volume: 25.0,
    },
  ],
  steel_ca50: 50,
  steel_ca60: 60,
  form_columns: 5,
  form_beams: 10,
  form_slabs: 15,
  form_total: 30,
  column_number: 4,
  avg_beam_span: 6,
  avg_slab_span: 8,
};

export const mockModuleStructuralMasonry: TModuleStructure = {
  id: 3,
  name: "Mov3",
  type: "structural_masonry",
  floor_repetition: 2,
  floor_area: 120,
  floor_height: 3,
  vertical_grout: [{ fck: "25" as const, volume: 0 }],
  horizontal_grout: [{ fck: "25" as const, volume: 0 }],
  blocks: [
    {
      type: "BL 14x19" as const,
      fbk: "06" as const,
      quantity: 0,
    },
  ],
  steel_ca50: 20,
  steel_ca60: 30,
};
