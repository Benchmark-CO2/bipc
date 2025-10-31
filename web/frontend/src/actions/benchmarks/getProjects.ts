import api from '@/service/api';
import { IBenchmarkResponse } from './types';

export const getProjectsBenchmark = async (activeFilters: Record<string, string | string[] | number | undefined>) => {
  const stringFilters = Object.fromEntries(
    Object.entries(activeFilters).filter(([_key, value]) => value).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(',') : String(value)
    ])
  );
  return api.get<IBenchmarkResponse>(`/v1/benchmark/projects`, { params: stringFilters })
}