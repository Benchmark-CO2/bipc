import api from "@/service/api";
import { TIfcProcessorCreateFallbackResponse } from "@/types/ifc";

export interface PostIfcCreateFallbackParams {
  manufacturer: string;
  version: string;
}

export const postIfcCreateFallback = (
  clientId: string,
  params: PostIfcCreateFallbackParams,
) => {
  const query = new URLSearchParams({
    manufacturer: params.manufacturer,
    version: params.version,
    client_id: clientId,
  });

  return api.post<TIfcProcessorCreateFallbackResponse>(
    `/v1/proxy/fallbacks/create?${query.toString()}`,
  );
};
