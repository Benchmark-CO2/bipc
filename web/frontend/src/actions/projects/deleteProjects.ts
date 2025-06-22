import api from "@/service/api";

export const deleteProject = (projectId: string) => {
  return api.delete(`/v1/projects/${projectId}`);
};
