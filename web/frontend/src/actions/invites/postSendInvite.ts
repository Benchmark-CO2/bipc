import api from "@/service/api";

export const postSendInvite = async (projectId: string, email: string) => {
  return api.post(`/v1/projects/${projectId}/invitations`, { email });
};
