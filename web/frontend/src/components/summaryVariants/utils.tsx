import {
  IBenchmarkResponse,
  IBenchmarkSeries,
  IBenchmarkSeriesPoint,
} from "@/actions/benchmarks/types";
import { IProject } from "@/types/projects";

export type SummaryBenchmarkPoint = {
  id: string;
  minId: string;
  maxId: string;
  y: number;
  min: number;
  max: number;
  label: string;
  floors?: string | number;
  technology?: string[];
};

export const normalizeBenchmarkSeries = (
  series?: IBenchmarkSeries | IBenchmarkSeriesPoint[] | undefined,
): SummaryBenchmarkPoint[] => {
  if (!series) return [];
  if (series instanceof Array && series.length > 0 && "value" in series[0]) return series as unknown as SummaryBenchmarkPoint[]; // Apenas para material, que já vem pareado e ordenado

  const sortByY = (a: IBenchmarkSeries["min"][number], b: IBenchmarkSeries["min"][number]) =>
    a.y - b.y;
  const minList = [...((series as IBenchmarkSeries).min || [])].sort(sortByY);
  const maxList = [...((series as IBenchmarkSeries).max || [])].sort(sortByY);
  const pairCount = Math.min(minList.length, maxList.length);

  return Array.from({ length: pairCount }, (_, index) => {
    const minItem = minList[index];
    const maxItem = maxList[index];

    return {
      id: minItem.id,
      minId: minItem.id,
      maxId: maxItem.id,
      y: minItem.y,
      min: minItem.value,
      max: maxItem.value,
      label: "",
      floors: minItem.floors ?? maxItem.floors,
      technology: minItem.technology ?? maxItem.technology,
    };
  });
};

export const stackData = <T extends IProject>(item: T[], data: IBenchmarkResponse) => {
  return (item || [])
    .map(({ id }) => {
      const project = item.find((p) => p.id === id);
      if (!project) return null;
      
      const co2Item = data.benchmark.co2.min.find((b) => b.id === id);
      const energyItem = data.benchmark.energy.min.find((b) => b.id === id);

      const co2 = co2Item ? co2Item.value : 0;
      const energy = energyItem ? energyItem.value : 0;

      return {
        id,
        label: project.name || project.group_name || '',
        co2,
        energy,
      };
    })
    .filter(Boolean);
};

export const barColors = "#FFE8A3";

export function recalculateY(points: {
  min: number, 
  max: number,
  id: string
}[], _xMin: number, _xMax: number): any[] {
  // Filtrar pontos que estão visíveis (com overlap no range)
  // const filtered = points.filter(p => {
  //   // Incluir pontos que têm qualquer overlap com o range visível
  //   return p.max >= xMin && p.min <= xMax;
  // });

  // if (filtered.length === 0) return points;

  // Ordenar por min para ter uma distribuição consistente
  const sorted = [...points].sort((a, b) => a.min - b.min);

  // Distribuir uniformemente entre 0 e 1
  // Usar (idx + 0.5) / length para centralizar os pontos
  return sorted.map((p, idx) => ({
    ...p,
    y: (idx + 0.5) / sorted.length
  }));
}
