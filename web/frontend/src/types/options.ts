import { IModuleItem } from "./modules";
import { TConsumptionPerModule } from "./projects";

export type TOption = {
  id: string;
  unit_id: string;
  role_id: string;
  name: string;
  active: boolean;
  modules: IModuleItem[];
  consumption: TConsumptionPerModule;
};
