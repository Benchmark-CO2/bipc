import api from "@/service/api";
import { TIfcProcessorRequestsResponse } from "@/types/ifc";

export const getIfcRequestsAll = (clientId: string) => {
  return api.get<TIfcProcessorRequestsResponse>(
    `/v1/proxy/request/${clientId}/all`,
  );
};
