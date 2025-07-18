import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";
import { ModuleFormSchema } from "@/validators/moduleForm.validator";

export const postModule = (
  moduleParams: ModuleFormSchema,
  projectId: string,
  unitId: string
) => {
  return api.post<{ result: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/modules`,
    moduleParams
  );
};
