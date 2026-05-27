import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useMemo } from "react";

export interface StateMapData {
  sigla: string;
  value: number;
  /** city name → value, used for municipality drill-down */
  cities?: Record<string, number>;
}

export interface BenchmarkMapResult {
  states: StateMapData[];
  /** Total unique projects (deduped by id) across min+max */
  totalCount: number;
  /** Projects with no `state` field — cannot be placed on the map */
  noStateCount: number;
}

/**
 * Transforma a resposta do benchmark em dados para o mapa por estado.
 * Conta quantos projetos (pontos únicos) existem por estado e por cidade.
 */
export function useBenchmarkMapData(
  response: { data?: IBenchmarkResponse } | undefined,
  type: "co2" | "energy",
): BenchmarkMapResult {
  return useMemo(() => {
    // Combina min + max e deduplica por id para contar projetos únicos
    const minSeries = response?.data?.benchmark?.[type]?.min ?? [];
    const maxSeries = response?.data?.benchmark?.[type]?.max ?? [];

    const seen = new Set<string>();
    const stateAccumulator = new Map<string, { count: number; cities: Record<string, number> }>();
    let noStateCount = 0;

    for (const point of [...minSeries, ...maxSeries]) {
      if (seen.has(point.id)) continue;
      seen.add(point.id);

      if (!point.state) {
        noStateCount++;
        continue;
      }

      const existing = stateAccumulator.get(point.state);
      if (existing) {
        existing.count += 1;
        if (point.city) existing.cities[point.city] = (existing.cities[point.city] ?? 0) + 1;
      } else {
        stateAccumulator.set(point.state, {
          count: 1,
          cities: point.city ? { [point.city]: 1 } : {},
        });
      }
    }

    const states = Array.from(stateAccumulator.entries()).map(([sigla, { count, cities }]) => ({
      sigla,
      value: count,
      cities,
    }));

    return { states, totalCount: seen.size, noStateCount };
  }, [response, type]);
}
