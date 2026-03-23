import api from "@/service/api";
import { TOption } from "@/types/options";

export const duplicateOption = (
  projectId: string,
  unitId: string,
  optionId: string,
) => {
  return api.post<{ option: TOption }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/duplicate`,
  );
};
