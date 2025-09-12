import api from '@/service/api';

export const patchModuleName = (moduleName: string) => {
  return api.patch(`/v1/modules/name`, { moduleName });
};