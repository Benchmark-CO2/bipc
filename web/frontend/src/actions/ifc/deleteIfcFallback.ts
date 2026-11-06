import api from "@/service/api";
import { TIfcProcessorDeleteFallbackResponse } from "@/types/ifc";

export const deleteIfcFallback = (manufacturer: string, version: string) => {
  return api.delete<TIfcProcessorDeleteFallbackResponse>(
    `/v1/proxy/fallbacks/${encodeURIComponent(manufacturer)}/${encodeURIComponent(version)}`,
  );
};
