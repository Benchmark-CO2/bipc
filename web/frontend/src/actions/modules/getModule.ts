import api from "@/service/api";
import { ModuleCreateRequestV2, ModuleResponseMetaV2 } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string,
  includeSource = false,
) => {
  const params: Record<string, string> = {};
  if (includeSource) params.include_source = "1";
  return api.get<{ module: ModuleCreateRequestV2 & ModuleResponseMetaV2 }>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`,
    { params },
  );
};
