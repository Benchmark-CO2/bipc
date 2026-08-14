import {
  TBeamColumnPosition,
  TConcreteWallPosition,
  TModulesTypes,
  TPilesFoundationPosition,
  TRaftFoundationPosition,
  TRaftPilesFoundationPosition,
  TStructuralMasonryPosition,
  TGroutPosition,
} from "@/types/modules";

export type TMaterialKind = "concrete" | "steel" | "form";

export const MATERIAL_POSITIONS_BY_TYPE: Record<
  TModulesTypes,
  Record<TMaterialKind, readonly string[]>
> = {
  beam_column: {
    concrete: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TBeamColumnPosition[],
    steel: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TBeamColumnPosition[],
    form: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TBeamColumnPosition[],
  },
  concrete_wall: {
    concrete: ["wall", "slab", "stair"] as const satisfies readonly TConcreteWallPosition[],
    steel: ["wall", "slab", "stair"] as const satisfies readonly TConcreteWallPosition[],
    form: ["wall", "slab", "stair"] as const satisfies readonly TConcreteWallPosition[],
  },
  structural_masonry: {
    concrete: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TStructuralMasonryPosition[],
    steel: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TStructuralMasonryPosition[],
    form: [
      "column",
      "beam",
      "slab",
      "stair",
    ] as const satisfies readonly TStructuralMasonryPosition[],
  },
  raft_foundation: {
    concrete: ["raft"] as const satisfies readonly TRaftFoundationPosition[],
    steel: ["raft"] as const satisfies readonly TRaftFoundationPosition[],
    form: [] as const,
  },
  piles_foundation: {
    concrete: [
      "pile",
      "block",
      "grade_beam",
      "tie_beam",
    ] as const satisfies readonly TPilesFoundationPosition[],
    steel: [
      "pile",
      "block",
      "grade_beam",
      "tie_beam",
    ] as const satisfies readonly TPilesFoundationPosition[],
    form: [] as const,
  },
  raft_piles_foundation: {
    concrete: ["raft", "pile"] as const satisfies readonly TRaftPilesFoundationPosition[],
    steel: ["raft", "pile"] as const satisfies readonly TRaftPilesFoundationPosition[],
    form: [] as const,
  },
};

export type TScalarFieldDef = {
  key: string;
  kind: "number" | "select";
  placeholder?: string;
};

export const SCALAR_FIELDS_BY_TYPE: Record<TModulesTypes, readonly TScalarFieldDef[]> = {
  beam_column: [
    { key: "slab_type", kind: "select" },
    { key: "column_number", kind: "number" },
    { key: "beam_number", kind: "number" },
    { key: "slab_number", kind: "number" },
    { key: "avg_beam_span", kind: "number" },
    { key: "avg_slab_span", kind: "number" },
  ] as const,
  concrete_wall: [
    { key: "slab_type", kind: "select" },
    { key: "wall_thickness", kind: "number" },
    { key: "slab_thickness", kind: "number" },
    { key: "wall_area", kind: "number" },
    { key: "slab_area", kind: "number" },
    { key: "beam_number", kind: "number" },
    { key: "slab_number", kind: "number" },
  ] as const,
  structural_masonry: [
    { key: "slab_type", kind: "select" },
    { key: "beam_number", kind: "number" },
    { key: "slab_number", kind: "number" },
  ] as const,
  raft_foundation: [
    { key: "raft_area", kind: "number" },
    { key: "raft_thickness", kind: "number" },
  ] as const,
  piles_foundation: [] as const,
  raft_piles_foundation: [
    { key: "raft_area", kind: "number" },
    { key: "raft_thickness", kind: "number" },
  ] as const,
};

export const DEFAULT_FCK_BY_POSITION: Record<string, number> = {
  column: 25,
  beam: 30,
  slab: 30,
  wall: 25,
  stair: 30,
  raft: 25,
  pile: 30,
  block: 25,
  grade_beam: 25,
  tie_beam: 25,
};

export const GROUT_POSITIONS: readonly TGroutPosition[] = ["vertical", "horizontal"];
