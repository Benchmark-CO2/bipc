import api from '@/service/api';

export const getRecommendedUsers = async (projectId: string) => {
  try {
    const response = await api.get(`/projects/${projectId}/recommended-users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recommended users:', error);
    throw error;
  }
}