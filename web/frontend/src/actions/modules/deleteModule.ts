import api from "@/service/api";

export const deleteModule = (
  projectId: string,
  unitId: string,
  moduleId: string,
  type: "beam_column" | "concrete_wall" | "structural_masonry"
) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}?type=${type}`
  );
};
