import api from "@/service/api";
import { IUnit } from "@/types/units";
import { UnitFormSchema } from "@/validators/unitForm.validator";

export const patchUnit = (
  unitParams: UnitFormSchema,
  projectId: string,
  unitId: string
) => {
  // Remove o campo 'type' do payload para update
  const { type, ...updatePayload } = unitParams;

  return api.patch<{ unit: IUnit }>(
    `/v1/projects/${projectId}/units/${unitId}`,
    updatePayload
  );
};
