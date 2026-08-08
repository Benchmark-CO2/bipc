import api from "@/service/api";
import {
  ModuleParamsPropsV2,
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
  return api.patch<{ module: ModuleUpdateRequestV2 & { id?: string } }>(
    `/v2/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`,
    payload,
  );
};
