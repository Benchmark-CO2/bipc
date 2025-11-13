import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { IProject } from "@/types/projects";

export const stackData = <T extends IProject>(item: T[], data: IBenchmarkResponse) => {
  return (item || [])
    .map(({ id }) => {
      const project = item.find((p) => p.id === id);
      if (!project) return null;
      
      const co2Item = data.benchmark.co2.find((b) => b.id === id);
      const energyItem = data.benchmark.energy.find((b) => b.id === id);

      const co2 = co2Item ? (co2Item.min + co2Item.max) / 2 : 0;
      const energy = energyItem ? (energyItem.min + energyItem.max) / 2 : 0;

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
}[], xMin: number, xMax: number): any[] {
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