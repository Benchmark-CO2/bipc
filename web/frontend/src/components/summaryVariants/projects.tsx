import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import EmissionsChart from '../charts/barChart';
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import Divider from '../ui/divider';
import { FilterTabs } from "../ui/filter-tabs";
import { useChartType } from "./hooks/useChartType";
import { normalizeBenchmarkSeries, recalculateY } from "./utils";

type ProjectsSummaryProps = {
  projects: any[];
  data: IBenchmarkResponse;
  someSelected: boolean;
  showProjectName?: boolean;
};

const ProjectsSummary = ({
  projects,
  data,
  someSelected,
  showProjectName = true,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const { t } = useTranslation();

  const filterProjects = projects.filter((el) => !!el.consumption);

  const managedData = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy" | "material"],
  ).map((el) => ({
    ...el,
    label: projects.find((f) => f.id === el.id)?.name || "",
  }));

  const newItems = filterProjects
    .filter((el) => !!el.consumption)
    .map((el) => {
      return {
        id: el.id,
        co2: {
          id: el.id,
          y: 0,
          min: el.consumption.total.co2_min,
          max: el.consumption.total.co2_max,
          label: el.name,
        },
        energy: {
          id: el.id,
          y: 0,
          min: el.consumption.total.energy_min,
          max: el.consumption.total.energy_max,
          label: el.name,
        },
        material: {
          id: el.id,
          y: 0,
          min: el.consumption.total.material,
          max: el.consumption.total.material,
          value: el.consumption.total.material,
          label: el.name,
        },
      };
    });

  const { isExpanded, isOpen } = useSummary();

  const stackedData = useMemo(
    () =>
      newItems.map((el) => ({
        id: el[type].id,
        label: el[type].label,
        co2: (el.co2.max + el.co2.min) / 2,
        energy: (el.energy.max + el.energy.min) / 2,
        material: el.material?.value
      })),
    [newItems, type],
  );

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  // ── Lógica Manual: Apenas limpa o gráfico se desmarcar tudo lá fora ──
  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects([]); // Limpa as seleções do gráfico
    }
    // Não fazemos auto-inserção. O usuário precisa marcar no gráfico ou na tab manualmente.
  }, [someSelected]);

  const [subTabs, setSubTabs] = useState<string>(t.summary.projects);
  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  };

  const newDataItems = [...managedData, ...(type !== "material" ? newItems.map((item) => item[type]) : [])];

  const minData = useMemo(() => newDataItems.map((d) => d.min ?? d.value ?? 0), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map((d) => d.max ?? d.value ?? 0), [newDataItems]);
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;

  const newData = recalculateY(
    newDataItems,
    minValue,
    maxValue,
  );

  const chartData = [
    { name: 'Torre A', parede: 16, fundacao: 5, cobertura: 3 },
    { name: 'Torre B', parede: 16, fundacao: 5, cobertura: 3 },
    { name: 'Residencial modelo', parede: 32, fundacao: 10, cobertura: 6 }
  ];

  // ── Lógica de Cálculo de P, C, V, R ──────────────────────────────────────────
  const pcvMetrics = useMemo(() => {
    if (!newData || newData.length === 0) {
      return { P: 0, C: 0, V: 0, R: 0, hasSelection: false };
    }

    // 1. Calcula o P (Percentil 5%) para os mínimos (C5%) e máximos (R5%)
    const sortedMin = [...newData].map((d) => d.min ?? d.value ?? 0).sort((a, b) => a - b);
    const sortedMax = [...newData].map((d) => d.max ?? d.value ?? 0).sort((a, b) => a - b);

    const p5Index = Math.floor(sortedMin.length * 0.05);
    const c5Value = sortedMin[Math.min(p5Index, sortedMin.length - 1)];
    const r5Value = sortedMax[Math.min(p5Index, sortedMax.length - 1)];

    const pValue = c5Value;

    // 2. Isola os projetos selecionados
    const activeItems = newData.filter(d => selectedProjects.includes(String(d.id)));

    if (activeItems.length === 0) {
      return { P: pValue, C: 0, V: 0, R: 0, hasSelection: false };
    }

    // 3. Tira a média de C e R caso haja múltiplos projetos selecionados
    const cValue = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
    const rValue = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;

    // 4. Calcula o V usando a fórmula V = (C5% - Cn) + (R5% - Rn) / 2
    let vValue = (c5Value - cValue) + (r5Value - rValue) / 2;

    // Fallback para média simples caso a fórmula resulte negativa
    if (vValue < 0) {
      vValue = (cValue + rValue) / 2;
    }

    return {
      P: pValue,
      C: cValue,
      V: vValue,
      R: rValue,
      hasSelection: true
    };
  }, [newData, selectedProjects]);

  // ── Lógica dos Dados da Esquerda (Valor de Ref. e Cenários) ────────────────
  const unitTotal = type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark = type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure[type] || "Kg/m²";

  const activeStacked = selectedProjects.length > 0
    ? stackedData.filter(d => selectedProjects.includes(String(d.id)))
    : stackedData;

  const currentDataItems = selectedProjects.length > 0
    ? newData.filter(d => selectedProjects.includes(String(d.id)))
    : newData;

  const totalRefValue = activeStacked.reduce(
    (acc, curr) => acc + ((curr[type as keyof typeof curr] as number) || 0), 0
  );
  const benchmarkRefValue = activeStacked.length > 0 ? totalRefValue / activeStacked.length : 0;

  const bestScenario = currentDataItems.length > 0
    ? Math.min(...currentDataItems.map(d => d.min ?? d.value ?? 0)) : 0;

  const worstScenario = currentDataItems.length > 0
    ? Math.max(...currentDataItems.map(d => d.max ?? d.value ?? 0)) : 0;
  // ─────────────────────────────────────────────────────────────────────────────

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div>
      <div className='flex justify-between gap-2 w-full'>
        <div className='border-1 border-secondary rounded-md flex p-2 box-border gap-4 max-md:gap-1 h-full'>
          <div className='flex flex-col'>
            <span className='text-secondary font-bold text-small max-md:text-xs'>
              Valor de Ref. - Total ({unitTotal})
            </span>
            <span className='text-xs'>{formatMetric(totalRefValue)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-secondary font-bold text-small max-md:text-xs'>
              Valor de Ref. - Benchmark ({unitBenchmark})
            </span>
            <span className='text-xs font-bold'>{formatMetric(benchmarkRefValue)}</span>
          </div>
        </div>
        <div className='flex gap-4 text-[16px] max-md:gap-2 max-md:text-xs'>
          <div className='text-md border-1 border-[#9F70DB] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#9F70DB] font-bold'>P</span>
            <span className='font-bold'>{formatMetric(pcvMetrics.P)}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#6C9EE0] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#6C9EE0] font-bold'>C</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.C) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-secondary rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-secondary font-bold'>V</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.V) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#E0756C] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#E0756C] font-bold'>R</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.R) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#72E06C] bg-[#E2F1C1] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-black font-bold'>B</span>
            <div className='flex flex-col'>
              <span className='font-bold text-xs'>Classificação</span>
              <span className='font-light text-neutral-400 text-xs'>N: {newData.length} projetos</span>
            </div>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className='flex gap-4'>
          <div className='w-1/3 flex-shrink-0 mt-3 flex flex-col'>
            <FilterTabs
              tabs={["co2", "energy", "material"]}
              onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
              selectedTab={type}
              fullWidth
              onSubTabSelect={(tab) => {
                if (tab === t.summary.projects) setSubTabs(tab);
                if (tab === t.card.selectAll || tab === t.summary.deselectAll)
                  selectAll();
              }}
              subTabs={[
                t.summary.projects,
                selectedProjects.length === projects.length
                  ? t.summary.deselectAll
                  : t.card.selectAll,
              ]}
              selectedSubTab={subTabs}
            />
            <div className='mt-2'>
              {ChartSelector}
            </div>
            <div className='flex gap-3'>
              <div className='border-1 border-[#6C9EE0] rounded-md w-1/2 p-3 flex flex-col box-border gap-2'>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#6C9EE0]'>Melhor cenário ({unitTotal})</span>
                  <span>-</span>
                </p>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#6C9EE0]'>Melhor cenário ({unitBenchmark})</span>
                  <span className='font-bold'>{formatMetric(bestScenario)}</span>
                </p>
              </div>
              <div className='border-1 border-[#E0756C] rounded-md w-1/2 p-3 flex flex-col box-border gap-2'>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#E0756C]'>Pior cenário ({unitTotal})</span>
                  <span>-</span>
                </p>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#E0756C]'>Pior cenário ({unitBenchmark})</span>
                  <span className='font-bold'>{formatMetric(worstScenario)}</span>
                </p>
              </div>
            </div>
            <Divider />
            <EmissionsChart data={chartData} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-4 pt-3">
            {chartType === "scatter" ? (
              <D3GradientRangeChart
                data={newData}
                selectedBars={selectedProjects}
                unit={unitsOfMeasure[type] || ""}
                totalProjects={managedData.length || newData.length}
                minData={minData}
                maxData={maxData}
                showBaseline={type !== "material"}
                showTop5Line={type !== "material"}
                showProcelScale
                showMaxCurve={type !== "material"}
                showMinCurve={type !== "material"}
                showMidCurve={type !== "material"}
                showProjectName={showProjectName}
                variant={type === "material" ? "cumulative" : "range"}
                xAxisLabel={t.benchmark.chartTypes[type === 'co2' || type === 'energy' ? 'cumulativeFraction' : 'material'][type === 'co2' ? 'xAxisLabelCarbon' : 'xAxisLabelEnergy']}
                yAxisLabel={t.benchmark.chartTypes[type === 'co2' || type === 'energy' ? 'cumulativeFraction' : 'material'].yAxisLabel}
                height={350}
              />
            ) : (
              <D3GradientRangeLineChart
                data={newData}
                selectedBars={selectedProjects}
                unit={type}
                showProjectName={showProjectName}
              />
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSummary;