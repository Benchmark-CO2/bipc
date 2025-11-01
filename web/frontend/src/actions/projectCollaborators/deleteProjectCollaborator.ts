import api from "@/service/api";

export const deleteProjectCollaborator = (
  projectId: string,
  collaboratorId: string
) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/collaborators/${collaboratorId}`
  );
};
