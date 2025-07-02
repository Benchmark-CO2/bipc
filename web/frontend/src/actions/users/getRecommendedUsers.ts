import api from '@/service/api';

export const getRecommendedUsers = async () => {
  return await api.get<{users: {email: string, name: string}[] }>(`/v1/users/suggest`)
}