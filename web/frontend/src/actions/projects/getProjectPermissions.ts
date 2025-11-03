import api from "@/service/api";

export const getProjectPermissions = (projectId: string) => {
  return api.get<{ permissions: Array<string> }>(
    `/v1/projects/${projectId}/user/permissions`
  );
};
