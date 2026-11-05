import { IModuleItem } from "./modules";
import { TConsumptionPerModule } from "./projects";
import { TUnknownModuleOccurrence } from "./unknownModules";

export type TOption = {
  id: string;
  unit_id: string;
  role_id: string;
  name: string;
  active: boolean;
  modules: IModuleItem[];
  unknown_modules: TUnknownModuleOccurrence[];
  consumption: TConsumptionPerModule;
};
