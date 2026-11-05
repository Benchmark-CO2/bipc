import api from "@/service/api";
import { TIfcProcessorResultUnits } from "@/types/ifc";

export const getIfcResultUnits = (clientId: string, requestId: string) => {
  return api.get<TIfcProcessorResultUnits>(
    `/v1/proxy/request/result/units/${clientId}/${requestId}`,
  );
};
