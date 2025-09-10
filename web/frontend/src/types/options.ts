import { IModuleItem } from "./modules";

export type TOption = {
  id: string;
  tower_id: string;
  name: string;
  active: boolean;
  modules: IModuleItem[];
};
