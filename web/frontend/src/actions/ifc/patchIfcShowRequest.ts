import api from "@/service/api";
import { TIfcProcessorRequestListItem } from "@/types/ifc";

export const patchIfcShowRequest = (clientId: string, requestId: string) => {
  return api.patch<TIfcProcessorRequestListItem>(
    `/v1/proxy/request/${clientId}/${requestId}/show`,
  );
};
