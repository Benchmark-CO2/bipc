import api from "@/service/api";
import { castToGeometriesCalculationMode } from "@/utils/ifcStepper";
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
  const mode =
    params.geometries_calculation_mode !== undefined
      ? castToGeometriesCalculationMode({
          geometries_calculation_mode: params.geometries_calculation_mode,
        })
      : undefined;
  const query = new URLSearchParams({
    manufacturer: params.manufacturer,
    version: params.version,
    file_name: params.file_name,
    file_hash: params.file_hash,
    ...(mode !== undefined && {
      geometries_calculation_mode: mode.toString(),
    }),
  });

  return api.post<TIfcProcessorCreateRequestResponse>(
    `/v1/proxy/request/${clientId}?${query.toString()}`,
  );
};
