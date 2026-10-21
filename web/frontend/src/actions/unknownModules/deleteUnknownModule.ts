import api from "@/service/api";

export const deleteUnknownModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  occurrenceId: string,
) => {
  return api.delete<{ message: string }>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/unknown-modules/${occurrenceId}`,
  );
};