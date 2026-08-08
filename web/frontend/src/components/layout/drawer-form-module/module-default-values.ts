import { useTranslation } from "@/i18n";
import {
  TBeamColumnPosition,
  TConcreteWallPosition,
  TModulesTypes,
  TPilesFoundationPosition,
  TRaftFoundationPosition,
  TRaftPilesFoundationPosition,
  TStructuralMasonryPosition,
} from "@/types/modules";

export const POSITIONS_BY_TYPE: Record<TModulesTypes, readonly string[]> = {
  beam_column: [
    "column",
    "beam",
    "slab",
    "stair",
  ] as const satisfies readonly TBeamColumnPosition[],
  concrete_wall: [
    "wall",
    "slab",
    "stair",
  ] as const satisfies readonly TConcreteWallPosition[],
  structural_masonry: [
    "column",
    "beam",
    "slab",
    "stair",
  ] as const satisfies readonly TStructuralMasonryPosition[],
  raft_foundation: [
    "raft",
  ] as const satisfies readonly TRaftFoundationPosition[],
  piles_foundation: [
    "pile",
    "block",
    "grade_beam",
    "tie_beam",
  ] as const satisfies readonly TPilesFoundationPosition[],
  raft_piles_foundation: [
    "raft",
    "pile",
  ] as const satisfies readonly TRaftPilesFoundationPosition[],
};

export const REQUIRED_FIELDS_BY_TYPE_V2: Record<TModulesTypes, string[]> = {
  beam_column: ["concrete", "steel"],
  concrete_wall: ["concrete", "steel"],
  structural_masonry: ["masonry"],
  raft_foundation: ["concrete", "steel"],
  piles_foundation: ["concrete", "steel"],
  raft_piles_foundation: ["concrete", "steel"],
};

export const REQUIRED_POSITIONS_BY_TYPE: Record<
  TModulesTypes,
  readonly string[]
> = {
  beam_column: [
    "column",
    "beam",
    "slab",
  ] as const satisfies readonly TBeamColumnPosition[],
  concrete_wall: [
    "wall",
    "slab",
  ] as const satisfies readonly TConcreteWallPosition[],
  structural_masonry: [] as const,
  raft_foundation: [
    "raft",
  ] as const satisfies readonly TRaftFoundationPosition[],
  piles_foundation: [
    "pile",
  ] as const satisfies readonly TPilesFoundationPosition[],
  raft_piles_foundation: [
    "raft",
    "pile",
  ] as const satisfies readonly TRaftPilesFoundationPosition[],
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

export const useSlabTypeOptions = () => {
  const { t } = useTranslation();
  const s = t.modules.form.slabTypes;
  return [
    { value: "solid", label: s.solid },
    { value: "ribbed", label: s.ribbed },
    { value: "mushroom_solid", label: s.mushroom_solid },
    { value: "mushroom_ribbed", label: s.mushroom_ribbed },
    { value: "flat", label: s.flat },
    { value: "band_beam", label: s.band_beam },
    { value: "pt_solid", label: s.pt_solid },
    { value: "pt_ribbed", label: s.pt_ribbed },
    { value: "pt_mushroom_solid", label: s.pt_mushroom_solid },
    { value: "pt_mushroom_ribbed", label: s.pt_mushroom_ribbed },
    { value: "pt_flat", label: s.pt_flat },
    { value: "pt_band_beam", label: s.pt_band_beam },
    { value: "trussed", label: s.trussed },
    { value: "joist", label: s.joist },
    { value: "filigree", label: s.filigree },
    { value: "hollow_core", label: s.hollow_core },
    { value: "precast_solid", label: s.precast_solid },
    { value: "precast_ribbed", label: s.precast_ribbed },
    { value: "pt_precast", label: s.pt_precast },
  ];
};

const makeSteel = (position: string) => ({
  material: "rebar" as const,
  resistance: "CA50" as const,
  mass: "0",
  position,
});

const makeConcrete = (position: string) => ({
  fck: DEFAULT_FCK_BY_POSITION[position] ?? 25,
  volume: "0",
  position,
});

const makeForm = (position: string) => ({
  area: "0",
  position,
});

export const beamColumnDefaultValues = {
  type: "beam_column" as const,
  concrete: [
    makeConcrete("column"),
    makeConcrete("beam"),
    makeConcrete("slab"),
  ],
  steel: [makeSteel("column"), makeSteel("beam"), makeSteel("slab")],
  form: [makeForm("column"), makeForm("beam"), makeForm("slab")],
  column_number: "0",
  avg_beam_span: "0",
  avg_slab_span: "0",
  slab_type: undefined,
};

export const concreteWallDefaultValues = {
  type: "concrete_wall" as const,
  concrete: [makeConcrete("wall"), makeConcrete("slab")],
  steel: [makeSteel("wall"), makeSteel("slab")],
  form: [makeForm("wall"), makeForm("slab")],
  wall_thickness: "0",
  slab_thickness: "0",
  wall_area: "0",
  slab_area: "0",
  slab_type: undefined,
};

export const structuralMasonryDefaultValues = {
  type: "structural_masonry" as const,
  masonry: {
    blocks: [{ type: "inteiro (14x19x29)" as const, fbk: 6, quantity: "0" }],
    grout: [
      {
        position: "vertical" as const,
        volumes: [{ fgk: 20, volume: "0" }],
        steel: [
          {
            material: "rebar" as const,
            resistance: "CA50" as const,
            mass: "0",
            position: "vertical",
          },
        ],
      },
    ],
    mortar: [{ fak: 4.5, volume: "0" }],
  },
  concrete: [makeConcrete("slab")],
  steel: [makeSteel("slab")],
  form: [makeForm("slab")],
  slab_type: undefined,
};

export const raftFoundationDefaultValues = {
  type: "raft_foundation" as const,
  concrete: [makeConcrete("raft")],
  steel: [makeSteel("raft")],
};

export const pilesFoundationDefaultValues = {
  type: "piles_foundation" as const,
  concrete: [
    makeConcrete("pile"),
    { ...makeConcrete("block"), volume: "0" },
    { ...makeConcrete("grade_beam"), volume: "0" },
    { ...makeConcrete("tie_beam"), volume: "0" },
  ],
  steel: [makeSteel("pile")],
};

export const raftPilesFoundationDefaultValues = {
  type: "raft_piles_foundation" as const,
  concrete: [makeConcrete("raft"), makeConcrete("pile")],
  steel: [makeSteel("raft"), makeSteel("pile")],
};

export const getDefaultValuesByType = (type: TModulesTypes) => {
  switch (type) {
    case "beam_column":
      return beamColumnDefaultValues;
    case "concrete_wall":
      return concreteWallDefaultValues;
    case "structural_masonry":
      return structuralMasonryDefaultValues;
    case "raft_foundation":
      return raftFoundationDefaultValues;
    case "piles_foundation":
      return pilesFoundationDefaultValues;
    case "raft_piles_foundation":
      return raftPilesFoundationDefaultValues;
    default:
      return concreteWallDefaultValues;
  }
};
