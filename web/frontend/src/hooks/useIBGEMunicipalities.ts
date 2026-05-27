import externalApi from "@/service/external-api";
import { rewindGeometry, STATE_CODES } from "@/utils/geoUtils";
import { useQuery } from "@tanstack/react-query";

export interface MunProperties { codarea: string; name?: string; }
export interface GeoFeature<P> { type: "Feature"; properties: P; geometry: unknown; }
export interface GeoCollection<P> { type: "FeatureCollection"; features: GeoFeature<P>[]; }

interface IBGEMunicipio { id: number; nome: string; }

async function fetchMunGeo(code: string): Promise<GeoCollection<MunProperties>> {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${code}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`;
  const res = await externalApi.get<GeoCollection<MunProperties>>(url);
  const json = res.data;
  for (const f of json.features) f.geometry = rewindGeometry(f.geometry);
  return json;
}

async function fetchMunNames(code: string): Promise<Map<string, string>> {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${code}/municipios`;
  const res = await externalApi.get<IBGEMunicipio[]>(url);
  return new Map(res.data.map((x) => [String(x.id), x.nome]));
}

export interface MunicipalitiesData {
  geo: GeoCollection<MunProperties>;
  nameMap: Map<string, string>;
}

/**
 * Fetches both the GeoJSON mesh and the municipality name list for a given
 * Brazilian state (by sigla). Results are cached indefinitely (staleTime: Infinity).
 */
export function useIBGEMunicipalities(sigla: string | null) {
  const code = sigla ? STATE_CODES[sigla] : undefined;

  const geoQuery = useQuery({
    queryKey: ["ibge-mun-geo", sigla],
    queryFn: () => fetchMunGeo(code!),
    enabled: !!code,
    staleTime: Infinity,
  });

  const namesQuery = useQuery({
    queryKey: ["ibge-mun-names", sigla],
    queryFn: () => fetchMunNames(code!),
    enabled: !!code,
    staleTime: Infinity,
  });

  const isLoading = geoQuery.isLoading || namesQuery.isLoading;
  const isError = geoQuery.isError || namesQuery.isError;

  const data: MunicipalitiesData | undefined =
    geoQuery.data && namesQuery.data
      ? { geo: geoQuery.data, nameMap: namesQuery.data }
      : undefined;

  return { data, isLoading, isError };
}
