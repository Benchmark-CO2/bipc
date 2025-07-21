import api from "@/service/api";
import { TModulesTypes } from "@/types/modules";

export const postSetModuleInUse = (
  newVersion: { version: number; type: TModulesTypes },
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.post<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}/version`,
    newVersion
  );
};
