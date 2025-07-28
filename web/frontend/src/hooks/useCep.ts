import externalApi from "@/service/external-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface Address {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location: {
    type: "Point";
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

interface State {
  id: number;
  sigla: string;
  nome: string;
  regiao: {
    id: number;
    sigla: string;
    nome: string;
  };
}

interface City {
  nome: string;
  codigo_ibge: string;
}

const useCep = () => {
  const [cep, setCep] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(cep || "");

  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const findCityMatch = (cityNameFromCep: string, citiesList: City[]) => {
    const normalizedCepCity = normalizeString(cityNameFromCep);
    return citiesList.find(
      (city) => normalizeString(city.nome) === normalizedCepCity
    );
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(cep.replace(/\D/g, ""));
    }, 500);

    return () => clearTimeout(timeout);
  }, [cep]);

  const {
    data: cepData,
    isLoading: isLoadingCep,
    isPending: isPendingCep,
    isError: isErrorCep,
  } = useQuery({
    queryKey: ["cep", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await externalApi.get<Address>(
        `https://brasilapi.com.br/api/cep/v2/${debouncedQuery}`
      );
      if (res.status !== 200) {
        throw new Error("Error fetching data");
      }
      console.log(res.data);
      return res.data;
    },
    enabled: debouncedQuery.length >= 8,
    retry: false,
    staleTime: Infinity,
  });

  const {
    data: statesData,
    isLoading: isLoadingStates,
    isError: isErrorStates,
  } = useQuery({
    queryKey: ["states"],
    queryFn: async () => {
      const res = await externalApi.get<State[]>(
        "https://brasilapi.com.br/api/ibge/uf/v1"
      );
      if (res.status !== 200) {
        throw new Error("Error fetching states");
      }
      return res.data;
    },
    staleTime: Infinity,
  });

  const {
    data: citiesData,
    isLoading: isLoadingCities,
    isError: isErrorCities,
  } = useQuery({
    queryKey: ["cities", selectedState],
    queryFn: async () => {
      if (!selectedState) return [];
      const res = await externalApi.get<City[]>(
        `https://brasilapi.com.br/api/ibge/municipios/v1/${selectedState}`
      );
      if (res.status !== 200) {
        throw new Error("Error fetching cities");
      }
      return res.data;
    },
    enabled: !!selectedState,
    staleTime: Infinity,
  });

  const handleSearch = (_cep: string) => {
    setCep(_cep);
  };

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode);
  };

  return {
    cepData: {
      cep: debouncedQuery,
      ...cepData,
    } as Address & {
      cep: string;
    },
    isLoadingCep,
    isPendingCep,
    isErrorCep,
    searchCep: handleSearch,
    statesData: statesData || [],
    isLoadingStates,
    isErrorStates,
    citiesData: citiesData || [],
    isLoadingCities,
    isErrorCities,
    selectedState,
    handleStateChange,
    findCityMatch,
  };
};

export default useCep;
// https://brasilapi.com.br/api/cep/v2/{cep}
