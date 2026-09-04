import { getIfcResultModules } from "./getIfcResultModules";
import { getIfcResultUnits } from "./getIfcResultUnits";
import type { TIfcProcessorAggregatedResult } from "@/types/ifc";

export const getIfcRequestResult = async (
  clientId: string,
  requestId: string,
): Promise<{ data: TIfcProcessorAggregatedResult }> => {
  const [unitsRes, modulesRes] = await Promise.all([
    getIfcResultUnits(clientId, requestId),
    getIfcResultModules(clientId, requestId),
  ]);

  return {
    data: {
      units: unitsRes.data,
      modules: modulesRes.data.modules,
    },
  };
};
