import api from "@/service/api";
import { IProject } from "@/types/projects";

export const postDuplicateProject = (uuid: string) => {
  return api.post<{ project: IProject }>(`/v1/projects/${uuid}/duplicate`);
};
