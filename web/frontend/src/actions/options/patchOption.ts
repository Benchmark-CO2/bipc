import api from "@/service/api";
import { TOption } from "@/types/options";

export const patchOption = (
  projectId: string,
  unitId: string,
  optionId: string,
  data: { name?: string; active?: boolean }
) => {
  return api.patch<{ option: TOption }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}`,
    data
  );
};
