import api from "@/service/api";
import {
  ModuleParamsPropsV2,
  ModuleResponseMetaV2,
  ModuleUpdateRequestV2,
  TModuleDataV2,
} from "@/types/modules";
import { cleanZeroItemsBeforeSubmit } from "@/components/layout/drawer-form-module/aggregate-helpers";

export const patchModule = (
  moduleParams: ModuleParamsPropsV2,
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string,
) => {
  const payload: ModuleUpdateRequestV2 = {
    type: moduleParams.type,
    data: cleanZeroItemsBeforeSubmit(moduleParams.data as TModuleDataV2),
  };
  if (moduleParams.source !== undefined && moduleParams.source !== "") {
    payload.source = moduleParams.source;
  }
  return api.patch<{ module: ModuleUpdateRequestV2 & ModuleResponseMetaV2 }>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`,
    payload,
  );
};
