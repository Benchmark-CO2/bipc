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
import { getDefaultValuesByType } from "./module-default-values";

type WithPosition = { position?: string };

export const UNSPECIFIED_POSITION = "unspecified" as const;
export type TUnspecifiedPosition = typeof UNSPECIFIED_POSITION;

export const groupByPosition = <T extends WithPosition>(
  flatArr: T[] | undefined,
  positions: readonly string[],
  opts: { includeUnspecified?: boolean } = {},
): Record<string, T[]> => {
  const result: Record<string, T[]> = {};
  for (const p of positions) {
    result[p] = [];
  }
  if (opts.includeUnspecified) {
    result[UNSPECIFIED_POSITION] = [];
  }
  if (!flatArr || flatArr.length === 0) return result;
  for (const item of flatArr) {
    if (item.position && item.position in result) {
      result[item.position].push(item);
    } else if (
      opts.includeUnspecified &&
      (!item.position || !(item.position in result))
    ) {
      result[UNSPECIFIED_POSITION].push({
        ...item,
        position: UNSPECIFIED_POSITION,
      } as T);
    }
  }
  return result;
};

export const flatBackFromGrouped = <T extends WithPosition>(
  grouped: Record<string, T[]>,
): T[] => {
  const result: T[] = [];
  for (const [key, items] of Object.entries(grouped)) {
    for (const item of items) {
      if (key === UNSPECIFIED_POSITION) {
        const { position: _pos, ...rest } = item as Record<string, unknown>;
        result.push(rest as T);
      } else {
        result.push(item);
      }
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
> & {
  [UNSPECIFIED_POSITION]?: (IV2ConcreteVolumeItem<
    TUnspecifiedPosition | TPosition
  > & { customFck?: boolean })[];
};

export type GroupedSteelByPosition<TPosition extends string> = Record<
  TPosition,
  IV2SteelMaterialItem<TPosition>[]
> & {
  [UNSPECIFIED_POSITION]?: IV2SteelMaterialItem<
    TUnspecifiedPosition | TPosition
  >[];
};

export type GroupedFormByPosition<TPosition extends string> = Record<
  TPosition,
  IV2FormAreaItem<TPosition>[]
> & {
  [UNSPECIFIED_POSITION]?: IV2FormAreaItem<TUnspecifiedPosition | TPosition>[];
};

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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TBeamColumnPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TBeamColumnPosition>,
    form: groupByPosition(formInput, positions, {
      includeUnspecified: true,
    }) as GroupedFormByPosition<TBeamColumnPosition>,
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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TConcreteWallPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TConcreteWallPosition>,
    form: groupByPosition(formInput, positions, {
      includeUnspecified: true,
    }) as GroupedFormByPosition<TConcreteWallPosition>,
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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TStructuralMasonryPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TStructuralMasonryPosition>,
    form: groupByPosition(formInput, positions, {
      includeUnspecified: true,
    }) as GroupedFormByPosition<TStructuralMasonryPosition>,
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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TRaftFoundationPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TRaftFoundationPosition>,
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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TPilesFoundationPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TPilesFoundationPosition>,
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
    concrete: groupByPosition(concreteInput, positions, {
      includeUnspecified: true,
    }) as GroupedConcreteByPosition<TRaftPilesFoundationPosition>,
    steel: groupByPosition(steelInput, positions, {
      includeUnspecified: true,
    }) as GroupedSteelByPosition<TRaftPilesFoundationPosition>,
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
  unspecified?: ConcreteSteelGroup;
  form_columns: string | number;
  form_beams: string | number;
  form_slabs: string | number;
  form_unspecified?: string | number;
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
  unspecified?: ConcreteSteelGroup;
  wall_thickness: string | number;
  slab_thickness: string | number;
  wall_area: string | number;
  slab_area: string | number;
  wall_form_area: string | number;
  slab_form_area: string | number;
  form_unspecified?: string | number;
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
  unspecified?: ConcreteSteelGroup;
  form_slabs: string | number;
  form_columns?: string | number;
  form_beams?: string | number;
  form_unspecified?: string | number;
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
  unspecified?: ConcreteSteelGroup;
  unit_id?: string;
}

interface PilesFoundationGroupedForm {
  type: "piles_foundation";
  fck: number;
  piles: ConcreteSteelGroup & { volume?: string | number };
  pile_caps?: ConcreteSteelGroup & { volume?: string | number };
  tie_beams?: ConcreteSteelGroup & { volume?: string | number };
  grade_beams?: ConcreteSteelGroup & { volume?: string | number };
  unspecified?: ConcreteSteelGroup & { volume?: string | number };
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
  unspecified?: ConcreteSteelGroup & { volume?: string | number };
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
      },
      form_columns: view.form.column[0]?.area ?? "0",
      form_beams: view.form.beam[0]?.area ?? "0",
      form_slabs: view.form.slab[0]?.area ?? "0",
      form_unspecified: view.form.unspecified?.[0]?.area ?? "0",
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
      },
      wall_thickness: cwFlat.wall_thickness ?? "0",
      slab_thickness: cwFlat.slab_thickness ?? "0",
      wall_area: cwFlat.wall_area ?? "0",
      slab_area: cwFlat.slab_area ?? "0",
      wall_form_area: view.form.wall[0]?.area ?? "0",
      slab_form_area: view.form.slab[0]?.area ?? "0",
      form_unspecified: view.form.unspecified?.[0]?.area ?? "0",
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
      },
      form_slabs: view.form.slab[0]?.area ?? "0",
      form_columns: view.form.column[0]?.area ?? "0",
      form_beams: view.form.beam[0]?.area ?? "0",
      form_unspecified: view.form.unspecified?.[0]?.area ?? "0",
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
      },
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
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
      unspecified: {
        volumes: (view.concrete.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
        steel: (view.steel.unspecified ?? []).map(
          ({ position, ...rest }) => rest,
        ),
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
  const safeDefaults = getDefaultValuesByType(type) as Record<string, any>;
  const groupedAny = (grouped ?? {}) as Record<string, any>;
  const merged: Record<string, any> = { ...safeDefaults, ...groupedAny };

  const vol = (obj: any) => (Array.isArray(obj?.volumes) ? obj.volumes : []);
  const stl = (obj: any) => (Array.isArray(obj?.steel) ? obj.steel : []);

  const ensureGroup = (key: string) => {
    const v = merged[key];
    const def = safeDefaults[key];
    merged[key] = {
      volumes: Array.isArray(v?.volumes)
        ? v.volumes
        : Array.isArray(def?.volumes)
          ? def.volumes
          : [],
      steel: Array.isArray(v?.steel)
        ? v.steel
        : Array.isArray(def?.steel)
          ? def.steel
          : [],
    };
  };

  if (merged.unspecified) {
    const u = merged.unspecified;
    merged.unspecified = {
      volumes: Array.isArray(u?.volumes) ? u.volumes : [],
      steel: Array.isArray(u?.steel) ? u.steel : [],
    };
  } else if (safeDefaults.unspecified) {
    merged.unspecified = {
      volumes: Array.isArray(safeDefaults.unspecified.volumes)
        ? safeDefaults.unspecified.volumes
        : [],
      steel: Array.isArray(safeDefaults.unspecified.steel)
        ? safeDefaults.unspecified.steel
        : [],
    };
  } else {
    merged.unspecified = { volumes: [], steel: [] };
  }

  if (type === "beam_column") {
    ["concrete_columns", "concrete_beams", "concrete_slabs"].forEach(
      ensureGroup,
    );
    const g = merged as BeamColumnGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TBeamColumnPosition>[] = [];
    concrete.push(
      ...(
        addConcretePositions(
          vol(g.concrete_columns),
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
          vol(g.concrete_beams),
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
          vol(g.concrete_slabs),
          "slab",
        ) as IV2ConcreteVolumeItem<TBeamColumnPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TBeamColumnPosition>;
        }),
      );
    }

    const steelItems: IV2SteelMaterialItem<TBeamColumnPosition>[] = [];
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.concrete_columns),
          "column",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.concrete_beams),
          "beam",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.concrete_slabs),
          "slab",
        ) as IV2SteelMaterialItem<TBeamColumnPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    if (g.unspecified?.steel?.length) {
      steelItems.push(
        ...(g.unspecified.steel.map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TBeamColumnPosition>[]),
      );
    }

    const form: IV2FormAreaItem<TBeamColumnPosition>[] = [];
    const fc = toNumberValue(g.form_columns);
    if (fc > 0) form.push({ area: fc, position: "column" });
    const fb = toNumberValue(g.form_beams);
    if (fb > 0) form.push({ area: fb, position: "beam" });
    const fs = toNumberValue(g.form_slabs);
    if (fs > 0) form.push({ area: fs, position: "slab" });
    const fus = toNumberValue(g.form_unspecified);
    if (fus > 0) form.push({ area: fus });

    return {
      type: "beam_column",
      concrete,
      steel: steelItems,
      form: form.length > 0 ? form : undefined,
      column_number: toNumberValue(g.column_number),
      avg_beam_span: toNumberValue(g.avg_beam_span),
      avg_slab_span: toNumberValue(g.avg_slab_span),
      slab_type: (g as any).slab_type as TSlabType | undefined,
      floor_ids: selectedFloors,
    };
  }

  if (type === "concrete_wall") {
    ["concrete_walls", "concrete_slabs"].forEach(ensureGroup);
    const g = merged as ConcreteWallGroupedForm;
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
    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TConcreteWallPosition>;
        }),
      );
    }
    if (g.unspecified?.steel?.length) {
      steel.push(
        ...(g.unspecified.steel.map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TConcreteWallPosition>[]),
      );
    }

    const form: IV2FormAreaItem<TConcreteWallPosition>[] = [];
    const wf = toNumberValue(g.wall_form_area);
    if (wf > 0) form.push({ area: wf, position: "wall" });
    const sf = toNumberValue(g.slab_form_area);
    if (sf > 0) form.push({ area: sf, position: "slab" });
    const fus = toNumberValue(g.form_unspecified);
    if (fus > 0) form.push({ area: fus });

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
    [
      "concrete_columns",
      "concrete_beams",
      "concrete_slabs",
      "masonry_columns",
      "masonry_beams",
      "masonry_slabs",
    ].forEach(ensureGroup);
    const g = merged as StructuralMasonryGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TStructuralMasonryPosition>[] = [];
    const steelItems: IV2SteelMaterialItem<TStructuralMasonryPosition>[] = [];
    const form: IV2FormAreaItem<TStructuralMasonryPosition>[] = [];

    concrete.push(
      ...(
        addConcretePositions(
          vol(g.concrete_slabs),
          "slab",
        ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
      ).map((c) => ({
        ...c,
        fck: c.fck as TFck,
        volume: toNumberValue(c.volume as string | number),
      })),
    );
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.concrete_slabs),
          "slab",
        ) as IV2SteelMaterialItem<TStructuralMasonryPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );
    const fss = toNumberValue(g.form_slabs);
    if (fss > 0) form.push({ area: fss, position: "slab" });

    if (vol(g.concrete_columns).length) {
      concrete.push(
        ...(
          addConcretePositions(
            vol(g.concrete_columns),
            "column",
          ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
        ).map((c) => ({
          ...c,
          fck: c.fck as TFck,
          volume: toNumberValue(c.volume as string | number),
        })),
      );
      steelItems.push(
        ...(
          addSteelPositions(
            stl(g.concrete_columns),
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

    if (vol(g.concrete_beams).length) {
      concrete.push(
        ...(
          addConcretePositions(
            vol(g.concrete_beams),
            "beam",
          ) as IV2ConcreteVolumeItem<TStructuralMasonryPosition>[]
        ).map((c) => ({
          ...c,
          fck: c.fck as TFck,
          volume: toNumberValue(c.volume as string | number),
        })),
      );
      steelItems.push(
        ...(
          addSteelPositions(
            stl(g.concrete_beams),
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
    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TStructuralMasonryPosition>;
        }),
      );
    }
    if (g.unspecified?.steel?.length) {
      steelItems.push(
        ...(g.unspecified.steel.map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TStructuralMasonryPosition>[]),
      );
    }
    const fus = toNumberValue(g.form_unspecified);
    if (fus > 0) form.push({ area: fus });

    return {
      type: "structural_masonry",
      masonry: {
        blocks: g.masonry_blocks,
        grout: g.grout,
        mortar: g.mortar,
      },
      concrete: concrete.length > 0 ? concrete : undefined,
      steel: steelItems.length > 0 ? steelItems : undefined,
      form: form.length > 0 ? form : undefined,
      slab_type: g.slab_type as TSlabType | undefined,
      floor_ids: selectedFloors,
    };
  }

  if (type === "raft_foundation") {
    const g = merged as RaftFoundationGroupedForm & { unspecified?: any };
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

    const steelRaw = Array.isArray((g as any).steel)
      ? (g as any).steel
      : Array.isArray((g as any).raft?.steel)
        ? (g as any).raft.steel
        : [];
    const steelItems: IV2SteelMaterialItem<TRaftFoundationPosition>[] = (
      addSteelPositions(
        steelRaw,
        "raft",
      ) as IV2SteelMaterialItem<TRaftFoundationPosition>[]
    ).map((s) => ({ ...s, mass: toNumberValue(s.mass as string | number) }));

    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v: any) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TRaftFoundationPosition>;
        }),
      );
    }
    if (g.unspecified?.steel?.length) {
      steelItems.push(
        ...(g.unspecified.steel.map((s: any) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TRaftFoundationPosition>[]),
      );
    }

    const flatResult: TRaftFoundationDataV2 & {
      type: "raft_foundation";
      unit_id?: string;
      raft_area?: number;
      raft_thickness?: number;
    } = {
      type: "raft_foundation",
      concrete,
      steel: steelItems,
      unit_id: unitId,
    };
    flatResult.raft_area = areaNum;
    flatResult.raft_thickness = thicknessNum;
    return flatResult;
  }

  if (type === "piles_foundation") {
    ["piles", "pile_caps", "grade_beams", "tie_beams"].forEach(ensureGroup);
    const g = merged as PilesFoundationGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TPilesFoundationPosition>[] = [];
    const steelItems: IV2SteelMaterialItem<TPilesFoundationPosition>[] = [];

    concrete.push({
      fck: g.fck as TFck,
      volume: toNumberValue(vol(g.piles)[0]?.volume ?? g.piles?.volume ?? 0),
      position: "pile",
    });
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.piles),
          "pile",
        ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    const pcVol = toNumberValue(
      vol(g.pile_caps)[0]?.volume ?? g.pile_caps?.volume ?? 0,
    );
    if (pcVol > 0) {
      concrete.push({
        fck: g.fck as TFck,
        volume: pcVol,
        position: "block",
      });
      steelItems.push(
        ...(
          addSteelPositions(
            stl(g.pile_caps),
            "block",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    const gbVol = toNumberValue(
      vol(g.grade_beams)[0]?.volume ?? g.grade_beams?.volume ?? 0,
    );
    if (gbVol > 0) {
      concrete.push({
        fck: g.fck as TFck,
        volume: gbVol,
        position: "grade_beam",
      });
      steelItems.push(
        ...(
          addSteelPositions(
            stl(g.grade_beams),
            "grade_beam",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    const tbVol = toNumberValue(
      vol(g.tie_beams)[0]?.volume ?? g.tie_beams?.volume ?? 0,
    );
    if (tbVol > 0) {
      concrete.push({
        fck: g.fck as TFck,
        volume: tbVol,
        position: "tie_beam",
      });
      steelItems.push(
        ...(
          addSteelPositions(
            stl(g.tie_beams),
            "tie_beam",
          ) as IV2SteelMaterialItem<TPilesFoundationPosition>[]
        ).map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })),
      );
    }

    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TPilesFoundationPosition>;
        }),
      );
    }
    if (g.unspecified?.steel?.length) {
      steelItems.push(
        ...(g.unspecified.steel.map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TPilesFoundationPosition>[]),
      );
    }

    return {
      type: "piles_foundation",
      concrete,
      steel: steelItems,
      unit_id: unitId,
    };
  }

  if (type === "raft_piles_foundation") {
    ["raft", "piles"].forEach(ensureGroup);
    const g = merged as RaftPilesFoundationGroupedForm;
    const concrete: IV2ConcreteVolumeItem<TRaftPilesFoundationPosition>[] = [];
    const steelItems: IV2SteelMaterialItem<TRaftPilesFoundationPosition>[] = [];

    const raftAreaNum = toNumberValue(
      g.raft?.area ?? (g.raft as any)?.area ?? 0,
    );
    const raftThickNum = toNumberValue(
      g.raft?.thickness ?? (g.raft as any)?.thickness ?? 0,
    );
    const raftVol = raftAreaNum * raftThickNum;
    if (raftAreaNum > 0 && raftThickNum > 0 && raftVol > 0) {
      concrete.push({
        fck: g.fck as TFck,
        volume: raftVol,
        position: "raft",
      });
    }
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.raft),
          "raft",
        ) as IV2SteelMaterialItem<TRaftPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    concrete.push({
      fck: g.fck as TFck,
      volume: toNumberValue(vol(g.piles)[0]?.volume ?? g.piles?.volume ?? 0),
      position: "pile",
    });
    steelItems.push(
      ...(
        addSteelPositions(
          stl(g.piles),
          "pile",
        ) as IV2SteelMaterialItem<TRaftPilesFoundationPosition>[]
      ).map((s) => ({
        ...s,
        mass: toNumberValue(s.mass as string | number),
      })),
    );

    if (g.unspecified?.volumes?.length) {
      concrete.push(
        ...g.unspecified.volumes.map((v) => {
          const { customFck, ...rest } = v;
          return {
            ...rest,
            fck: rest.fck as TFck,
            volume: toNumberValue(rest.volume as string | number),
          } as IV2ConcreteVolumeItem<TRaftPilesFoundationPosition>;
        }),
      );
    }
    if (g.unspecified?.steel?.length) {
      steelItems.push(
        ...(g.unspecified.steel.map((s) => ({
          ...s,
          mass: toNumberValue(s.mass as string | number),
        })) as IV2SteelMaterialItem<TRaftPilesFoundationPosition>[]),
      );
    }

    const flatResult: TRaftPilesFoundationDataV2 & {
      type: "raft_piles_foundation";
      unit_id?: string;
      raft_area?: number;
      raft_thickness?: number;
    } = {
      type: "raft_piles_foundation",
      concrete,
      steel: steelItems,
      unit_id: unitId,
    };
    flatResult.raft_area = raftAreaNum;
    flatResult.raft_thickness = raftThickNum;
    return flatResult;
  }

  return groupedFormToFlatV2("beam_column", grouped, selectedFloors, unitId);
};

export interface CompletenessWarningsI18n {
  masonryLabel: string;
  positions: Record<string, string>;
  missing: {
    concrete: string;
    steel: string;
    form: string;
    blocks: string;
    grout: string;
    mortar: string;
  };
  patterns: {
    singleMissing: string;
    multiMissing: string;
  };
  global: {
    noValidConcrete: string;
    noValidSteel: string;
    minConcrete: string;
    minSteel: string;
  };
}

type RequiredPositionsMap = Record<
  TModulesTypes,
  {
    positions: readonly string[];
    requireConcrete?: readonly string[];
    requireSteel?: readonly string[];
    requireForm?: readonly string[];
    requireMasonryKeys?: (keyof IMasonryElement)[];
  }
>;

const REQUIRED_POSITIONS: RequiredPositionsMap = {
  beam_column: {
    positions: ["column", "beam", "slab"] as const,
    requireConcrete: ["column", "beam", "slab"],
    requireSteel: ["column", "beam", "slab"],
    requireForm: [],
  },
  concrete_wall: {
    positions: ["wall", "slab"] as const,
    requireConcrete: ["wall", "slab"],
    requireSteel: ["wall", "slab"],
    requireForm: [],
  },
  structural_masonry: {
    positions: [] as const,
    requireMasonryKeys: ["blocks", "grout", "mortar"],
  },
  raft_foundation: {
    positions: ["raft"] as const,
    requireConcrete: ["raft"],
    requireSteel: ["raft"],
  },
  piles_foundation: {
    positions: [] as const,
    requireConcrete: [],
    requireSteel: [],
  },
  raft_piles_foundation: {
    positions: [] as const,
    requireConcrete: [],
    requireSteel: [],
  },
};

const formatTpl = (template: string, vars: Record<string, string>): string => {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
};

export const getCompletenessWarnings = (
  flatData: any,
  moduleType: TModulesTypes,
  i18n: CompletenessWarningsI18n,
): { hasWarnings: boolean; messages: string[] } => {
  const out: string[] = [];
  if (!flatData || !moduleType || !i18n)
    return { hasWarnings: false, messages: out };

  const cfg = REQUIRED_POSITIONS[moduleType];
  if (!cfg) return { hasWarnings: false, messages: out };

  const concreteArr = (flatData.concrete ?? []) as IV2ConcreteVolumeItem<any>[];
  const steelArr = (flatData.steel ?? []) as IV2SteelMaterialItem<any>[];
  const formArr = (flatData.form ?? []) as IV2FormAreaItem<any>[];

  const hasConcreteAt = (pos: string) =>
    concreteArr.some(
      (c) =>
        c.position === pos &&
        !isConcreteItemZero(c as IV2ConcreteVolumeItem<TAnyPosition>),
    );
  const hasSteelAt = (pos: string) =>
    steelArr.some(
      (s) =>
        s.position === pos &&
        !isSteelItemZero(s as IV2SteelMaterialItem<TAnyPosition>),
    );
  const hasFormAt = (pos: string) =>
    formArr.some(
      (f) =>
        f.position === pos &&
        !isFormItemZero(f as IV2FormAreaItem<TAnyPosition>),
    );

  for (const pos of cfg.positions) {
    const needConcrete = cfg.requireConcrete?.includes(pos);
    const needSteel = cfg.requireSteel?.includes(pos);
    const needForm = cfg.requireForm?.includes(pos);
    const label = i18n.positions[pos] ?? pos;

    const missing: string[] = [];
    if (needConcrete && !hasConcreteAt(pos)) missing.push(i18n.missing.concrete);
    if (needSteel && !hasSteelAt(pos)) missing.push(i18n.missing.steel);
    if (needForm && !hasFormAt(pos)) missing.push(i18n.missing.form);

    if (missing.length === 0) continue;
    if (missing.length === 1) {
      out.push(
        formatTpl(i18n.patterns.singleMissing, {
          label,
          item: missing[0],
        }),
      );
    } else {
      const last = missing.pop()!;
      out.push(
        formatTpl(i18n.patterns.multiMissing, {
          label,
          head: missing.join(", "),
          last,
        }),
      );
    }
  }

  if (cfg.requireMasonryKeys?.length) {
    const masonry = flatData.masonry as IMasonryElement | undefined;
    const masonryLabels: Record<string, string> = {
      blocks: i18n.missing.blocks,
      grout: i18n.missing.grout,
      mortar: i18n.missing.mortar,
    };
    const masonryMissing: string[] = [];
    for (const k of cfg.requireMasonryKeys) {
      const arr = (masonry as any)?.[k] as any[] | undefined;
      if (!arr || arr.length === 0) {
        masonryMissing.push(masonryLabels[k] ?? String(k));
      }
    }
    if (masonryMissing.length === 1) {
      out.push(
        formatTpl(i18n.patterns.singleMissing, {
          label: i18n.masonryLabel,
          item: masonryMissing[0],
        }),
      );
    } else if (masonryMissing.length > 1) {
      const last = masonryMissing.pop()!;
      out.push(
        formatTpl(i18n.patterns.multiMissing, {
          label: i18n.masonryLabel,
          head: masonryMissing.join(", "),
          last,
        }),
      );
    }
  }

  const globalConcreteMin = 1;
  const globalSteelMin = 1;
  if (moduleType !== "structural_masonry") {
    const anyConcrete = concreteArr.some(
      (c) => !isConcreteItemZero(c as IV2ConcreteVolumeItem<TAnyPosition>),
    );
    const anySteel = steelArr.some(
      (s) => !isSteelItemZero(s as IV2SteelMaterialItem<TAnyPosition>),
    );
    if (cfg.requireConcrete && cfg.requireConcrete.length > 0 && !anyConcrete) {
      out.push(i18n.global.noValidConcrete);
    }
    if (cfg.requireSteel && cfg.requireSteel.length > 0 && !anySteel) {
      out.push(i18n.global.noValidSteel);
    }
    if (cfg.requireConcrete?.length === 0) {
      if (concreteArr.length < globalConcreteMin) out.push(i18n.global.minConcrete);
      if (steelArr.length < globalSteelMin) out.push(i18n.global.minSteel);
    }
  }

  return { hasWarnings: out.length > 0, messages: out };
};
