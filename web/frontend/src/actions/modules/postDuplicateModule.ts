import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";

export interface TDuplicateModuleResponse {
  module: TModuleStructure & { completed?: boolean };
}

export const postDuplicateModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string,
) => {
  return api.post<TDuplicateModuleResponse>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}/duplicate`,
  );
};
