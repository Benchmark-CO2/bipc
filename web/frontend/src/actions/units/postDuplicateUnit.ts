import api from "@/service/api";
import { IUnit } from "@/types/units";

export const postDuplicateUnit = (projectId: string, unitId: string) => {
  return api.post<{ unit: IUnit }>(
    `/v1/projects/${projectId}/units/${unitId}/duplicate`,
  );
};
