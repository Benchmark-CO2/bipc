import api from "@/service/api";

export const deleteOption = (
  projectId: string,
  unitId: string,
  optionId: string
) => {
  return api.delete(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}`
  );
};
