import api from "@/service/api";
import { TIfcProcessorCreateRequestResponse } from "@/types/ifc";

export interface PostIfcCreateRequestParams {
  manufacturer: string;
  version: string;
  file_name: string;
  file_hash: string;
  calculate_geometries?: boolean;
}

export const postIfcCreateRequest = (
  clientId: string,
  params: PostIfcCreateRequestParams,
) => {
  const query = new URLSearchParams({
    manufacturer: params.manufacturer,
    version: params.version,
    file_name: params.file_name,
    file_hash: params.file_hash,
    ...(params.calculate_geometries !== undefined && {
      calculate_geometries: params.calculate_geometries.toString(),
    }),
  });

  return api.post<TIfcProcessorCreateRequestResponse>(
    `/v1/proxy/request/${clientId}?${query.toString()}`,
  );
};

