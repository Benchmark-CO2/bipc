import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string
) => {
  return api.get<{ module: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`
  );
};
