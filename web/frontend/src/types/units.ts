import { IModule } from "./modules";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Unit = {
  id: number;
  title: string;
  modules: IModule[];
};

export type TUnitType = "tower";

export interface IUnit {
  id: number;
  project_id: number;
  name: string;
  type: TUnitType;
  total_floors?: number;
  tower_floors?: number;
  base_floors?: number;
  basement_floors?: number;
  type_floors?: number;
  total_area?: number;
}
