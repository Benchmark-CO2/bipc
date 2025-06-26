import api from '@/service/api';

export const postAddUserToProject = async (projectId: string, email: string, permissions: string[]) => {
  return api.post(`/v1/projects/${projectId}/assign-user`, { email, permissions })
}