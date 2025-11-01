import { TConsumptionPerModule } from "./projects";

export type TRole = {
  id: string;
  name: string;
  description?: string;
  simulation: boolean;
  is_protected: boolean;
  permissions_ids: number[];
  users_ids: string[];
};

export type TRoleConsumptions = {
  id: string;
  name: string;
  is_protected?: boolean;
  consumption: TConsumptionPerModule;
};
