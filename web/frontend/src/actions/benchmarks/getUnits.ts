import api from '@/service/api';
import { IBenchmarkResponse } from './types';

export const getUnitsBenchmark = async () => {
  return api.get<IBenchmarkResponse>(`/v1/benchmark/units`)
}