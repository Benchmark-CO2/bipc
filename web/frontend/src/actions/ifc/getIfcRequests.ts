import api from "@/service/api";
import { TIfcProcessorRequestsResponse } from "@/types/ifc";

export const getIfcRequests = (clientId: string) => {
  return api.get<TIfcProcessorRequestsResponse>(`/v1/proxy/requests/${clientId}`);
};

