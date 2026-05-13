import api from '@/service/api';

export const generateReport = (projectId: string, _formData: {
  co2: File;
  energy: File;
}) => {
  const formData = new FormData();

  formData.append('co2', _formData.co2);
  formData.append('energy', _formData.energy);

  return api.post(`/v1/projects/${projectId}/report`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob',
  });
};