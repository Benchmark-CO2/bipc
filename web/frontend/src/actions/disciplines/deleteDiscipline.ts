import api from "@/service/api";

export const deleteDiscipline = (projectId: string, roleId: string) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/roles/${roleId}`
  );
};
