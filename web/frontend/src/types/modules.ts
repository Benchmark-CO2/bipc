import { ModuleFormSchema } from "@/validators/moduleFormByType.validator";

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
  fck: number;
  volume: number;
}

export interface IBlock {
  type:
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

export type TModulesTypes =
  | "beam_column"
  | "concrete_wall"
  | "structural_masonry";

export interface IModuleItem {
  id: string;
  type: TModulesTypes;
  consumption: IConsumption;
}

export interface IBasicModule {
  name: string;
  type: TModulesTypes;
  id?: string;
  consumption?: IConsumption;
  floor_ids?: string[];
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

export type ModuleParamsProps = {
  type: TModulesTypes;
  data: Omit<ModuleFormSchema, "type"> & {
    floor_ids?: string[];
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
