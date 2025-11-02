import api from "@/service/api";
import { IDiscipline } from "./postDiscipline";
import { TRole } from "@/types/disciplines";

export const patchDiscipline = (
  projectId: string,
  roleId: string,
  disciplineParams: IDiscipline
) => {
  return api.patch<{ role: TRole }>(
    `/v1/projects/${projectId}/roles/${roleId}`,
    disciplineParams
  );
};
