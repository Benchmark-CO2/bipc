import {
  IBlockInfo,
  IGroutInfo,
  IMasonryElement,
  IMortarItem,
  TAnyPosition,
  TBeamColumnDataV2,
  TBeamColumnPosition,
  TConcreteWallDataV2,
  TConcreteWallPosition,
  TFck,
  TModuleDataV2,
  TModulesTypes,
  TPilesFoundationDataV2,
  TPilesFoundationPosition,
  TRaftFoundationDataV2,
  TRaftFoundationPosition,
  TRaftPilesFoundationDataV2,
  TRaftPilesFoundationPosition,
  TSlabType,
  TStructuralMasonryDataV2,
  TStructuralMasonryPosition,
  IV2ConcreteVolumeItem,
  IV2FormAreaItem,
  IV2SteelMaterialItem,
} from "@/types/modules";
import { parseNumber } from "@/utils/numbers";

type WithPosition = { position: string };

export const groupByPosition = <T extends WithPosition>(
  flatArr: T[] | undefined,
  positions: readonly string[],
): Record<string, T[]> => {
  const result: Record<string, T[]> = {};
  for (const p of positions) {
    result[p] = [];
  }
  if (!flatArr || flatArr.length === 0) return result;
  for (const item of flatArr) {
    if (item.position in result) {
      result[item.position].push(item);
    }
  }
  return result;
};

export const flatBackFromGrouped = <T extends WithPosition>(
  grouped: Record<string, T[]>,
): T[] => {
  const result: T[] = [];
  for (const items of Object.values(grouped)) {
    for (const item of items) {
      result.push(item);
    }
  }
  return result;
};

const isConcreteItemZero = (
  item: IV2ConcreteVolumeItem<TAnyPosition>,
): boolean => {
  const v =
    typeof item.volume === "string" ? parseNumber(item.volume) : item.volume;
  return !v || v <= 0;
};

const isSteelItemZero = (item: IV2SteelMaterialItem<TAnyPosition>): boolean => {
  const m = typeof item.mass === "string" ? parseNumber(item.mass) : item.mass;
  return !m || m <= 0;
};

const isFormItemZero = (item: IV2FormAreaItem<TAnyPosition>): boolean => {
  const a = typeof item.area === "string" ? parseNumber(item.area) : item.area;
  return !a || a <= 0;
};

const cleanBlockInfo = (block: IBlockInfo): IBlockInfo | null => {
  const q =
    typeof block.quantity === "string"
      ? parseNumber(block.quantity)
      : block.quantity;
  if (!q || q <= 0) return null;
  return block;
};

const cleanMortarItem = (mortar: IMortarItem): IMortarItem | null => {
  const v =
    typeof mortar.volume === "string"
      ? parseNumber(mortar.volume)
      : mortar.volume;
  if (!v || v <= 0) return null;
  return mortar;
};

const cleanGroutInfo = (grout: IGroutInfo): IGroutInfo | null => {
  const cleanVolumes = grout.volumes.filter((v) => {
    const vol = typeof v.volume === "string" ? parseNumber(v.volume) : v.volume;
    return vol && vol > 0;
  });
  if (cleanVolumes.length === 0) return null;
  return { ...grout, volumes: cleanVolumes };
};

const cleanMasonry = (masonry: IMasonryElement): IMasonryElement | null => {
  const cleanBlocks = masonry.blocks
    .map(cleanBlockInfo)
    .filter((b): b is IBlockInfo => b !== null);
  const cleanMortar = masonry.mortar
    .map(cleanMortarItem)
    .filter((m): m is IMortarItem => m !== null);
  const cleanGrout = masonry.grout
    .map(cleanGroutInfo)
    .filter((g): g is IGroutInfo => g !== null);
  if (
    cleanBlocks.length === 0 ||
    cleanMortar.length === 0 ||
    cleanGrout.length === 0
  ) {
    return null;
  }
  return { blocks: cleanBlocks, mortar: cleanMortar, grout: cleanGrout };
};

export const cleanZeroItemsBeforeSubmit = <T extends TModuleDataV2>(
  data: T,
): T => {
  const cleaned: Record<string, unknown> = { ...data };

  if ("concrete" in cleaned && Array.isArray(cleaned.concrete)) {
    cleaned.concrete = (
      cleaned.concrete as IV2ConcreteVolumeItem<TAnyPosition>[]
    ).filter((item) => !isConcreteItemZero(item));
  }

  if ("steel" in cleaned && Array.isArray(cleaned.steel)) {
    cleaned.steel = (
      cleaned.steel as IV2SteelMaterialItem<TAnyPosition>[]
    ).filter((item) => !isSteelItemZero(item));
  }

  if ("form" in cleaned && Array.isArray(cleaned.form)) {
    cleaned.form = (cleaned.form as IV2FormAreaItem<TAnyPosition>[]).filter(
      (item) => !isFormItemZero(item),
    );
  }

  if ("masonry" in cleaned && cleaned.masonry) {
    const masonryClean = cleanMasonry(cleaned.masonry as IMasonryElement);
    if (masonryClean) {
      cleaned.masonry = masonryClean;
    }
  }

  if ("raft_area" in cleaned) {
    delete cleaned.raft_area;
  }
  if ("raft_thickness" in cleaned) {
    delete cleaned.raft_thickness;
  }
  if ("floor_indexes" in cleaned) {
    delete cleaned.floor_indexes;
  }

  return cleaned as T;
};

export type GroupedConcreteByPosition<TPosition extends string> = Record<
  TPosition,
  (IV2ConcreteVolumeItem<TPosition> & { customFck?: boolean })[]
>;

export type GroupedSteelByPosition<TPosition extends string> = Record<
  TPosition,
  IV2SteelMaterialItem<TPosition>[]
>;

export type GroupedFormByPosition<TPosition extends string> = Record<
  TPosition,
  IV2FormAreaItem<TPosition>[]
>;

const toNumberValue = <T extends string | number>(v: T | undefined): number => {
  if (v === undefined || v === null) return 0;
  return typeof v === "string" ? parseNumber(v) : v;
};

const toStringValue = (n: number | string | undefined): string => {
  if (n === undefined || n === null) return "0";
  if (typeof n === "string") return n;
  return String(n);
};

export const floorToInternational = (n: number): string => {
  return n.toInternational("pt-BR", 2);
};

export interface GroupedBeamColumnView {
  concrete: GroupedConcreteByPosition<TBeamColumnPosition>;
  steel: GroupedSteelByPosition<TBeamColumnPosition>;
  form: GroupedFormByPosition<TBeamColumnPosition>;
}

export const viewFromBeamColumnV2 = (
  data: Partial<TBeamColumnDataV2>,
): GroupedBeamColumnView => {
  const positions: TBeamColumnPosition[] = ["column", "beam", "slab", "stair"];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  const formInput = (data.form ?? []).map((f) => ({
    ...f,
    area: toStringValue(f.area) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TBeamColumnPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TBeamColumnPosition>,
    form: groupByPosition(
      formInput,
      positions,
    ) as GroupedFormByPosition<TBeamColumnPosition>,
  };
};

export interface GroupedConcreteWallView {
  concrete: GroupedConcreteByPosition<TConcreteWallPosition>;
  steel: GroupedSteelByPosition<TConcreteWallPosition>;
  form: GroupedFormByPosition<TConcreteWallPosition>;
}

export const viewFromConcreteWallV2 = (
  data: Partial<TConcreteWallDataV2>,
): GroupedConcreteWallView => {
  const positions: TConcreteWallPosition[] = ["wall", "slab", "stair"];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  const formInput = (data.form ?? []).map((f) => ({
    ...f,
    area: toStringValue(f.area) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TConcreteWallPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TConcreteWallPosition>,
    form: groupByPosition(
      formInput,
      positions,
    ) as GroupedFormByPosition<TConcreteWallPosition>,
  };
};

export interface GroupedStructuralMasonryView {
  concrete: GroupedConcreteByPosition<TStructuralMasonryPosition>;
  steel: GroupedSteelByPosition<TStructuralMasonryPosition>;
  form: GroupedFormByPosition<TStructuralMasonryPosition>;
  masonry: IMasonryElement;
}

const mapMasonryToStrings = (
  m: IMasonryElement | undefined,
): IMasonryElement => {
  if (!m) {
    return {
      blocks: [],
      grout: [],
      mortar: [],
    };
  }
  return {
    blocks: (m.blocks ?? []).map((b) => ({
      ...b,
      quantity:
        typeof b.quantity === "number" ? Math.round(b.quantity) : b.quantity,
    })),
    mortar: (m.mortar ?? []).map((mo) => ({
      ...mo,
      volume: toStringValue(mo.volume) as unknown as number,
    })),
    grout: (m.grout ?? []).map((g) => ({
      ...g,
      volumes: (g.volumes ?? []).map((v) => ({
        ...v,
        volume: toStringValue(v.volume) as unknown as number,
      })),
      steel: (g.steel ?? []).map((s) => ({
        ...s,
        mass: toStringValue(s.mass) as unknown as number,
      })),
    })),
  };
};

export const viewFromStructuralMasonryV2 = (
  data: Partial<TStructuralMasonryDataV2>,
): GroupedStructuralMasonryView => {
  const positions: TStructuralMasonryPosition[] = [
    "column",
    "beam",
    "slab",
    "stair",
  ];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  const formInput = (data.form ?? []).map((f) => ({
    ...f,
    area: toStringValue(f.area) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TStructuralMasonryPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TStructuralMasonryPosition>,
    form: groupByPosition(
      formInput,
      positions,
    ) as GroupedFormByPosition<TStructuralMasonryPosition>,
    masonry: mapMasonryToStrings(data.masonry),
  };
};

export interface GroupedRaftFoundationView {
  concrete: GroupedConcreteByPosition<TRaftFoundationPosition>;
  steel: GroupedSteelByPosition<TRaftFoundationPosition>;
  raft_area: string;
  raft_thickness: string;
}

export const viewFromRaftFoundationV2 = (
  data: Partial<TRaftFoundationDataV2>,
): GroupedRaftFoundationView => {
  const positions: TRaftFoundationPosition[] = ["raft"];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TRaftFoundationPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TRaftFoundationPosition>,
    raft_area: toStringValue(data.raft_area),
    raft_thickness: toStringValue(data.raft_thickness),
  };
};

export interface GroupedPilesFoundationView {
  concrete: GroupedConcreteByPosition<TPilesFoundationPosition>;
  steel: GroupedSteelByPosition<TPilesFoundationPosition>;
}

export const viewFromPilesFoundationV2 = (
  data: Partial<TPilesFoundationDataV2>,
): GroupedPilesFoundationView => {
  const positions: TPilesFoundationPosition[] = [
    "pile",
    "block",
    "grade_beam",
    "tie_beam",
  ];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TPilesFoundationPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TPilesFoundationPosition>,
  };
};

export interface GroupedRaftPilesFoundationView {
  concrete: GroupedConcreteByPosition<TRaftPilesFoundationPosition>;
  steel: GroupedSteelByPosition<TRaftPilesFoundationPosition>;
  raft_area: string;
  raft_thickness: string;
}

export const viewFromRaftPilesFoundationV2 = (
  data: Partial<TRaftPilesFoundationDataV2>,
): GroupedRaftPilesFoundationView => {
  const positions: TRaftPilesFoundationPosition[] = ["raft", "pile"];
  const concreteInput = (data.concrete ?? []).map((c) => ({
    ...c,
    volume: toStringValue(c.volume) as unknown as number,
  }));
  const steelInput = (data.steel ?? []).map((s) => ({
    ...s,
    mass: toStringValue(s.mass) as unknown as number,
  }));
  return {
    concrete: groupByPosition(
      concreteInput,
      positions,
    ) as GroupedConcreteByPosition<TRaftPilesFoundationPosition>,
    steel: groupByPosition(
      steelInput,
      positions,
    ) as GroupedSteelByPosition<TRaftPilesFoundationPosition>,
    raft_area: toStringValue(data.raft_area),
    raft_thickness: toStringValue(data.raft_thickness),
  };
};

export interface IViewForType {
  beam_column: GroupedBeamColumnView;
  concrete_wall: GroupedConcreteWallView;
  structural_masonry: GroupedStructuralMasonryView;
  raft_foundation: GroupedRaftFoundationView;
  piles_foundation: GroupedPilesFoundationView;
  raft_piles_foundation: GroupedRaftPilesFoundationView;
}

export const viewFromModuleV2 = (
  type: TModulesTypes,
  data: Partial<TModuleDataV2>,
): IViewForType[TModulesTypes] => {
  switch (type) {
    case "beam_column":
      return viewFromBeamColumnV2(data as Partial<TBeamColumnDataV2>);
    case "concrete_wall":
      return viewFromConcreteWallV2(data as Partial<TConcreteWallDataV2>);
    case "structural_masonry":
      return viewFromStructuralMasonryV2(
        data as Partial<TStructuralMasonryDataV2>,
      );
    case "raft_foundation":
      return viewFromRaftFoundationV2(data as Partial<TRaftFoundationDataV2>);
    case "piles_foundation":
      return viewFromPilesFoundationV2(data as Partial<TPilesFoundationDataV2>);
    case "raft_piles_foundation":
      return viewFromRaftPilesFoundationV2(
        data as Partial<TRaftPilesFoundationDataV2>,
      );
    default:
      return viewFromBeamColumnV2({});
  }
};

interface ConcreteSteelGroup {
  volumes?: Array<{
    fck: number;
    volume: string | number;
    customFck?: boolean;
  }>;
  steel?: Array<{
    material: string;
    other_name?: string;
    resistance: string;
    other_resistance?: number;
    mass: string | number;
  }>;
  total_volume?: number;
}

interface BeamColumnGroupedForm {
  type: "beam_column";
  concrete_columns: ConcreteSteelGroup;
  concrete_beams: ConcreteSteelGroup;
  concrete_slabs: ConcreteSteelGroup;
  form_columns: string | number;
  form_beams: string | number;
  form_slabs: string | number;
  column_number: string | number;
  avg_beam_span: string | number;
  avg_slab_span: string | number;
  slab_type?: string;
  floor_ids?: string[];
  unit_id?: string;
}

interface ConcreteWallGroupedForm {
  type: "concrete_wall";
  concrete_walls: ConcreteSteelGroup;
  concrete_slabs: ConcreteSteelGroup;
  wall_thickness: string | number;
  slab_thickness: string | number;
  wall_area: string | number;
  slab_area: string | number;
  wall_form_area: string | number;
  slab_form_area: string | number;
  slab_type?: string;
  floor_ids?: string[];
  unit_id?: string;
}

interface StructuralMasonryGroupedForm {
  type: "structural_masonry";
  masonry_blocks: IMasonryElement["blocks"];
  grout: IMasonryElement["grout"];
  mortar: IMasonryElement["mortar"];
  concrete_slabs: ConcreteSteelGroup;
  concrete_columns?: ConcreteSteelGroup;
  concrete_beams?: ConcreteSteelGroup;
  form_slabs: string | number;
  form_columns?: string | number;
  form_beams?: string | number;
  slab_type?: string;
  floor_ids?: string[];
  unit_id?: string;
}

interface RaftFoundationGroupedForm {
  type: "raft_foundation";
  area: string | number;
  thickness: string | number;
  fck: number;
  steel: Array<{
    material: string;
    other_name?: string;
    resistance: string;
    other_resistance?: number;
    mass: string | number;
  }>;
  unit_id?: string;
}

interface PilesFoundationGroupedForm {
  type: "piles_foundation";
  fck: number;
  piles: ConcreteSteelGroup & { volume?: string | number };
  pile_caps?: ConcreteSteelGroup & { volume?: string | number };
  tie_beams?: ConcreteSteelGroup & { volume?: string | number };
  grade_beams?: ConcreteSteelGroup & { volume?: string | number };
  unit_id?: string;
}

interface RaftPilesFoundationGroupedForm {
  type: "raft_piles_foundation";
  fck: number;
  raft: {
    area: string | number;
    thickness: string | number;
    steel: Array<{
      material: string;
      other_name?: string;
      resistance: string;
      other_resistance?: number;
      mass: string | number;
    }>;
  };
  piles: ConcreteSteelGroup & { volume?: string | number };
  unit_id?: string;
}

export type TModuleGroupedForm =
  | BeamColumnGroupedForm
  | ConcreteWallGroupedForm
  | StructuralMasonryGroupedForm
  | RaftFoundationGroupedForm
  | PilesFoundationGroupedForm
  | RaftPilesFoundationGroupedForm;

export const flatV2ToGroupedForm = (
  type: TModulesTypes,
  flat: Partial<TModuleDataV2> & {
    type?: TModulesTypes;
    floor_ids?: string[];
    unit_id?: string;
  },
): TModuleGroupedForm => {
  if (type === "beam_column") {
    const view = viewFromBeamColumnV2(flat as Partial<TBeamColumnDataV2>);
    const bcFlat = flat as Partial<TBeamColumnDataV2>;
    return {
      type: "beam_column",
      concrete_columns: {
        volumes: view.concrete.column.map(({ position, ...rest }) => rest),
        steel: view.steel.column.map(({ position, ...rest }) => rest),
      },
      concrete_beams: {
        volumes: view.concrete.beam.map(({ position, ...rest }) => rest),
        steel: view.steel.beam.map(({ position, ...rest }) => rest),
      },
      concrete_slabs: {
        volumes: view.concrete.slab.map(({ position, ...rest }) => rest),
        steel: view.steel.slab.map(({ position, ...rest }) => rest),
      },
      form_columns: view.form.column[0]?.area ?? "0",
      form_beams: view.form.beam[0]?.area ?? "0",
      form_slabs: view.form.slab[0]?.area ?? "0",
      column_number: bcFlat.column_number ?? "0",
      avg_beam_span: bcFlat.avg_beam_span ?? "0",
      avg_slab_span: bcFlat.avg_slab_span ?? "0",
      slab_type: bcFlat.slab_type,
      floor_ids: flat.floor_ids,
      unit_id: flat.unit_id,
    };
  }

  if (type === "concrete_wall") {
    const view = viewFromConcreteWallV2(flat as Partial<TConcreteWallDataV2>);
    const cwFlat = flat as Partial<TConcreteWallDataV2>;
    return {
      type: "concrete_wall",
      concrete_walls: {
        volumes: view.concrete.wall.map(({ position, ...rest }) => rest),
        steel: view.steel.wall.map(({ position, ...rest }) => rest),
      },
      concrete_slabs: {
        volumes: view.concrete.slab.map(({ position, ...rest }) => rest),
        steel: view.steel.slab.map(({ position, ...rest }) => rest),
      },
      wall_thickness: cwFlat.wall_thickness ?? "0",
      slab_thickness: cwFlat.slab_thickness ?? "0",
      wall_area: cwFlat.wall_area ?? "0",
      slab_area: cwFlat.slab_area ?? "0",
      wall_form_area: view.form.wall[0]?.area ?? "0",
      slab_form_area: view.form.slab[0]?.area ?? "0",
      slab_type: cwFlat.slab_type,
      floor_ids: flat.floor_ids,
      unit_id: flat.unit_id,
    };
  }

  if (type === "structural_masonry") {
    const view = viewFromStructuralMasonryV2(
      flat as Partial<TStructuralMasonryDataV2>,
    );
    const smFlat = flat as Partial<TStructuralMasonryDataV2>;
    return {
      type: "structural_masonry",
      masonry_blocks: view.masonry.blocks,
      grout: view.masonry.grout,
      mortar: view.masonry.mortar,
      concrete_slabs: {
        volumes: view.concrete.slab.map(({ position, ...rest }) => rest),
        steel: view.steel.slab.map(({ position, ...rest }) => rest),
      },
      concrete_columns: {
        volumes: view.concrete.column.map(({ position, ...rest }) => rest),
        steel: view.steel.column.map(({ position, ...rest }) => rest),
      },
      concrete_beams: {
        volumes: view.concrete.beam.map(({ position, ...rest }) => rest),
        steel: view.steel.beam.map(({ position, ...rest }) => rest),
      },
      form_slabs: view.form.slab[0]?.area ?? "0",
      form_columns: view.form.column[0]?.area ?? "0",
      form_beams: view.form.beam[0]?.area ?? "0",
      slab_type: smFlat.slab_type,
      floor_ids: flat.floor_ids,
      unit_id: flat.unit_id,
    };
  }

  if (type === "raft_foundation") {
    const view = viewFromRaftFoundationV2(
      flat as Partial<TRaftFoundationDataV2>,
    );
    return {
      type: "raft_foundation",
      area: view.raft_area,
      thickness: view.raft_thickness,
      fck: view.concrete.raft[0]?.fck ?? 25,
      steel: view.steel.raft.map(({ position, ...rest }) => rest),
      unit_id: flat.unit_id,
    };
  }

  if (type === "piles_foundation") {
    const view = viewFromPilesFoundationV2(
      flat as Partial<TPilesFoundationDataV2>,
    );
    return {
      type: "piles_foundation",
      fck: view.concrete.pile[0]?.fck ?? 30,
      piles: {
        volume: view.concrete.pile[0]?.volume ?? "0",
        steel: view.steel.pile.map(({ position, ...rest }) => rest),
      },
      pile_caps: {
        volume: view.concrete.block[0]?.volume ?? "0",
        steel: view.steel.block.map(({ position, ...rest }) => rest),
      },
      tie_beams: {
        volume: view.concrete.tie_beam[0]?.volume ?? "0",
        steel: view.steel.tie_beam.map(({ position, ...rest }) => rest),
      },
      grade_beams: {
        volume: view.concrete.grade_beam[0]?.volume ?? "0",
        steel: view.steel.grade_beam.map(({ position, ...rest }) => rest),
      },
      unit_id: flat.unit_id,
    };
  }

  if (type === "raft_piles_foundation") {
    const view = viewFromRaftPilesFoundationV2(
      flat as Partial<TRaftPilesFoundationDataV2>,
    );
    return {
      type: "raft_piles_foundation",
      fck: view.concrete.raft[0]?.fck ?? 25,
      raft: {
        area: view.raft_area,
        thickness: view.raft_thickness,
        steel: view.steel.raft.map(({ position, ...rest }) => rest),
      },
      piles: {
        volume: view.concrete.pile[0]?.volume ?? "0",
        steel: view.steel.pile.map(({ position, ...rest }) => rest),
      },
      unit_id: flat.unit_id,
    };
  }

  return flatV2ToGroupedForm("beam_column", flat);
};

const addSteelPositions = (
  steel: ConcreteSteelGroup["steel"] = [],
  position: string,
) => (steel || []).map((s) => ({ ...s, position }));

const addConcretePositions = (
  volumes: ConcreteSteelGroup["volumes"] = [],
  position: string,
) =>
  (volumes || []).map((v) => {
    const { customFck, ...rest } = v;
    return { ...rest, position };
  });

export const groupedFormToFlatV2 = (
  type: TModulesTypes,
  grouped: TModuleGroupedForm,
  selectedFloors: string[],
  unitId: string,
): TModuleDataV2 & {
  type: TModulesTypes;
  floor_ids?: string[];
  unit_id?: string;
} => {
  if (type === "beam_column") {
    const g = grouped as BeamColumnGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TBeamColumnPosition>[] = [];
    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_columns.volumes,
          "column",
        ) as IV2ConcreteVolumeItem<TBeamColumnPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_beams.volumes,
          "beam",
        ) as IV2ConcreteVolumeItem<TBeamColumnPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_slabs.volumes,
          "slab",
        ) as IV2ConcreteVolumeItem<TBeamColumnPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );

    const steel: IV2SteelMaterialItem<TBeamColumnPosition>[] = [];
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_columns.steel,
          "column",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_beams.steel,
          "beam",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_slabs.steel,
          "slab",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    const form: IV2FormAreaItem<TBeamColumnPosition>[] = [];
    const fc = toNumberValue(g.form_columns);
    if (fc > 0) form.push({ area: fc, position: "column" });
    const fb = toNumberValue(g.form_beams);
    if (fb > 0) form.push({ area: fb, position: "beam" });
    const fs = toNumberValue(g.form_slabs);
    if (fs > 0) form.push({ area: fs, position: "slab" });

    return {
      type: "beam_column",
      concrete,
      steel,
      form: form.length > 0 ? form : undefined,
      column_number: toNumberValue(g.column_number),
      avg_beam_span: toNumberValue(g.avg_beam_span),
      avg_slab_span: toNumberValue(g.avg_slab_span),
      slab_type: g.slab_type as TSlabType | undefined,
      floor_ids: selectedFloors,
    };
  }

  if (type === "concrete_wall") {
    const g = grouped as ConcreteWallGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TConcreteWallPosition>[] = [];
    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_walls.volumes,
          "wall",
        ) as IV2ConcreteVolumeItem<TConcreteWallPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_slabs.volumes,
          "slab",
        ) as IV2ConcreteVolumeItem<TConcreteWallPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );

    const steel: IV2SteelMaterialItem<TConcreteWallPosition>[] = [];
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_walls.steel,
          "wall",
        ) as IV2SteelMaterialItem<TConcreteWallPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_slabs.steel,
          "slab",
        ) as IV2SteelMaterialItem<TConcreteWallPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    const form: IV2FormAreaItem<TConcreteWallPosition>[] = [];
    const wf = toNumberValue(g.wall_form_area);
    if (wf > 0) form.push({ area: wf, position: "wall" });
    const sf = toNumberValue(g.slab_form_area);
    if (sf > 0) form.push({ area: sf, position: "slab" });

    return {
      type: "concrete_wall",
      concrete,
      steel,
      form: form.length > 0 ? form : undefined,
      wall_thickness: toNumberValue(g.wall_thickness),
      slab_thickness: toNumberValue(g.slab_thickness),
      wall_area: toNumberValue(g.wall_area),
      slab_area: toNumberValue(g.slab_area),
      slab_type: g.slab_type as TSlabType | undefined,
      floor_ids: selectedFloors,
    };
  }

  if (type === "structural_masonry") {
    const g = grouped as StructuralMasonryGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TStructuralMasonryPosition>[] = [];
    const steel: IV2SteelMaterialItem<TStructuralMasonryPosition>[] = [];
    const form: IV2FormAreaItem<TStructuralMasonryPosition>[] = [];

    concrete.push(
      ...(
        addConcretePositions(
          g.concrete_slabs.volumes,
          "slab",
        ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    steel.push(
      ...(
        addSteelPositions(
          g.concrete_slabs.steel,
          "slab",
        ) as IV2SteelMaterialItem<TStructuralMasonryPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    const fss = toNumberValue(g.form_slabs);
    if (fss > 0) form.push({ area: fss, position: "slab" });

    if (g.concrete_columns?.volumes?.length) {
      concrete.push(
        ...(
          addConcretePositions(
            g.concrete_columns.volumes,
            "column",
          ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
        ).map((c) => ({
          ...c,
          fck: c.fck as TFck,
          volume: toNumberValue(c.volume as string | number),
        })),
      );
      steel.push(
        ...(
          addSteelPositions(
            g.concrete_columns.steel,
            "column",
          ) as IV2SteelMaterialItem<TStructuralMasonryPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }
    const fsc = toNumberValue(g.form_columns);
    if (fsc > 0) {
      form.push({ area: fsc, position: "column" });
    }

    if (g.concrete_beams?.volumes?.length) {
      concrete.push(
        ...(
          addConcretePositions(
            g.concrete_beams.volumes,
            "beam",
          ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
        ).map((c) => ({
          ...c,
          fck: c.fck as TFck,
          volume: toNumberValue(c.volume as string | number),
        })),
      );
      steel.push(
        ...(
          addSteelPositions(
            g.concrete_beams.steel,
            "beam",
          ) as IV2SteelMaterialItem<TStructuralMasonryPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }
    const fsb = toNumberValue(g.form_beams);
    if (fsb > 0) {
      form.push({ area: fsb, position: "beam" });
    }

    return {
      type: "structural_masonry",
      masonry: {
        blocks: g.masonry_blocks,
        grout: g.grout,
        mortar: g.mortar,
      },
      concrete: concrete.length > 0 ? concrete : undefined,
      steel: steel.length > 0 ? steel : undefined,
      form: form.length > 0 ? form : undefined,
      slab_type: g.slab_type as TSlabType | undefined,
      floor_ids: selectedFloors,
    };
  }

  if (type === "raft_foundation") {
    const g = grouped as RaftFoundationGroupedForm;
    const areaNum = toNumberValue(g.area);
    const thicknessNum = toNumberValue(g.thickness);
    const volumeCalculated = areaNum * thicknessNum;
    const concrete: IV2ConcreteVolumeItem<TRaftFoundationPosition>[] =
      areaNum > 0 && thicknessNum > 0 && volumeCalculated > 0
        ? [
            {
              fck: g.fck as TFck,
              volume: volumeCalculated,
              position: "raft",
            },
          ]
        : [];

    const steel: IV2SteelMaterialItem<TRaftFoundationPosition>[] = (
      addSteelPositions(
        g.steel,
        "raft",
      ) as IV2SteelMaterialItem<TRaftFoundationPosition>[]
    ).map((s) => ({ ...s, mass: toNumberValue(s.mass as string | number) }));

    const flatResult: TRaftFoundationDataV2 & {
      type: "raft_foundation";
      unit_id?: string;
      raft_area?: number;
      raft_thickness?: number;
    } = {
      type: "raft_foundation",
      concrete,
      steel,
      unit_id: unitId,
    };
    flatResult.raft_area = areaNum;
    flatResult.raft_thickness = thicknessNum;
    return flatResult;
  }

  if (type === "piles_foundation") {
    const g = grouped as PilesFoundationGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TPilesFoundationPosition>[] = [];
    const steel: IV2SteelMaterialItem<TPilesFoundationPosition>[] = [];

    concrete.push({
      fck: g.fck as TFck,
      volume: toNumberValue(g.piles.volume),
      position: "pile",
    });
    steel.push(
      ...(
        addSteelPositions(
          g.piles.steel,
          "pile",
        ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    if (
      g.pile_caps &&
      g.pile_caps.volume !== undefined &&
      g.pile_caps.volume !== "0" &&
      g.pile_caps.volume !== 0 &&
      toNumberValue(g.pile_caps.volume) > 0
    ) {
      concrete.push({
        fck: g.fck as TFck,
        volume: toNumberValue(g.pile_caps.volume),
        position: "block",
      });
      steel.push(
        ...(
          addSteelPositions(
            g.pile_caps.steel,
            "block",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    if (
      g.grade_beams &&
      g.grade_beams.volume !== undefined &&
      g.grade_beams.volume !== "0" &&
      g.grade_beams.volume !== 0 &&
      toNumberValue(g.grade_beams.volume) > 0
    ) {
      concrete.push({
        fck: g.fck as TFck,
        volume: toNumberValue(g.grade_beams.volume),
        position: "grade_beam",
      });
      steel.push(
        ...(
          addSteelPositions(
            g.grade_beams.steel,
            "grade_beam",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    if (
      g.tie_beams &&
      g.tie_beams.volume !== undefined &&
      g.tie_beams.volume !== "0" &&
      g.tie_beams.volume !== 0 &&
      toNumberValue(g.tie_beams.volume) > 0
    ) {
      concrete.push({
        fck: g.fck as TFck,
        volume: toNumberValue(g.tie_beams.volume),
        position: "tie_beam",
      });
      steel.push(
        ...(
          addSteelPositions(
            g.tie_beams.steel,
            "tie_beam",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    return {
      type: "piles_foundation",
      concrete,
      steel,
      unit_id: unitId,
    };
  }

  if (type === "raft_piles_foundation") {
    const g = grouped as RaftPilesFoundationGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TRaftPilesFoundationPosition>[] = [];
    const steel: IV2SteelMaterialItem<TRaftPilesFoundationPosition>[] = [];

    const raftAreaNum = toNumberValue(g.raft.area);
    const raftThickNum = toNumberValue(g.raft.thickness);
    const raftVol = raftAreaNum * raftThickNum;
    if (raftAreaNum > 0 && raftThickNum > 0 && raftVol > 0) {
      concrete.push({
        fck: g.fck as TFck,
        volume: raftVol,
        position: "raft",
      });
    }
    steel.push(
      ...(
        addSteelPositions(
          g.raft.steel,
          "raft",
        ) as IV2SteelMaterialItem<TRaftPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    concrete.push({
      fck: g.fck as TFck,
      volume: toNumberValue(g.piles.volume),
      position: "pile",
    });
    steel.push(
      ...(
        addSteelPositions(
          g.piles.steel,
          "pile",
        ) as IV2SteelMaterialItem<TRaftPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    const flatResult: TRaftPilesFoundationDataV2 & {
      type: "raft_piles_foundation";
      unit_id?: string;
      raft_area?: number;
      raft_thickness?: number;
    } = {
      type: "raft_piles_foundation",
      concrete,
      steel,
      unit_id: unitId,
    };
    flatResult.raft_area = raftAreaNum;
    flatResult.raft_thickness = raftThickNum;
    return flatResult;
  }

  return groupedFormToFlatV2("beam_column", grouped, selectedFloors, unitId);
};
