import { TModulesTypes } from "@/types/modules";

export const concreteWallDefaultValues = {
  type: "concrete_wall" as const,
  concrete_walls: {
    volumes: [{ fck: 25, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  wall_thickness: "0",
  slab_thickness: "0",
  wall_area: "0",
  slab_area: 0,
  wall_form_area: "0",
  slab_form_area: "0",
};

export const beamColumnDefaultValues = {
  type: "beam_column" as const,
  concrete_columns: {
    volumes: [{ fck: 25, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  concrete_beams: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  form_columns: "0",
  form_beams: "0",
  form_slabs: "0",
  column_number: "0",
  avg_beam_span: "0",
  avg_slab_span: "0",
};

export const structuralMasonryDefaultValues = {
  type: "structural_masonry" as const,
  blocks: [{ type: "inteiro (14x19x29)" as const, fbk: 6, quantity: "0" }],
  grout: [
    {
      position: "vertical" as const,
      volumes: [{ fgk: 20, volume: "0" }],
      steel: [{ ca: 50 as const, mass: "0" }],
    },
  ],
  mortar: [{ fak: 4.5, volume: "0" }],
  concrete_slabs: {
    volumes: [{ fck: 30, volume: "0" }],
    steel: [{ ca: 50 as const, mass: "0" }],
  },
  form_slabs: "0",
};

export const raftFoundationDefaultValues = {
  type: "raft_foundation" as const,
  area: "0",
  thickness: "0",
  fck: 25,
  steel: {
    mesh: "0",
    ca50: "0",
    ca60: "0",
    cp190: "0",
  },
};

export const pilesFoundationDefaultValues = {
  type: "piles_foundation" as const,
  fck: 30,
  piles: {
    volume: "0",
    steel: {
      ca50: "0",
      ca60: "0",
    },
  },
  cap_beams: {
    volume: "0",
    steel: {
      ca50: "0",
      ca60: "0",
    },
  },
};

export const raftPilesFoundationDefaultValues = {
  type: "raft_piles_foundation" as const,
  raft: {
    area: "0",
    thickness: "0",
    fck: 25,
    steel: {
      mesh: "0",
      ca50: "0",
      ca60: "0",
      cp190: "0",
    },
  },
  piles: {
    volume: "0",
    steel: {
      ca50: "0",
      ca60: "0",
    },
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
