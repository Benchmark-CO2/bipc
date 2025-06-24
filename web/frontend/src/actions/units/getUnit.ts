import api from "@/service/api";
import { IUnit } from "@/types/units";

export const getUnitByUUID = (projectId: string, unitId: string) => {
  return api.get<{ unit: IUnit }>(`/v1/projects/${projectId}/units/${unitId}`);
};
