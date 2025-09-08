import api from "@/service/api";
import { ModuleParamsProps, TModuleStructure } from "@/types/modules";

export const postModule = (
  moduleParams: ModuleParamsProps,
  projectId: string,
  unitId: string,
  optionId: string
) => {
  return api.post<{ module: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules`,
    moduleParams
  );
};
