import api from "@/service/api";
import { IProjectCollaborator } from "@/types/collaborators";

export const getProjectCollaborators = (projectId: string) => {
  return api.get<{ data: IProjectCollaborator }>(
    `/v1/projects/${projectId}/collaborators`
  );
};
