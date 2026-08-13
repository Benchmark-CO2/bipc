import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { ChartLegend } from './components/chartLegend';
import { ScenarioCard } from './components/indicatorItem';
import { IndicatorList } from './components/indicatorsList';
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
  const { isExpanded, isOpen } = useSummary();

  const filterProjects = useMemo(() =>
    projects.filter((el) => !!el.consumption),
    [projects]);

  const newItems = useMemo(() => {
    return filterProjects.map((el) => {
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
  }, [filterProjects]);

  const stackedData = useMemo(() =>
    newItems.map((el) => ({
      id: el[type].id,
      label: el[type].label,
      co2: (el.co2.max + el.co2.min) / 2,
      energy: (el.energy.max + el.energy.min) / 2,
      material: el.material?.value
    })),
    [newItems, type]);

  // ── Lógica Centralizada: Calcula os dados e o PCV para TODOS os tipos ──
  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

    types.forEach((t) => {
      // 1. Prepara managedData
      const managedData = normalizeBenchmarkSeries(
        data.benchmark?.[t],
      ).map((el) => ({
        ...el,
        label: projects.find((f) => f.id === el.id)?.name || "",
      }));

      // 2. Prepara newDataItems
      const typeNewItems = t !== "material" ? newItems.map((item) => item[t]) : [];
      const newDataItems = [...managedData, ...typeNewItems];

      // 3. Descobre min/max para recalcular o Y
      const minDataArr = newDataItems.map((d) => d.min ?? d.value ?? 0);
      const maxDataArr = newDataItems.map((d) => d.max ?? d.value ?? 0);
      const minValue = minDataArr.length ? Math.min(...minDataArr) : 0;
      const maxValue = maxDataArr.length ? Math.max(...maxDataArr) : 0;

      const newData = recalculateY(newDataItems, minValue, maxValue);

      // 4. Calcula PCV
      let P = 0, C = 0, V = 0, R = 0, hasSelection = false;

      if (newData && newData.length > 0) {
        const sortedMin = [...newData].map((d) => d.min ?? d.value ?? 0).sort((a, b) => a - b);
        const sortedMax = [...newData].map((d) => d.max ?? d.value ?? 0).sort((a, b) => a - b);

        const p5Index = Math.floor(sortedMin.length * 0.05);
        const c5Value = sortedMin[Math.min(p5Index, sortedMin.length - 1)];
        const r5Value = sortedMax[Math.min(p5Index, sortedMax.length - 1)];

        P = c5Value;

        const activeItems = newData.filter(d => selectedProjects.includes(String(d.id)));

        if (activeItems.length > 0) {
          hasSelection = true;
          C = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
          R = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;

          V = (c5Value - C) + (r5Value - R) / 2;

          if (V < 0) {
            V = (C + R) / 2; // Fallback
          }
        }
      }

      // 5. Salva no dicionário de resultados
      result[t] = {
        managedData,
        newData,
        minData: minDataArr,
        maxData: maxDataArr,
        pcvMetrics: { P, C, V, R, hasSelection }
      };
    });

    return result;
  }, [data.benchmark, projects, newItems, selectedProjects]);

  // ── Extração dos dados da tab/tipo atual para uso nos gráficos ──
  const {
    managedData,
    newData,
    minData,
    maxData,
    pcvMetrics
  } = processedData[type];

  // ── (NOVO) Aqui estão os PCVs de todos os tipos prontos para quando isOpen for true ──
  const allPcvMetrics = {
    co2: processedData.co2.pcvMetrics,
    energy: processedData.energy.pcvMetrics,
    material: processedData.material.pcvMetrics,
  };

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects([]);
    }
  }, [someSelected]);

  const [subTabs, setSubTabs] = useState<string>(t.summary.projects);

  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  };

  // ── Lógica dos Dados da Esquerda (Valor de Ref. e Cenários) ────────────────
  const unitTotal = type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark = type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure[type] || "Kg/m²";

  const activeStacked = selectedProjects.length > 0
    ? stackedData.filter(d => selectedProjects.includes(String(d.id)))
    : stackedData;

  const currentDataItems = selectedProjects.length > 0
    ? newData.filter((d: any) => selectedProjects.includes(String(d.id)))
    : newData;

  const totalRefValue = activeStacked.reduce(
    (acc, curr) => acc + ((curr[type as keyof typeof curr] as number) || 0), 0
  );

  const benchmarkRefValue = activeStacked.length > 0 ? totalRefValue / activeStacked.length : 0;

  const bestScenario = currentDataItems.length > 0
    ? Math.min(...currentDataItems.map((d: any) => d.min ?? d.value ?? 0)) : 0;

  const worstScenario = currentDataItems.length > 0
    ? Math.max(...currentDataItems.map((d: any) => d.max ?? d.value ?? 0)) : 0;
  // ─────────────────────────────────────────────────────────────────────────────

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div>
      <div className='flex justify-between gap-2 w-full'>
        {!isOpen && <div className='border-1 border-secondary rounded-md flex p-2 box-border gap-4 max-md:gap-1 h-full'>
          <div className='flex flex-col'>
            <span className='text-secondary font-semibold text-small max-md:text-xs'>
              Valor de Ref. - Total ({unitTotal})
            </span>
            <span className='text-xs'>{formatMetric(totalRefValue)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-secondary font-semibold text-small max-md:text-xs'>
              Valor de Ref. - Benchmark ({unitBenchmark})
            </span>
            <span className='text-xs font-bold'>{formatMetric(benchmarkRefValue)}</span>
          </div>
        </div>}
        <div className='flex gap-4 text-[16px] max-md:gap-2 max-md:text-xs'>
          {/* Exibindo as métricas da TAB atual (você pode usar allPcvMetrics aqui caso isOpen seja true e queira mostrar todos) */}
          {!isOpen && <IndicatorList indicators={[
            { color: '#9F70DB', currentUnit, value: formatMetric(pcvMetrics.P), label: 'P' },
            { color: '#6C9EE0', currentUnit, value: formatMetric(pcvMetrics.C), label: 'C' },
            { color: '#E0756C', currentUnit, value: formatMetric(pcvMetrics.R), label: 'R' },
          ]} />}

          {!isOpen && (<div className='text-md border-1 border-[#72E06C] bg-[#E2F1C1] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-black font-bold'>B</span>
            <div className='flex flex-col'>
              <span className='font-bold text-xs'>Classificação</span>
              <span className='font-light text-neutral-400 text-xs'>N: {newData.length} projetos</span>
            </div>
          </div>)}
        </div>
        {
          isOpen && (
            <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">

              <ScenarioCard
                letter="V"
                title={t.summary.chartLegend.referenceValue}
                color="#62A436" // Verde
                items={[
                  { total: "211.205,95", benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                  { total: "112.548,60", benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                  { total: "561,06", benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
                ]}
              />

              <ScenarioCard
                letter="C"
                title={t.summary.chartLegend.constructionMitigationPotential}
                color="#5B9BD5" // Azul
                items={[
                  { total: "162.707,40", benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                  { total: "86.819,86", benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                  { total: "432,02", benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
                ]}
              />

              <ScenarioCard
                letter="R"
                title={t.summary.chartLegend.projectMitigationPotential}
                color="#E0756C" // Vermelho
                items={[
                  { total: "314.193,60", benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                  { total: "167.476,41", benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                  { total: "833,17", benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
                ]}
              />

              <ScenarioCard
                letter="P"
                title={t.summary.chartLegend.riskOfLowerConstructionMitigation}
                color="#9F70DB" // Roxo
                items={[
                  { total: "81.353,70", benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                  { total: "43.341,90", benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                  { total: "216,00", benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
                ]}
              />
            </div>
          )
        }
      </div>
      {isOpen && (
        <div className='flex gap-4'>
          <div className='w-1/3 flex-shrink-0 mt-3 flex flex-col'>


            {/* <div className='flex gap-3'>
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
            </div> */}
            {/* <Divider /> */}
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-0 pt-3">
            <div className='flex gap-2 justify-end items-center'>
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                fullWidth
                onSubTabSelect={(tab) => {
                  if (tab === t.summary.projects) setSubTabs(tab);
                  if (tab === t.card.selectAll || tab === t.summary.deselectAll) selectAll();
                }}
                subTabs={[
                  t.summary.projects,
                  selectedProjects.length === projects.length ? t.summary.deselectAll : t.card.selectAll,
                ]}
                selectedSubTab={subTabs}
              />
              <div className='mt-2 w-full'>
                {ChartSelector}
              </div>
            </div>
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
            <ChartLegend />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSummary;