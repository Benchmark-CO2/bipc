import api from "@/service/api";
import { TOption } from "@/types/options";

export const postOption = (
  projectId: string,
  unitId: string,
  roleId: string,
  data: { name: string; active?: boolean }
) => {
  return api.post<{ tower_option: TOption }>(
    `/v1/projects/${projectId}/units/${unitId}/roles/${roleId}/options`,
    data
  );
};
