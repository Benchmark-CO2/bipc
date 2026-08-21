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

export function recalculateY(
  // Atualizei a tipagem para aceitar 'value' também, já que material usa isso
  points: { min?: number; max?: number; value?: number; id: string }[], 
  _xMin: number, 
  _xMax: number
): any[] {
  
  // 1. Função segura para pegar o valor de X (igual você fez no componente principal)
  const getSafeValue = (p: any) => p.min ?? p.value ?? 0;

  // 2. Ordenamos o array garantindo que não teremos NaN
  const sorted = [...points].sort((a, b) => getSafeValue(a) - getSafeValue(b));
  
  // 3. Calculamos a fração cumulativa (Y) com o array corretamente ordenado
  return sorted.map((p, idx) => ({
    ...p,
    y: (idx + 0.5) / sorted.length
  }));
}