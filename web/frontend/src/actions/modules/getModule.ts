import api from "@/service/api";
import { TSimulation } from '@/types/projects';

export const getModule = (
  projectId: string,
  unitId: string,
  moduleId: string
) => {
  return api.get<{ versions: TSimulation[] }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}`
  );
};
