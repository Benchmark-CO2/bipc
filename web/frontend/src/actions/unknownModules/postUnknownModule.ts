import api from "@/service/api";
import {
  CreateUnknownModuleResponse,
  UnknownModuleSubmitPayload,
} from "@/types/unknownModules";

export const postUnknownModule = (
  projectId: string,
  unitId: string,
  optionId: string,
  payload: UnknownModuleSubmitPayload,
) =>
  api.post<CreateUnknownModuleResponse>(
    `/v1/projects/${projectId}/units/${unitId}/options/${optionId}/unknown-modules`,
    payload,
  );