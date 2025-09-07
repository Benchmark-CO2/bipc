import api from "@/service/api";
import { TOption } from "@/types/options";

export const postOption = (
  projectId: string,
  unitId: string,
  data: { name: string; active?: boolean }
) => {
  return api.post<{ tower_option: TOption }>(
    `/v1/projects/${projectId}/units/${unitId}/options`,
    data
  );
};

export const patchOption = (
  projectId: string,
  unitId: string,
  optionId: string,
  data: { name: string; active?: boolean }
) => {
  return api.patch<{ tower_option: TOption }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}`,
    data
  );
};
