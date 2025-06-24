import api from "@/service/api";
import { IUnit } from "@/types/units";
import { UnitFormSchema } from "@/validators/unitForm.validator";

export const postUnit = (unitParams: UnitFormSchema, projectId: string) => {
  return api.post<{ unit: IUnit }>(
    `/v1/projects/${projectId}/units`,
    unitParams
  );
};
