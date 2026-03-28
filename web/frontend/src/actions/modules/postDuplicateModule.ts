import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";

export const postDuplicateModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string,
) => {
  return api.post<{ module: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}/duplicate`,
  );
};
