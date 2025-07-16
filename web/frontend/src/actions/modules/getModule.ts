import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.get<{ versions: TModuleStructure[] }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}`
  );
};
