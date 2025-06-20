import api from '@/service/api';
import { EditProjectFormSchema } from '@/validators/editProject.validator';

export const putProject = (projectParams: EditProjectFormSchema, uuid: string) => {
  // @ts-expect-error // projectPhase nao esta definido no banco
  delete projectParams.projectPhase;
  return api.put(`/projects/${uuid}`, projectParams)
}
