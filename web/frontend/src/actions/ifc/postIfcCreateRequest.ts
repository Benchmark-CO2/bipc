import api from "@/service/api";
import {
  TGeometriesCalculationMode,
  TIfcProcessorCreateRequestResponse,
} from "@/types/ifc";

export interface PostIfcCreateRequestParams {
  manufacturer: string;
  version: string;
  file_name: string;
  file_hash: string;
  geometries_calculation_mode?: TGeometriesCalculationMode;
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
    ...(params.geometries_calculation_mode !== undefined && {
      geometries_calculation_mode: params.geometries_calculation_mode.toString(),
    }),
  });

  return api.post<TIfcProcessorCreateRequestResponse>(
    `/v1/proxy/request/${clientId}?${query.toString()}`,
  );
};

