import api from "@/service/api";
import { TOption } from "@/types/options";

export const getOptions = (
  projectId: string,
  unitId: string,
  roleId: string
) => {
  return api.get<{ tower_options: TOption[] }>(
    `/v1/projects/${projectId}/units/${unitId}/roles/${roleId}/options`
  );
};
