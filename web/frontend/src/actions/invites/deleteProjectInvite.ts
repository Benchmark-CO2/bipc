import api from "@/service/api";

export const deleteProjectInvite = (projectId: string, inviteId: string) => {
  return api.delete(`/v1/projects/${projectId}/invitations/${inviteId}`);
};
