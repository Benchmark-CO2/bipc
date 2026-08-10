export interface IModule {
  module_uuid: string;
  name: string;
  version: string;
  updated_at: string;
  created_at: string;
  status: "in progress" | "completed" | "not started";
  consume_kg: number;
  consume_kgco2: number;
  consume_mj: number;
}

export interface IConsumption {
  co2_min: number;
  co2_max: number;
  energy_min: number;
  energy_max: number;
  material: number;
}

export interface ISidacValue {
  min: number;
  max: number;
}

export interface ISidacMaterial {
  kgCO2: Record<string, ISidacValue>;
  MJ: Record<string, ISidacValue>;
}

export type TModulesTypes =
  | "beam_column"
  | "concrete_wall"
  | "structural_masonry"
  | "raft_foundation"
  | "piles_foundation"
  | "raft_piles_foundation";

export const FOUNDATION_MODULE_TYPES: TModulesTypes[] = [
  "raft_foundation",
  "piles_foundation",
  "raft_piles_foundation",
];

export interface IModuleItem {
  id: string;
  name?: string | null;
  type: TModulesTypes;
  consumption: IConsumption;
  outdated?: boolean;
  version?: string | number;
  version_in_use?: string | number;
  floor_repetition?: number | string | null;
  total_concrete?: number | null;
  total_steel?: number | null;
  co2_min?: number | null;
  co2_max?: number | null;
  energy_min?: number | null;
  energy_max?: number | null;
}

export interface IBasicModule {
  name: string;
  type: TModulesTypes;
  id?: string;
  consumption?: IConsumption;
  floor_ids?: string[];
  slab_type?: string;
}

export type TFck = 20 | 25 | 30 | 35 | 40 | 45 | 50;

export type TSteelMaterial = "general" | "rebar" | "mesh" | "strand" | "other";

export type TSteelResistance = "CA50" | "CA60" | "CP190" | "other";

export type TSlabType =
  | "solid"
  | "ribbed"
  | "mushroom_solid"
  | "mushroom_ribbed"
  | "flat"
  | "band_beam"
  | "pt_solid"
  | "pt_ribbed"
  | "pt_mushroom_solid"
  | "pt_mushroom_ribbed"
  | "pt_flat"
  | "pt_band_beam"
  | "trussed"
  | "joist"
  | "filigree"
  | "hollow_core"
  | "precast_solid"
  | "precast_ribbed"
  | "pt_precast";

export type TBeamColumnPosition = "column" | "beam" | "slab" | "stair";
export type TConcreteWallPosition = "wall" | "slab" | "stair";
export type TStructuralMasonryPosition = "column" | "beam" | "slab" | "stair";
export type TRaftFoundationPosition = "raft";
export type TPilesFoundationPosition =
  | "pile"
  | "block"
  | "grade_beam"
  | "tie_beam";
export type TRaftPilesFoundationPosition = "raft" | "pile";

export interface IV2ConcreteVolumeItem<TPosition extends string> {
  fck: TFck;
  volume: number;
  position?: TPosition;
}

export interface IV2SteelMaterialItem<TPosition extends string> {
  material: TSteelMaterial;
  other_name?: string;
  resistance: TSteelResistance;
  other_resistance?: number;
  mass: number;
  position?: TPosition;
}

export interface IV2FormAreaItem<TPosition extends string> {
  area: number;
  position?: TPosition;
}

export type TBlockType =
  | "inteiro (14x19x29)"
  | "meio (14x19x14)"
  | "amarração T (14x19x44)"
  | "canaleta inteira (14x19x29)"
  | "meia canaleta (14x19x14)"
  | "inteiro (14x19x39)"
  | "meio (14x19x19)"
  | "amarração T (14x19x54)"
  | "amarração L (14x19x34)"
  | "canaleta  inteira (14x19x39)"
  | "canaleta de amarração (14x19x34)"
  | "meia canaleta (14x19x19)"
  | "compensador 1/4 (14x19x9)"
  | "compensador 1/8 (14x19x4)"
  | "inteiro (19x19x39)"
  | "meio (19x19x19)"
  | "canaleta inteira (19x19x39)"
  | "meia canaleta (19x19x19)"
  | "compensador 1/4 (19x19x9)"
  | "compensador 1/8 (19x19x4)";

export interface IBlockInfo {
  type: TBlockType;
  fbk: number;
  quantity: number;
}

export interface IGroutVolumeItem {
  fgk: number;
  volume: number;
}

export type TGroutPosition = "vertical" | "horizontal";

export interface IGroutInfo {
  position: TGroutPosition;
  volumes: IGroutVolumeItem[];
  steel: IV2SteelMaterialItem<string>[];
}

export interface IMortarItem {
  fak: number;
  volume: number;
}

export interface IMasonryElement {
  grout: IGroutInfo[];
  mortar: IMortarItem[];
  blocks: IBlockInfo[];
}

export interface TBeamColumnDataV2 {
  floor_ids?: string[];
  floor_index?: number;
  floor_indexes?: number[];
  concrete: IV2ConcreteVolumeItem<TBeamColumnPosition>[];
  steel: IV2SteelMaterialItem<TBeamColumnPosition>[];
  form?: IV2FormAreaItem<TBeamColumnPosition>[];
  slab_type?: TSlabType;
  beam_number?: number;
  slab_number?: number;
  column_number?: number;
  avg_beam_span?: number;
  avg_slab_span?: number;
}

export interface TConcreteWallDataV2 {
  floor_ids?: string[];
  floor_index?: number;
  floor_indexes?: number[];
  concrete: IV2ConcreteVolumeItem<TConcreteWallPosition>[];
  steel: IV2SteelMaterialItem<TConcreteWallPosition>[];
  form?: IV2FormAreaItem<TConcreteWallPosition>[];
  slab_type?: TSlabType;
  wall_thickness?: number;
  slab_thickness?: number;
  wall_area?: number;
  slab_area?: number;
  beam_number?: number;
  slab_number?: number;
}

export interface TStructuralMasonryDataV2 {
  floor_ids?: string[];
  floor_index?: number;
  floor_indexes?: number[];
  concrete?: IV2ConcreteVolumeItem<TStructuralMasonryPosition>[];
  steel?: IV2SteelMaterialItem<TStructuralMasonryPosition>[];
  form?: IV2FormAreaItem<TStructuralMasonryPosition>[];
  slab_type?: TSlabType;
  beam_number?: number;
  slab_number?: number;
  masonry: IMasonryElement;
}

export interface TRaftFoundationDataV2 {
  unit_id?: string;
  raft_area?: number;
  raft_thickness?: number;
  concrete: IV2ConcreteVolumeItem<TRaftFoundationPosition>[];
  steel: IV2SteelMaterialItem<TRaftFoundationPosition>[];
}

export interface TPilesFoundationDataV2 {
  unit_id?: string;
  concrete: IV2ConcreteVolumeItem<TPilesFoundationPosition>[];
  steel: IV2SteelMaterialItem<TPilesFoundationPosition>[];
}

export interface TRaftPilesFoundationDataV2 {
  unit_id?: string;
  raft_area?: number;
  raft_thickness?: number;
  concrete: IV2ConcreteVolumeItem<TRaftPilesFoundationPosition>[];
  steel: IV2SteelMaterialItem<TRaftPilesFoundationPosition>[];
}

export type TModuleDataV2 =
  | TBeamColumnDataV2
  | TConcreteWallDataV2
  | TStructuralMasonryDataV2
  | TRaftFoundationDataV2
  | TPilesFoundationDataV2
  | TRaftPilesFoundationDataV2;

export interface ModuleCreateRequestV2 {
  type: TModulesTypes;
  data: TModuleDataV2;
}

export interface ModuleUpdateRequestV2 {
  type: TModulesTypes;
  data: Partial<TModuleDataV2>;
}

export type ModuleParamsPropsV2 = {
  type: TModulesTypes;
  data: Partial<TModuleDataV2> & {
    floor_ids?: string[];
    unit_id?: string;
  };
};

export type TAnyPosition =
  | TBeamColumnPosition
  | TConcreteWallPosition
  | TStructuralMasonryPosition
  | TRaftFoundationPosition
  | TPilesFoundationPosition
  | TRaftPilesFoundationPosition;

export interface IConcrete {
  fck: number;
  volume: number;
}

export interface IBlock {
  type: TBlockType;
  fbk: number;
  quantity: number;
}

export interface IGroutItem {
  fgk: number;
  volume: number;
}

export interface ISteelItem {
  ca: number;
  mass: number;
}

export interface IGrout {
  type: "vertical" | "horizontal" | "general";
  volumes: IGroutItem[];
  steel: ISteelItem[];
}

export interface IMortar {
  fak: number;
  volume: number;
}

export interface IBeamColumn extends IBasicModule {
  concrete_columns: IConcrete[];
  concrete_beams: IConcrete[];
  concrete_slabs: IConcrete[];
  steel_ca50: number;
  steel_ca60: number;
  form_columns?: number;
  form_beams?: number;
  form_slabs?: number;
  form_total?: number;
  column_number?: number;
  avg_beam_span?: number;
  avg_slab_span?: number;
}

export interface IConcreteWall extends IBasicModule {
  concrete_walls: IConcrete[];
  concrete_slabs: IConcrete[];
  steel_ca50: number;
  steel_ca60: number;
  wall_thickness?: number;
  slab_thickness?: number;
  form_area?: number;
  wall_area?: number;
}

export interface IStructuralMasonry extends IBasicModule {
  blocks: IBlock[];
  grout: IGrout[];
  mortar: IMortar[];
  concrete_slabs: IConcrete[];
  concrete_columns?: IConcrete[];
  concrete_beams?: IConcrete[];
  form_slabs?: number;
  form_columns?: number;
  form_beams?: number;
  avg_slab_span?: number;
}

export type TModuleStructure = IBeamColumn | IConcreteWall | IStructuralMasonry;

export type ModuleParamsProps = {
  type: TModulesTypes;
  data: Record<string, unknown> & {
    floor_ids?: string[];
    unit_id?: string;
  };
};

// export type TModuleData = {
//   total_co2_min: number;
//   total_co2_max: number;
//   total_energy_min: number;
//   total_energy_max: number;
//   version: number;
//   in_use: boolean;
//   created_at: string;
//   updated_at: string;
// } & TModuleStructure;
