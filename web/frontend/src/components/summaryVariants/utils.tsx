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

/**
 * Calcula a classificação (A, B, C, D) baseada no valor do projeto contra o banco de dados.
 * @param projectValue O valor do projeto atual (ex: CO2 total ou por m²)
 * @param allProjectsValues Array com os valores de todos os projetos para comparação
 * @param lowerIsBetter Se true, valores menores recebem notas melhores (A). Padrão: true.
 */
export function calculateGrade(
  projectValue: number,
  allProjectsValues: number[],
  lowerIsBetter = true
): "A" | "B" | "C" | "D" {
  if (!allProjectsValues || allProjectsValues.length === 0) return "C"; // Fallback

  // Ordena os valores (Crescente se lowerIsBetter, Decrescente se não)
  const sortedValues = [...allProjectsValues].sort((a, b) => 
    lowerIsBetter ? a - b : b - a
  );

  // Descobre a posição do projeto atual no ranking
  const rank = sortedValues.filter(v => v <= projectValue).length;
  const percentile = rank / sortedValues.length;

  if (percentile <= 0.25) return "A"; // Top 25% melhores
  if (percentile <= 0.50) return "B"; // Entre 25% e 50%
  if (percentile <= 0.75) return "C"; // Entre 50% e 75%
  return "D";                         // Os 25% piores
}