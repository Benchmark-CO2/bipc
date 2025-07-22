import api from "@/service/api";
import { TModulesTypes } from "@/types/modules";

export const deleteModule = (
  projectId: string,
  unitId: string,
  moduleId: string,
  type: TModulesTypes
) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}?type=${type}`
  );
};
