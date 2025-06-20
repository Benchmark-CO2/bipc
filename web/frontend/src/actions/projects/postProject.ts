import api from '@/service/api';
import { AddProjectFormSchema } from '@/validators/addProject.validator';

export const postProject = (projectParams: AddProjectFormSchema) => {
  const formData = new FormData()
  formData.append('name', projectParams.name)
  formData.append('description', projectParams.description ?? '')
  formData.append('city', projectParams.city)
  formData.append('state', projectParams.state ?? '')
  if (projectParams.image) formData.append('image', projectParams.image)
  
  return api.post<{ project_uuid: string; message: string }>('/projects', formData)
}
