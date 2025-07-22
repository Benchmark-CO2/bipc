import api from "@/service/api";
import { TModulesTypes } from "@/types/modules";

export const patchModuleName = (
  newModuleName: { name: string; type: TModulesTypes },
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.patch<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}`,
    newModuleName
  );
};
