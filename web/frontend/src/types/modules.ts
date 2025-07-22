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

export interface IConcrete {
  fck: "20" | "25" | "30" | "35" | "40" | "45";
  volume: number;
}

export interface IBlock {
  type:
    | "BL 14x4"
    | "BL 14x19"
    | "BL 14x34"
    | "BL 14x39"
    | "BL 14x54"
    | "BL 19x4"
    | "BL 19x19"
    | "BL 19x39"
    | "CL 14x19"
    | "CL 14x34"
    | "CL 14x14"
    | "CL 14x39"
    | "CL 19x19"
    | "CL 19x39"
    | "COMP 14x19"
    | "COMP 14x39"
    | "JOTA 14 x 39 x 19/9"
    | "JOTA 14 x 19 x 19/9";
  fbk: "02" | "04" | "06" | "08" | "10" | "12";
  quantity: number;
}

export type TModulesTypes =
  | "beam_column"
  | "concrete_wall"
  | "structural_masonry";

export interface IModuleItem {
  id: number;
  name: string;
  type: TModulesTypes;
  floor_repetition: number;
  floor_area: number;
  total_concrete?: number;
  total_steel?: number;
  co2_min?: number;
  co2_max?: number;
  energy_min?: number;
  energy_max?: number;
  version?: number;
}

export interface IBasicModule {
  id?: number;
  name: string;
  type: TModulesTypes;
  floor_repetition: number;
  floor_area: number;
  floor_height: number;
  co2_min?: number;
  co2_max?: number;
  energy_min?: number;
  energy_max?: number;
  in_use?: boolean;
  version?: number;
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
  vertical_grout: IConcrete[];
  horizontal_grout: IConcrete[];
  blocks: IBlock[];
  steel_ca50: number;
  steel_ca60: number;
}

export interface IConsumption {
  co2_min: number;
  co2_max: number;
  energy_min: number;
  energy_max: number;
}

export interface ISidacValue {
  min: number;
  max: number;
}

export interface ISidacMaterial {
  kgCO2: Record<string, ISidacValue>;
  MJ: Record<string, ISidacValue>;
}

export type TModuleStructure = IBeamColumn | IConcreteWall | IStructuralMasonry;

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
