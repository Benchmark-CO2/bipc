import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslation } from "@/i18n";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { Button } from "../ui/button";
import { FilterTabs } from "../ui/filter-tabs";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarsLegend } from './components/BarsLegend';
import { ChartLegend } from './components/chartLegend';
import { ClassificationCard } from './components/classificationCard';
import { EmissionsSection } from './components/emissionSection';
import { ScenarioCard } from './components/indicatorItem';
import { useChartType } from "./hooks/useChartType";
import { useElementHeight } from './hooks/useElementHeight';
import { calculateGrade, MARKER_COLORS, normalizeBenchmarkSeries, recalculateY } from "./utils";

export const getCategoryValue = (categoryData: any, currentType: "co2" | "energy" | "material") => {
  if (!categoryData) return 0;
  if (currentType === "material") return categoryData.material || 0;

  const min = categoryData?.[`${currentType}_min`] || 0;
  const max = categoryData?.[`${currentType}_max`] || 0;

  return (min + max) / 2; // Usando a média geométrica
};

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
  const { t } = useTranslation();
  const { isOpen, isFullScreen } = useSummary();

  const filterProjects = useMemo(() =>
    projects.filter((el) => !!el.consumption),
    [projects]);

  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);

  const [selectedProjects, setSelectedProjects] = useState<string[]>(["total"]);

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

  const portfolioAverage = useMemo(() => {
    const totalConsumption: Record<string, any> = {
      total: { co2_min: 0, co2_max: 0, energy_min: 0, energy_max: 0, material: 0 }
    };

    const projectCount = filterProjects.length || 1;

    filterProjects.forEach(proj => {
      if (proj.consumption) {
        Object.entries(proj.consumption).forEach(([key, values]: [string, any]) => {
          if (!totalConsumption[key]) {
            totalConsumption[key] = { co2_min: 0, co2_max: 0, energy_min: 0, energy_max: 0, material: 0 };
          }

          totalConsumption[key].co2_min += (values.co2_min || 0);
          totalConsumption[key].co2_max += (values.co2_max || 0);
          totalConsumption[key].energy_min += (values.energy_min || 0);
          totalConsumption[key].energy_max += (values.energy_max || 0);
          totalConsumption[key].material += (values.material || 0);
        });
      }
    });

    Object.keys(totalConsumption).forEach(key => {
      totalConsumption[key].co2_min /= projectCount;
      totalConsumption[key].co2_max /= projectCount;
      totalConsumption[key].energy_min /= projectCount;
      totalConsumption[key].energy_max /= projectCount;
      totalConsumption[key].material /= projectCount;
    });

    return totalConsumption;
  }, [filterProjects]);

  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};
    // Lido antes do forEach, cujo parâmetro `t` esconde o `t` das traduções
    const totalLabel = t.summary.total;

    types.forEach((t) => {
      const managedData = normalizeBenchmarkSeries(
        data.benchmark?.[t],
      ).map((el) => ({
        ...el,
        label: projects.find((f) => f.id === el.id)?.name || "",
      }));

      const typeNewItems = newItems.map((item) => item[t]);

      let projectTotalItem = null;
      if (portfolioAverage?.total) {
        projectTotalItem = {
          id: "total",
          y: 0,
          label: totalLabel,
          ...(t === "material"
            ? {
              value: portfolioAverage.total.material || 0,
              min: portfolioAverage.total.material || 0,
              max: portfolioAverage.total.material || 0,
            }
            : {
              min: portfolioAverage.total[`${t}_min`] || 0,
              max: portfolioAverage.total[`${t}_max`] || 0,
            }
          )
        };
      }

      const newDataItems = projectTotalItem
        ? [...managedData, ...typeNewItems, projectTotalItem]
        : [...managedData, ...typeNewItems];

      const minDataArr = newDataItems.map((d) => d.min ?? d.value ?? 0);
      const maxDataArr = newDataItems.map((d) => d.max ?? d.value ?? 0);
      const minValue = minDataArr.length ? Math.min(...minDataArr) : 0;
      const maxValue = maxDataArr.length ? Math.max(...maxDataArr) : 0;

      const newData = recalculateY(newDataItems, minValue, maxValue);

      let P = 0, C = 0, V = 0, R = 0, hasSelection = false;

      if (newData && newData.length > 0) {
        const sortedMin = [...newData].map((d) => d.min ?? d.value ?? 0).sort((a, b) => a - b);
        const sortedMax = [...newData].map((d) => d.max ?? d.value ?? 0).sort((a, b) => a - b);

        const p5Index = Math.floor(sortedMin.length * 0.05);
        const c5Value = sortedMin[Math.min(p5Index, sortedMin.length - 1)];
        const r5Value = sortedMax[Math.min(p5Index, sortedMax.length - 1)];

        P = c5Value;

        let activeItems = newData.filter(d => selectedProjects.includes(String(d.id)) && String(d.id) !== "total");

        if (activeItems.length === 0 && selectedProjects.includes("total")) {
          activeItems = newData.filter(d => String(d.id) === "total");
        }

        if (activeItems.length > 0) {
          hasSelection = true;
          C = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
          R = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;

          V = (c5Value - C) + (r5Value - R) / 2;

          if (V < 0) {
            V = (C + R) / 2;
          }
        }
      }

      result[t] = {
        managedData,
        newData,
        minData: minDataArr,
        maxData: maxDataArr,
        pcvMetrics: { P, C, V, R, hasSelection }
      };
    });

    return result;
  }, [data.benchmark, projects, newItems, selectedProjects, filterProjects, portfolioAverage, t]);

  const {
    managedData,
    newData,
    minData,
    maxData,
  } = processedData[type];

  const allPcvMetrics = {
    co2: processedData.co2.pcvMetrics,
    energy: processedData.energy.pcvMetrics,
    material: processedData.material.pcvMetrics,
  };

  const benchmarkMax = useMemo(() => {
    const getMax = (typeKey: "co2" | "energy" | "material") => {
      const series = normalizeBenchmarkSeries(data?.benchmark?.[typeKey]) || [];
      if (!series || series.length === 0) return 0;
      if (typeKey === "material") {
        return Math.max(...series.map((d: any) => d.value ?? d.material ?? 0), 0);
      }
      return Math.max(...series.map((d: any) => d.max ?? d[`${typeKey}_max`] ?? 0), 0);
    };

    return {
      co2: getMax("co2"),
      energy: getMax("energy"),
      material: getMax("material"),
    };
  }, [data?.benchmark]);

  const onChangeProjectSelection = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, projectId]);
    } else {
      setSelectedProjects((prev) => prev.filter((id) => id !== projectId));
    }
  };

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(["total"]);
    }
  }, [someSelected]);

  const allPossibleIds = ["total", ...filterProjects.map((p) => p.id)];

  const selectAll = () => {
    if (selectedProjects.length >= allPossibleIds.length) {
      setSelectedProjects([]); 
    } else {
      setSelectedProjects(allPossibleIds);
    }
  };

  const projectEmissionsData = useMemo(() => {
    if (!filterProjects) return [];

    const buildChartData = (consumption: any) => {
      if (!consumption) return [];

      const co2Row: Record<string, any> = { name: t.benchmark.chartTypes.emission.co2Label, id: 'co2' };
      const energyRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.energyLabel, id: 'energy' };
      const materialRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.materialLabel, id: 'material' };
      Object.entries(consumption).forEach(([key, values]) => {
        if (key !== "total") {
          const techName = key; // chave do backend; o nome é traduzido na exibição (getTechLabel)
          co2Row[techName] = getCategoryValue(values, "co2");
          energyRow[techName] = getCategoryValue(values, "energy");
          materialRow[techName] = getCategoryValue(values, "material");
        }
      });

      return [co2Row, energyRow, materialRow];
    };

    const result = [];

    result.push({
      id: "total",
      title: t.summary.total,
      isTotal: true,
      isChecked: selectedProjects.includes("total"),
      chartData: buildChartData(portfolioAverage)
    });

    filterProjects.forEach((proj) => {
      result.push({
        id: proj.id,
        title: proj.name,
        isTotal: false,
        isChecked: selectedProjects.includes(proj.id),
        chartData: buildChartData(proj.consumption)
      });
    });

    return result;
  }, [filterProjects, selectedProjects, portfolioAverage, t]);

  let activeProjectsForArea = filterProjects.filter(p => selectedProjects.includes(p.id));

  if (activeProjectsForArea.length === 0 && selectedProjects.includes("total")) {
    activeProjectsForArea = filterProjects;
  } else if (activeProjectsForArea.length === 0) {
    activeProjectsForArea = filterProjects;
  }

  const totalArea = activeProjectsForArea.reduce((acc, curr) =>
    acc + (Number(curr.area) || Number(curr.built_area) || 1), 0
  );

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  const currentGrade = calculateGrade(allPcvMetrics.co2.V, newData.map(el => (el.max + el.min) / 2));
  const totalProjectsCount = newData.length;
  
  const { ref: elementRef } = useElementHeight<HTMLDivElement>();
  const { ref: elementRef2, height: elementHeight2 } = useElementHeight<HTMLDivElement>();
  
  const [val, setVal] = useState('stacked_bar');
  const isMobile = useIsMobile();

  return (
    // CONTÊINER PRINCIPAL: Trava em 80vh, organiza em coluna e previne qualquer scroll global da área.
    <div ref={elementRef} className='h-[80vh] flex flex-col overflow-hidden pb-4'>
      
      {/* CABEÇALHO (Cards): shrink-0 garante que ele nunca diminua seu próprio tamanho para ceder espaço */}
      <div className="@container/cards shrink-0 flex justify-between gap-2 w-full">
        <div className="flex items-start gap-4 @max-[110rem]/cards:gap-3 w-full min-w-0 pt-3 pb-2 max-sm:overflow-x-auto">
          <div className="flex flex-col gap-1.5 text-sm font-bold text-right text-neutral-800 pl-2 shrink-0">
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mt-2.75">Benchmark</span>
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mb-1">Total</span>
          </div>

          <div className="flex flex-wrap max-sm:flex-nowrap gap-4 @max-[110rem]/cards:gap-3 w-full min-w-0 flex-1">
            <ScenarioCard
              letter="V" showUnits
              title={t.summary.chartLegend.referenceValue_short}
              color={MARKER_COLORS.V} // Verde
              items={[
                { total: formatMetric(allPcvMetrics.co2.V * totalArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.V * totalArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.V * totalArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />

            <ScenarioCard
              letter="C"
              title={t.summary.chartLegend.constructionMitigationPotential_short}
              color={MARKER_COLORS.C} // Azul
              items={[
                { total: formatMetric(allPcvMetrics.co2.C * totalArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.C * totalArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                // { total: formatMetric(allPcvMetrics.material.C * totalArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />

            <ScenarioCard
              letter="R"
              title={t.summary.chartLegend.riskOfLowerConstructionMitigation_short}
              color={MARKER_COLORS.R} // Vermelho
              items={[
                { total: formatMetric(allPcvMetrics.co2.R * totalArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.R * totalArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                // { total: formatMetric(allPcvMetrics.material.R * totalArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />

            <ScenarioCard
              letter="P"
              title={t.summary.chartLegend.projectMitigationPotential_short}
              color={MARKER_COLORS.P} // Roxo
              items={[
                { total: formatMetric(allPcvMetrics.co2.P * totalArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.P * totalArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.P * totalArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ClassificationCard
              grade={currentGrade}
              totalProjects={totalProjectsCount}
            />
          </div>
        </div>
      </div>

      {isFullScreen && (
        // CONTÊINER DE CORPO (Full Screen): flex-1 min-h-0 garante que absorva todo espaço que sobrou e não passe dele
        <div className='flex-1 min-h-0 flex gap-4 max-sm:gap-2 max-sm:flex-col max-sm:p-2 overflow-hidden mt-5 max-sm:mt-2'>
          
          {/* COLUNA ESQUERDA (Emissões): Caso o conteúdo seja muito longo, um pequeno overflow-y-auto apenas nele permite não quebrar o layout geral */}
          <div className='w-1/3 shrink-0 flex flex-col min-h-0 max-sm:w-full overflow-y-auto pr-2'>
            <div className="shrink-0 flex flex-wrap justify-end gap-2 items-end">
              <div className="flex flex-col gap-1 min-w-44 flex-1">
                <Label className="text-sm font-normal text-muted-foreground">{t.summary.visualization}</Label>
                <Select onValueChange={setVal} value={val} defaultValue='stacked_bar'>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t.summary.placeholders.chartType} />
                  </SelectTrigger>
                  <SelectContent>
                    {[{id: 'stacked_bar', label: t.summary.chartType.stackedBar}].map(({id, label}) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={selectAll}
                className="h-9 shrink-0 rounded-full border-primary text-primary hover:text-primary"
              >
                {selectedProjects.length >= allPossibleIds.length ? t.summary.deselectAll : t.card.selectAll}
              </Button>
            </div>
            <div className="mt-2 flex-1">
              <EmissionsSection
                data={projectEmissionsData}
                selected={selectedProjects}
                onChange={onChangeProjectSelection}
                benchmarkMax={benchmarkMax}
              />
            </div>
            <div className="shrink-0 mt-2">
              <BarsLegend data={projectEmissionsData} />
            </div>
          </div>

          {/* COLUNA DIREITA (Gráficos) */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 max-sm:w-full overflow-hidden">
            
            {/* Filtros no topo do gráfico */}
            <div className="shrink-0 flex gap-2 items-end max-sm:flex-col max-sm:items-stretch">
              {ChartSelector}
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                className="h-9!"
              />
            </div>
            
            {/* Render do Gráfico (Ocupa o resto do espaço: flex-1) */}
            <div ref={elementRef2} className='flex-1 min-h-0 w-full'>
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
                  // Força a altura dinâmica baseada no Flexbox (subtraímos ~10px por segurança)
                  height={Math.max(elementHeight2 - 10, 200)}
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
            
            {/* Legenda embaixo do gráfico */}
            <div className='shrink-0'>
              {type !== 'material' && <ChartLegend />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSummary;