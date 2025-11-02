import api from "@/service/api";
import { TRoleConsumptions } from "@/types/disciplines";
import { IUnit } from "@/types/units";

export const getUnitByUUID = (projectId: string, unitId: string) => {
  return api.get<{ unit: IUnit; roles: TRoleConsumptions[] }>(
    `/v1/projects/${projectId}/units/${unitId}`
  );
};
