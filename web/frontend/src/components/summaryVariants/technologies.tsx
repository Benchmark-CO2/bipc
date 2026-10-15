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
import { ChartLegend } from "./components/chartLegend";
import { ClassificationCard } from './components/classificationCard';
import { EmissionsSection } from "./components/emissionSection";
import { ScenarioCard } from "./components/indicatorItem";
import { useChartType } from "./hooks/useChartType";
import { useSummaryBenchmark } from "./hooks/useSummaryBenchmark";
import { useElementHeight } from './hooks/useElementHeight';
import { getCategoryValue } from "./units";
import { calculateGrade, MARKER_COLORS, normalizeBenchmarkSeries, recalculateY } from "./utils";

type TModules = {
  consumption: {
    co2_max: number;
    co2_min: number;
    energy_max: number;
    energy_min: number;
    material: number;
  };
  id: string;
  type: string;
  label: string;
};

type SimulationData = {
  active: boolean;
  id: string;
  modules: TModules[];
  name: string;
  tower_id: string;
  area: number;
  consumption?: {
    total: {
      co2_max: number;
      co2_min: number;
      energy_max: number;
      energy_min: number;
      material: number;
    };
    [key: string]: any; 
  };
};

type ProjectsSummaryProps = {
  projects: Item[];
  data: IBenchmarkResponse;
  someSelected: boolean;
};

type Item = SimulationData & {
  id: string;
  y: number;
  min: number;
  max: number;
  label: string;
};

const SimulationsSummary = ({
  projects,
  data: baseData,
  someSelected,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);
  const { t } = useTranslation();
  // Com filtros ativos, o benchmark de entrada é o filtrado (fórmulas e classificação não mudam)
  const { data, FiltersButton } = useSummaryBenchmark(baseData);
  const { isFullScreen } = useSummary();

  const filteredProjects = useMemo(
    () => projects.filter((el) => !!el.consumption),
    [projects],
  );

  const [selectedProjects, setSelectedProjects] = useState<string[]>(() =>
    filteredProjects.map((p) => p.id),
  );

  const newItems = useMemo(() => {
    return filteredProjects.map((el) => {
      return {
        id: el.id,
        co2: {
          id: el.id,
          y: 0,
          min: el?.consumption?.total.co2_min,
          max: el?.consumption?.total.co2_max,
          label: el.name,
        },
        energy: {
          id: el.id,
          y: 0,
          min: el?.consumption?.total.energy_min,
          max: el?.consumption?.total.energy_max,
          label: el.name,
        },
        material: {
          id: el.id,
          y: 0,
          min: el?.consumption?.total.material || 0,
          max: el?.consumption?.total.material || 0,
          value: el?.consumption?.total.material || 0,
          label: el.name,
        },
      };
    });
  }, [filteredProjects]);

  const stackedData = useMemo(
    () =>
      newItems.map((el) => ({
        id: el.id,
        label: el[type].label,
        co2: ((el.co2.max || 0) + (el.co2.min || 0)) / 2,
        energy: ((el.energy.max || 0) + (el.energy.min || 0)) / 2,
        material: el.material?.value || 0,
      })),
    [newItems, type],
  );

  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

    types.forEach((t) => {
      const managedData = normalizeBenchmarkSeries(data.benchmark?.[t]).map(
        (el) => ({
          ...el,
          label: projects.find((f) => f.id === el.id)?.name || "",
        }),
      );

      const typeNewItems = newItems.map((item) => item[t]);
      const newDataItems = [...managedData, ...typeNewItems];

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

        let activeItems = newData.filter((d) => selectedProjects.includes(String(d.id)));

        if (activeItems.length === 0) {
          activeItems = newData.filter((d) => filteredProjects.some((fp) => String(fp.id) === String(d.id)));
        }

        if (activeItems.length > 0) {
          hasSelection = true;
          C = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
          R = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;

          V = c5Value - C + (r5Value - R) / 2;

          if (V < 0) {
            V = (C + R) / 2; 
          }
        }
      }

      result[t] = {
        managedData, newData, minData: minDataArr, maxData: maxDataArr, pcvMetrics: { P, C, V, R, hasSelection },
      };
    });

    return result;
  }, [data.benchmark, projects, newItems, selectedProjects, filteredProjects]);

  const { managedData, newData: updateYs, minData, maxData, pcvMetrics } = processedData[type];

  const allPcvMetrics = {
    co2: processedData.co2.pcvMetrics,
    energy: processedData.energy.pcvMetrics,
    material: processedData.material.pcvMetrics,
  };

  const benchmarkMax = useMemo(() => {
    const getMax = (typeKey: "co2" | "energy" | "material") => {
      const series = normalizeBenchmarkSeries(data.benchmark?.[typeKey]) || [];
      if (series.length === 0) return 0;
      if (typeKey === "material") {
        return Math.max(...series.map((d: any) => d.value ?? d.material ?? 0), 0);
      }
      return Math.max(...series.map((d: any) => d.max ?? d[`${typeKey}_max`] ?? 0), 0);
    };

    return { co2: getMax("co2"), energy: getMax("energy"), material: getMax("material") };
  }, [data.benchmark]);

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  }, [someSelected, filteredProjects]);

  const onChangeProjectSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, id]);
    } else {
      setSelectedProjects((prev) => prev.filter((pid) => pid !== id));
    }
  };


  const selectAll = () => {
    if (selectedProjects.length >= filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };

  const simulationEmissionsData = useMemo(() => {
    if (!filteredProjects) return [];

    const buildChartData = (consumptions: any) => {
      const co2Row: Record<string, any> = { name: t.benchmark.chartTypes.emission.co2Label, id: "co2" };
      const energyRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.energyLabel, id: "energy" };
      const materialRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.materialLabel, id: "material" };

      if (consumptions) {
        Object.entries(consumptions).forEach(([key, values]) => {
          if (key !== "total") {
            const techName = key; // chave do backend; o nome é traduzido na exibição (getTechLabel)
            co2Row[techName] = getCategoryValue(values, "co2");
            energyRow[techName] = getCategoryValue(values, "energy");
            materialRow[techName] = getCategoryValue(values, "material");
          }
        });
      }

      return [co2Row, energyRow, materialRow];
    };

    return filteredProjects.map((proj) => ({
      id: proj.id,
      title: proj.name || "Simulação",
      isChecked: selectedProjects.includes(proj.id),
      chartData: buildChartData(proj.consumption),
    }));
  }, [filteredProjects, selectedProjects]);

  const activeProjectsForArea = selectedProjects.length > 0
    ? filteredProjects.filter((p) => selectedProjects.includes(p.id))
    : filteredProjects;

  const totalArea = activeProjectsForArea.reduce((acc, curr) => acc + (Number(curr.area) || 1), 0);
  const formatMetric = (val: number) => val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  const currentGrade = calculateGrade(
    (allPcvMetrics.co2.C + allPcvMetrics.co2.R) / 2,
    processedData.co2.newData.map((el: any) => (el.max + el.min) / 2)
  );
  const totalProjectsCount = processedData.co2.newData.length;

  const { ref: elementRef } = useElementHeight<HTMLDivElement>();
  
  const [val, setVal] = useState('stacked_bar');
  const isMobile = useIsMobile();

  return (
    <div ref={elementRef} className="h-full min-h-0 max-sm:h-[80vh] flex flex-col overflow-hidden pb-4">
      
      <div className="@container/cards shrink-0 flex justify-between gap-2 w-full">
        <div className="flex items-start gap-4 @max-[110rem]/cards:gap-3 w-full min-w-0 pt-3 pb-2 max-sm:overflow-x-auto">
          <div className="flex flex-col gap-1.5 text-xs font-semibold text-right text-neutral-800 pl-2 shrink-0">
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mt-2.75">Benchmark</span>
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mb-1 text-neutral-600 font-normal">Total</span>
          </div>
          <div className="flex flex-wrap max-sm:flex-nowrap gap-4 @max-[110rem]/cards:gap-3 w-full min-w-0 flex-1">
            <ScenarioCard letter="V" showUnits title={t.summary.chartLegend?.referenceValue_short || "Valor referência"} color={MARKER_COLORS.V} items={[{ total: formatMetric(allPcvMetrics.co2.V * totalArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.V * totalArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.V * totalArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
            <ScenarioCard letter="C" title={t.summary.chartLegend?.constructionMitigationPotential_short || "Melhor cenário"} color={MARKER_COLORS.C} items={[{ total: formatMetric(allPcvMetrics.co2.C * totalArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.C * totalArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.C * totalArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
            <ScenarioCard letter="R" title={t.summary.chartLegend?.riskOfLowerConstructionMitigation_short || "Pior cenário"} color={MARKER_COLORS.R} items={[{ total: formatMetric(allPcvMetrics.co2.R * totalArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.R * totalArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.R * totalArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
            <ScenarioCard letter="P" title={t.summary.chartLegend?.constructionMitigationPotential_short || "Potencial de mitigação"} color={MARKER_COLORS.P} items={[{ total: formatMetric(allPcvMetrics.co2.P * totalArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.P * totalArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.P * totalArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
            <ClassificationCard grade={currentGrade} totalProjects={totalProjectsCount} />
          </div>
        </div>
      </div>

      {isFullScreen && (
        <div className="flex-1 min-h-0 flex gap-4 max-sm:gap-2 max-sm:flex-col max-sm:p-2 overflow-hidden mt-5 max-sm:mt-2">
          
          <div className="w-1/3 shrink-0 flex flex-col min-h-0 max-sm:w-full overflow-hidden max-sm:overflow-y-auto pr-2">
            <div className="shrink-0 flex flex-wrap justify-end gap-2 items-end">
              <div className="flex flex-col gap-1 min-w-44 flex-1">
                <Label className="text-sm font-normal text-muted-foreground">{t.summary.visualization}</Label>
                <Select onValueChange={setVal} value={val} defaultValue='stacked_bar'>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t.summary.placeholders.chartType} />
                  </SelectTrigger>
                  <SelectContent>
                    {[{ id: 'stacked_bar', label: t.summary.chartType.stackedBar }].map(({ id, label }) => (
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
                {selectedProjects.length >= filteredProjects.length ? t.summary.deselectAll : t.summary.selectAll}
              </Button>
            </div>
            <div className="mt-2 flex-1 min-h-0 flex flex-col max-sm:flex-none">
              <EmissionsSection
                data={simulationEmissionsData}
                selected={selectedProjects}
                onChange={onChangeProjectSelection}
                benchmarkMax={benchmarkMax}
              />
            </div>
            <div className="shrink-0 mt-2">
              <BarsLegend data={simulationEmissionsData} />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2 max-sm:w-full overflow-hidden">
            <div className="shrink-0 flex gap-2 items-end max-sm:flex-col max-sm:items-stretch">
              {ChartSelector}
              {FiltersButton}
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                className="h-9!"
              />
            </div>
            
            <div className="flex-1 min-h-0 w-full">
              {chartType === "scatter" ? (
                <D3GradientRangeChart
                  data={updateYs}
                  selectedBars={selectedProjects}
                  unit={unitsOfMeasure[type] || ""}
                  maxData={maxData}
                  minData={minData}
                  totalProjects={updateYs.length}
                  showBaseline={type !== "material"}
                  showTop5Line={type !== "material"}
                  showProcelScale
                  showMaxCurve={type !== "material"}
                  showMinCurve={type !== "material"}
                  showMidCurve={type !== "material"}
                  showProjectName
                  variant={type === "material" ? "cumulative" : "range"}
                  xAxisLabel={t.benchmark.chartTypes[type === "co2" || type === "energy" ? "cumulativeFraction" : "material"][type === "co2" ? "xAxisLabelCarbon" : "xAxisLabelEnergy"]}
                  yAxisLabel={t.benchmark.chartTypes[type === "co2" || type === "energy" ? "cumulativeFraction" : "material"].yAxisLabel}
                />
              ) : (
                <D3GradientRangeLineChart
                  data={updateYs}
                  selectedBars={selectedProjects}
                  unit={type}
                />
              )}
            </div>
            <div className="shrink-0">
              {type !== "material" && <ChartLegend />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationsSummary;