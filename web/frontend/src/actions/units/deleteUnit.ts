import api from "@/service/api";

export const deleteUnit = (projectId: string, unitId: string) => {
  return api.delete(`/v1/projects/${projectId}/units/${unitId}`);
};
