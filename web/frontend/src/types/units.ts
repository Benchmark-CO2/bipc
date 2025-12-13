import { IModule } from "./modules";
import { TConsumptionPerModule } from "./projects";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Unit = {
  id: number;
  title: string;
  modules: IModule[];
};

export type TUnitType = "tower";

export type TTowerFloorCategory = {
  id: string;
  unit_id?: string;
  group_id?: string;
  group_name?: string;
  floor_group?: string; // Campo que vem do backend na edição
  area: number;
  height: number;
  index: number;
  consumptions?: TConsumptionPerModule;
  category?:
    | "penthouse_floor"
    | "standard_floor"
    | "ground_floor"
    | "basement_floor";
};

export interface IUnit {
  id: string;
  project_id: number;
  name: string;
  type: TUnitType;
  created_at: string;
  updated_at: string;
  version: number;
  floors: TTowerFloorCategory[];
}
