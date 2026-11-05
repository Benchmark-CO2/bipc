import api from "@/service/api";

export const generateReport = (projectId: string) => {
  return api.get(`/v1/projects/${projectId}/screenshot`, {
    responseType: "blob",
  });
};
