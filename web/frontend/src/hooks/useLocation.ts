import externalApi from '@/service/external-api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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


const useCep = () => {
  const [cep, setCep] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(cep || '');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(cep.replace(/\D/g, ''));
    }, 500);

    return () => clearTimeout(timeout);
  }, [cep]);

  const {data, isLoading, isPending, isError} = useQuery({
    queryKey: ['cep', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await externalApi.get<{data: Address}>(`https://brasilapi.com.br/api/cep/v2/${debouncedQuery}`);
      if (res.status !== 200) {
        throw new Error('Error fetching data');
      }
      return res.data;
    },
    enabled: debouncedQuery.length >= 8,
    retry: false,
    staleTime: Infinity
  });

  const handleSearch = (_cep: string) => {
    setCep(_cep);
  };

  return {
    data: {
      cep: debouncedQuery,
      ...data
    } as Address & {
      cep: string;
    },
    isLoading,
    isPending,
    isError,
    searchCep: handleSearch
  }
}

export default useCep;
// https://brasilapi.com.br/api/cep/v2/{cep}