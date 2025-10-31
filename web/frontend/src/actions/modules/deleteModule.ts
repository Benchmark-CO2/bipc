import api from "@/service/api";

export const deleteModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  moduleId: string
) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/modules/${moduleId}`
  );
};
