import api from '@/service/api';
import { IBenchmarkResponse } from './types';

export const getProjectsBenchmark = async () => {
  return api.get<IBenchmarkResponse>(`/v1/benchmark/projects`)
}