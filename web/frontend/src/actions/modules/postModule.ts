import api from "@/service/api";
import { TModuleStructure, TModulesTypes } from "@/types/modules";
import { ModuleFormSchema } from "@/validators/moduleForm.validator";

type ModuleParamsProps = {
  type: TModulesTypes;
  data: Omit<ModuleFormSchema, "type"> & {
    floor_ids?: string[];
  };
};

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
