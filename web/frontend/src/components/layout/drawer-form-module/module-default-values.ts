import { TModulesTypes } from "@/types/modules";

export const slabTypeOptions = [
  {
    value: "solid",
    label: "Laje maciça (concreto armado) com vigas ou paredes estruturais",
  },
  {
    value: "ribbed",
    label: "Laje nervurada (unidirecional, bidirecional / tipo waffle)",
  },
  { value: "mushroom_solid", label: "Laje maciça cogumelo (com capitel)" },
  { value: "mushroom_ribbed", label: "Laje nervurada cogumelo (com capitel)" },
  { value: "flat", label: "Laje plana / sem vigas" },
  { value: "band_beam", label: "Laje com vigas-faixa" },
  { value: "pt_solid", label: "Laje protendida maciça" },
  { value: "pt_ribbed", label: "Laje protendida nervurada" },
  {
    value: "pt_mushroom_solid",
    label: "Laje protendida maciça cogumelo (com capitel)",
  },
  {
    value: "pt_mushroom_ribbed",
    label: "Laje protendida nervurada cogumelo (com capitel)",
  },
  { value: "pt_flat", label: "Laje plana protendida / sem vigas" },
  { value: "pt_band_beam", label: "Laje protendida com vigas-faixa" },
  {
    value: "trussed",
    label: "Laje treliçada (vigota treliçada + enchimento + capa)",
  },
  {
    value: "joist",
    label: "Laje de vigotas pré-moldadas (viga T/invertida etc.)",
  },
  {
    value: "filigree",
    label: "Pré-laje / laje filigrana (placa fina pré-moldada)",
  },
  { value: "hollow_core", label: "Laje alveolar (protendida)" },
  { value: "precast_solid", label: "Painel maciço pré-moldado (placa maciça)" },
  {
    value: "precast_ribbed",
    label: "Painéis nervurados pré-moldados (T, TT e variações)",
  },
  { value: "pt_precast", label: "Lajes protendidas pré-moldadas" },
];

export const concreteWallDefaultValues = {
  type: "concrete_wall" as const,
  concrete_walls: {
    volumes: [{ fck: 25, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  wall_thickness: "0",
  slab_thickness: "0",
  wall_area: "0",
  slab_area: 0,
  wall_form_area: "0",
  slab_form_area: "0",
  slab_type: undefined as string | undefined,
};

export const beamColumnDefaultValues = {
  type: "beam_column" as const,
  concrete_columns: {
    volumes: [{ fck: 25, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  concrete_beams: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  form_columns: "0",
  form_beams: "0",
  form_slabs: "0",
  column_number: "0",
  avg_beam_span: "0",
  avg_slab_span: "0",
  slab_type: undefined as string | undefined,
};

export const structuralMasonryDefaultValues = {
  type: "structural_masonry" as const,
  masonry_blocks: [
    { type: "inteiro (14x19x29)" as const, fbk: 6, quantity: "0" },
  ],
  grout: [
    {
      position: "vertical" as const,
      volumes: [{ fgk: 20, volume: "0" }],
      steel: [
        {
          material: "rebar" as const,
          resistance: "CA50" as const,
          mass: "0",
        },
      ],
    },
  ],
  mortar: [{ fak: 4.5, volume: "0" }],
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  form_slabs: "0",
  slab_type: undefined as string | undefined,
};

export const raftFoundationDefaultValues = {
  type: "raft_foundation" as const,
  area: "0",
  thickness: "0",
  fck: 25,
  steel: [
    {
      material: "rebar" as const,
      resistance: "CA50" as const,
      mass: "0",
    },
  ],
};

export const pilesFoundationDefaultValues = {
  type: "piles_foundation" as const,
  fck: 30,
  piles: {
    volume: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  pile_caps: {
    volume: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  grade_beams: {
    volume: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  tie_beams: {
    volume: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
};

export const raftPilesFoundationDefaultValues = {
  type: "raft_piles_foundation" as const,
  fck: 25,
  raft: {
    area: "0",
    thickness: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
  piles: {
    volume: "0",
    steel: [
      {
        material: "rebar" as const,
        resistance: "CA50" as const,
        mass: "0",
      },
    ],
  },
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
