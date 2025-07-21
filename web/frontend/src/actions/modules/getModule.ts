import api from "@/service/api";
import { TModuleStructure, TModulesTypes } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  moduleId: string,
  type: TModulesTypes
) => {
  return api.get<{ versions: TModuleStructure[] }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}?type=${type}`
  );
};
