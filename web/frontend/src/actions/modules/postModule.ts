import api from "@/service/api";
import {
  ModuleCreateRequestV2,
  ModuleParamsPropsV2,
  ModuleResponseMetaV2,
  TModuleDataV2,
} from "@/types/modules";
import { cleanZeroItemsBeforeSubmit } from "@/components/layout/drawer-form-module/aggregate-helpers";

export const postModule = (
  moduleParams: ModuleParamsPropsV2,
  projectId: string,
  unitId: string,
  optionId: string,
) => {
  const payload: ModuleCreateRequestV2 = {
    type: moduleParams.type,
    data: cleanZeroItemsBeforeSubmit(moduleParams.data as TModuleDataV2),
  };
  if (moduleParams.source !== undefined && moduleParams.source !== "") {
    payload.source = moduleParams.source;
  }
  return api.post<{ module: ModuleCreateRequestV2 & ModuleResponseMetaV2 }>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules`,
    payload,
  );
};
