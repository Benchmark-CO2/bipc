import {
  IBenchmarkResponse,
  IBenchmarkSeries,
  IBenchmarkSeriesPoint,
} from "@/actions/benchmarks/types";
import { en } from "@/i18n/translations/en";
import { ptBR, Translations } from "@/i18n/translations/pt-BR";
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

// Cores dos marcadores V / C / R / P (cards, legenda e gráfico)
export const MARKER_COLORS = { V: '#62A436', C: '#5B9BD5', R: '#E0756C', P: '#9F70DB' } as const;

// Cores das barras empilhadas por tecnologia (tokens do Figma em index.css).
// `bar`: cor do segmento; `label`: cor do valor (tom "genérico" da família, legível sobre fundo claro).
interface TechColor { bar: string; label: string }
const ESTRUTURA = 'var(--estrutura-generica)';
const FUNDACAO = 'var(--fundacao-generica)';
const TECH_COLORS: Record<string, TechColor> = {
  beam_column: { bar: 'var(--estrutura-viga-pilar-portico)', label: ESTRUTURA },
  concrete_wall: { bar: 'var(--estrutura-parede-de-concreto)', label: ESTRUTURA },
  structural_masonry: { bar: 'var(--estrutura-alvenaria-estrutural)', label: ESTRUTURA },
  raft_foundation: { bar: 'var(--fundacao-radier)', label: FUNDACAO },
  raft_piles_foundation: { bar: 'var(--fundacao-radier-estaqueado)', label: FUNDACAO },
  piles_foundation: { bar: 'var(--fundacao-estacas)', label: FUNDACAO },
  foundation: { bar: FUNDACAO, label: FUNDACAO },
  roof: { bar: 'var(--cobertura-generica)', label: 'var(--cobertura-generica)' },
  // Tela de edifício: barras por tipo de pavimento
  penthouse_floor: { bar: 'var(--cobertura-generica)', label: 'var(--cobertura-generica)' },
  standard_floor: { bar: 'var(--estrutura-viga-pilar-portico)', label: 'var(--estrutura-viga-pilar-portico)' },
  ground_floor: { bar: 'var(--fundacao-radier)', label: 'var(--fundacao-radier)' },
  basement_floor: { bar: 'var(--revestimento-generica)', label: 'var(--revestimento-generica)' },
  foundation_floor: { bar: FUNDACAO, label: FUNDACAO },
  Total: { bar: 'var(--vedos-generica)', label: 'var(--vedos-generica)' }, // pavimento sem tipo
};
const FALLBACK_TECH_COLOR: TechColor = { bar: 'var(--muted-foreground)', label: 'var(--muted-foreground)' };

// O gráfico recebe a categoria às vezes pela chave do backend, às vezes já traduzida
const TECH_ALIASES: Record<string, string> = Object.fromEntries(
  [ptBR.summaryUnits.categories, en.summaryUnits.categories, { concrete_wall: 'Parede de Concreto', foundation: 'Fundação', roof: 'Cobertura' }]
    .flatMap((labels) => Object.entries(labels).map(([key, label]) => [label, key])),
);

// Chave do backend (ex.: beam_column) a partir da chave ou do nome traduzido
export const getTechKey = (category: string): string => TECH_ALIASES[category] ?? category;

export const getTechColor = (category: string): TechColor =>
  TECH_COLORS[getTechKey(category)] ?? FALLBACK_TECH_COLOR;

// Nome exibido da categoria (tooltip e legenda das barras): tecnologias de t.modules.structureTypes,
// fundação/cobertura de t.summaryUnits.categories e pavimentos de t.floor; senão, a própria chave
export const getTechLabel = (category: string, t: Translations): string => {
  const key = getTechKey(category);
  const labels: Record<string, string> = {
    beam_column: t.modules.structureTypes.beamColumn,
    concrete_wall: t.modules.structureTypes.concreteWall,
    structural_masonry: t.modules.structureTypes.masonry,
    raft_foundation: t.modules.structureTypes.raftFoundation,
    piles_foundation: t.modules.structureTypes.pilesFoundation,
    raft_piles_foundation: t.modules.structureTypes.raftPilesFoundation,
    ...(t.summaryUnits.categories as Record<string, string>),
    penthouse_floor: t.floor.penthouse_floor,
    standard_floor: t.floor.standard_floor,
    ground_floor: t.floor.ground_floor,
    basement_floor: t.floor.basement_floor,
    foundation_floor: t.floor.foundation_floor,
    Total: t.summary.total,
  };
  return labels[key] ?? category;
};

// Categorias com algum valor nas linhas do gráfico de barras, na ordem fixa do mapa de cores
const TECH_ORDER = Object.keys(TECH_COLORS);
export const getChartCategories = (chartData: Record<string, unknown>[]): string[] => {
  const keys = new Set(
    chartData.flatMap((row) =>
      Object.entries(row)
        .filter(([k, v]) => k !== 'name' && k !== 'id' && Number(v) > 0)
        .map(([k]) => k),
    ),
  );
  const rank = (k: string) => { const i = TECH_ORDER.indexOf(getTechKey(k)); return i === -1 ? TECH_ORDER.length : i; };
  return [...keys].sort((a, b) => rank(a) - rank(b));
};

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