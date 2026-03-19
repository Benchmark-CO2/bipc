import externalApi from "@/service/external-api";
import { useQuery } from "@tanstack/react-query";

interface IBGECity {
  id: number;
  nome: string;
}

export interface CityOption {
  value: string;
  label: string;
}

const useCities = (uf: string) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ibge-cities", uf],
    queryFn: async () => {
      const res = await externalApi.get<IBGECity[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
        { params: { orderBy: "nome" } },
      );
      return res.data.map<CityOption>((city) => ({
        value: city.nome,
        label: city.nome,
      }));
    },
    enabled: !!uf && uf.length === 2,
    staleTime: Infinity,
  });

  return {
    cities: data ?? [],
    isLoading,
    isError,
  };
};

export default useCities;
