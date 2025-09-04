import { IModule } from "./modules";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Unit = {
  id: number;
  title: string;
  modules: IModule[];
};

export type TUnitType = "tower";

export type TTowerFloorCategory = {
  id: string;
  group_id: string;
  group_name: string;
  area: number;
  height: number;
  index: number;
};

export type TTowerType = {
  id: string;
  created_at: string;
  updated_at: string;
  version: number;
  floors: TTowerFloorCategory[];
};

export interface IUnit {
  id: number;
  project_id: number;
  name: string;
  type: TUnitType;
  tower: TTowerType;
  // total_floors?: number;
  // tower_floors?: number;
  // base_floors?: number;
  // basement_floors?: number;
  // type_floors?: number;
  // total_area?: number;
  // concrete_wall_modules?: IModuleItem[];
  // beam_column_modules?: IModuleItem[];
  // structural_masonry_modules?: IModuleItem[];
}
