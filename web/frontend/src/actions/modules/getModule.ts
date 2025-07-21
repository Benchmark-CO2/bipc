import api from "@/service/api";
import { TModuleStructure } from "@/types/modules";

export const getModule = (
  projectId: string,
  unitId: string,
  moduleId: string,
  type: "beam_column" | "concrete_wall" | "structural_masonry"
) => {
  return api.get<{ versions: TModuleStructure[] }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}?type=${type}`
  );
};
