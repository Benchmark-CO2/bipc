import api from "@/service/api";

export const getModule = (
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.get<{ response: any }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}`
  );
};
