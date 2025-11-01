import api from "@/service/api";

interface IPostDiscipline {
  name: string;
  description?: string;
  simulation?: boolean;
  permissions_ids?: number[];
  users_ids?: string[];
}

export const postDiscipline = async (
  projectId: string,
  data: IPostDiscipline
) => {
  return api.post(`/v1/projects/${projectId}/roles`, data);
};
