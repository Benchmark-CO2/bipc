import api from "@/service/api";
import { ModuleCreateRequestV2 } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string,
) => {
  return api.get<{ module: ModuleCreateRequestV2 & { id?: string } }>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`,
  );
};
