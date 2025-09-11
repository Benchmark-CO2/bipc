import api from "@/service/api";
import { ModuleParamsProps, TModuleStructure } from "@/types/modules";

export const patchModule = (
  moduleParams: ModuleParamsProps,
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string
) => {
  return api.patch<{ module: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`,
    moduleParams
  );
};
