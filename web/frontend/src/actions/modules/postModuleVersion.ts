import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";
import { ModuleFormSchema } from "@/validators/moduleForm.validator";

export const postModuleVersion = (
  moduleParams: ModuleFormSchema,
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.post<{ result: TModuleStructure }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}`,
    moduleParams
  );
};
