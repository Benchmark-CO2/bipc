import api from "@/service/api";
import { TIfcProcessorRequestListItem } from "@/types/ifc";

export const getIfcRequestStatus = (clientId: string, requestId: string) => {
  return api.get<TIfcProcessorRequestListItem>(
    `/v1/proxy/request/status/${clientId}/${requestId}`,
  );
};

