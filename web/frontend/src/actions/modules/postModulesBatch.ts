import api from "@/service/api";
import { ModuleParamsProps } from "@/types/modules";

export interface TModuleBatchCreateRequest {
  modules: ModuleParamsProps[];
}

export interface TModuleBatchCreateResponse {
  modules: Array<{
    id?: string;
    type: string;
    [key: string]: unknown;
  }>;
}

export const postModulesBatch = (
  params: TModuleBatchCreateRequest,
  projectId: string,
  unitId: string,
  optionId: string,
) => {
  return api.post<TModuleBatchCreateResponse>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules`,
    params,
  );
};
