import api from "@/service/api";
import { ProjectFormSchema } from "@/validators/project.validador";

export const postProject = (projectParams: ProjectFormSchema) => {
  return api.post<{ project_uuid: string; message: string }>(
    "/v1/projects",
    projectParams
  );
};
