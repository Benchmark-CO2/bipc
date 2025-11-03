import api from "@/service/api";
import { TCollaboratorInvite } from "@/types/collaborators";

export const getProjectInvites = async (projectId: string) => {
  return api.get<{ invitations: TCollaboratorInvite[] }>(
    `/v1/projects/${projectId}/pending-invitations`
  );
};
