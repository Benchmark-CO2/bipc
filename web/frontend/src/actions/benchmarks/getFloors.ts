import api from '@/service/api';
import { IBenchmarkResponse } from './types';

export const getFloorsBenchmark = async () => {
  return api.get<IBenchmarkResponse>(`/v1/benchmark/floors`)
}