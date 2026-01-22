import api from '@/service/api';

export const getTokenKey = async () => {
  return api.post<{api_key: string} | null>('/v1/tokens/api-key');
}