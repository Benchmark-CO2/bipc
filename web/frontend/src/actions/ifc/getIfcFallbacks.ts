import api from "@/service/api";
import { TIfcProcessorFallbacksResponse } from "@/types/ifc";

export const getIfcFallbacks = () => {
  return api.get<TIfcProcessorFallbacksResponse>("/v1/proxy/fallbacks");
};
