import api from "@/service/api";
import { castToGeometriesCalculationMode } from "@/utils/ifcStepper";
import {
  TGeometriesCalculationMode,
  TIfcProcessorCreateRequestResponse,
} from "@/types/ifc";

interface PostIfcCreateRequestBaseParams {
  file_name: string;
  file_hash: string;
}

export interface PostIfcCreateRequestIfcParams
  extends PostIfcCreateRequestBaseParams {
  file_type: "ifc";
  manufacturer: string;
  version: string;
  geometries_calculation_mode?: TGeometriesCalculationMode;
}

/** XLSX não usa software/versão (sem fallback) nem cálculo de geometrias. */
export interface PostIfcCreateRequestXlsxParams
  extends PostIfcCreateRequestBaseParams {
  file_type: "xlsx";
}

export type PostIfcCreateRequestParams =
  | PostIfcCreateRequestIfcParams
  | PostIfcCreateRequestXlsxParams;

export const postIfcCreateRequest = (
  clientId: string,
  params: PostIfcCreateRequestParams,
) => {
  const query = new URLSearchParams({
    file_type: params.file_type,
    file_name: params.file_name,
    file_hash: params.file_hash,
  });

  if (params.file_type === "ifc") {
    query.set("manufacturer", params.manufacturer);
    query.set("version", params.version);
    if (params.geometries_calculation_mode !== undefined) {
      const mode = castToGeometriesCalculationMode({
        geometries_calculation_mode: params.geometries_calculation_mode,
      });
      query.set("geometries_calculation_mode", mode.toString());
    }
  }

  return api.post<TIfcProcessorCreateRequestResponse>(
    `/v1/proxy/request/${clientId}?${query.toString()}`,
  );
};
