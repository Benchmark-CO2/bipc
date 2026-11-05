import api from "@/service/api";
import { TIfcProcessorResultModules } from "@/types/ifc";

export const getIfcResultModules = (clientId: string, requestId: string) => {
  return api.get<TIfcProcessorResultModules>(
    `/v1/proxy/request/result/modules/${clientId}/${requestId}`,
  );
};
