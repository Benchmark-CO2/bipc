import api from "@/service/api";
import { IProject } from "@/types/projects";

export const getProjectByUUID = (projectId: string) => {
  return api.get<{ project: IProject }>(`/v1/projects/${projectId}`);
};
