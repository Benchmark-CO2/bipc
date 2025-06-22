import api from "@/service/api";
import { IProject } from "@/types/projects";
import { ProjectFormSchema } from "@/validators/projectForm.validador";

export const postProject = (projectParams: ProjectFormSchema) => {
  return api.post<{ project: IProject }>("/v1/projects", projectParams);
};
