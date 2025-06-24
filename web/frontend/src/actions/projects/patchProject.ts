import api from "@/service/api";
import { IProject } from "@/types/projects";
import { ProjectFormSchema } from "@/validators/projectForm.validador";

export const patchProject = (
  projectParams: ProjectFormSchema,
  uuid: string
) => {
  return api.patch<{ project: IProject }>(
    `/v1/projects/${uuid}`,
    projectParams
  );
};
