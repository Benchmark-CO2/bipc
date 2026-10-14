import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChartLegend } from "./components/chartLegend";
import { ClassificationCard } from './components/classificationCard';
import { EmissionsSection } from "./components/emissionSection";
import { ScenarioCard } from "./components/indicatorItem";
import { useChartType } from "./hooks/useChartType";
import { useElementHeight } from './hooks/useElementHeight';
import { getCategoryValue, translateCategory } from "./units";
import { calculateGrade, normalizeBenchmarkSeries, recalculateY } from "./utils";

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
  data,
  someSelected,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);
  const { t } = useTranslation();
  const { isExpanded, isFullScreen } = useSummary();

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

  const [subTabs, setSubTabs] = useState<string>(t.summaryTechnologies.projects);

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
            const techName = translateCategory[key] || key;
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
  const { ref: elementRef2, height: elementHeight2 } = useElementHeight<HTMLDivElement>();
  
  const [val, setVal] = useState('stacked_bar');
  const isMobile = useIsMobile();

  return (
    <div ref={elementRef} className={cn("flex flex-col overflow-hidden pb-4", isExpanded ? "h-full" : "h-[80vh]")}>
      
      <div className="shrink-0 flex justify-between gap-2 w-full">
        <div className="flex items-center gap-4 w-full overflow-x-auto pt-3 pb-2">
          <div className="flex flex-col gap-1.5 text-xs font-semibold text-right text-neutral-800 pl-2 shrink-0">
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mt-1">Benchmark</span>
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mb-1 text-neutral-600 font-normal">Total</span>
          </div>
          <ScenarioCard letter="V" title={t.summary.chartLegend?.referenceValue_short || "Valor referência"} color="#62A436" items={[{ total: formatMetric(allPcvMetrics.co2.V * totalArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.V * totalArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.V * totalArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ScenarioCard letter="C" title={t.summary.chartLegend?.constructionMitigationPotential_short || "Melhor cenário"} color="#5B9BD5" items={[{ total: formatMetric(allPcvMetrics.co2.C * totalArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.C * totalArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.C * totalArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ScenarioCard letter="R" title={t.summary.chartLegend?.riskOfLowerConstructionMitigation_short || "Pior cenário"} color="#E0756C" items={[{ total: formatMetric(allPcvMetrics.co2.R * totalArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.R * totalArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.R * totalArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ScenarioCard letter="P" title={t.summary.chartLegend?.constructionMitigationPotential_short || "Potencial de mitigação"} color="#9F70DB" items={[{ total: formatMetric(allPcvMetrics.co2.P * totalArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.P * totalArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.P * totalArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ClassificationCard grade={currentGrade} totalProjects={totalProjectsCount} />
        </div>
      </div>

      {isFullScreen && (
        <div className="flex-1 min-h-0 flex gap-4 max-sm:gap-2 max-sm:flex-col max-sm:p-2 overflow-hidden mt-2">
          
          <div className="w-1/3 shrink-0 flex flex-col min-h-0 max-sm:w-full overflow-y-auto pr-2">
            <Select onValueChange={setVal} value={val} defaultValue='stacked_bar'>
              <SelectTrigger className='w-full shrink-0'>
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
            <div className="mt-2 flex-1 min-h-0">
              <EmissionsSection
                data={simulationEmissionsData}
                selected={selectedProjects}
                onChange={onChangeProjectSelection}
                benchmarkMax={benchmarkMax}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2 max-sm:w-full overflow-hidden">
            <div className="shrink-0 flex gap-2 justify-end items-center max-sm:flex-col">
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                fullWidth
                onSubTabSelect={(tab) => {
                  if (tab === t.summaryTechnologies.projects) setSubTabs(tab);
                  if (tab === t.summary.selectAll || tab === t.summary.deselectAll) selectAll();
                }}
                subTabs={[
                  t.summaryTechnologies.projects,
                  selectedProjects.length >= filteredProjects.length ? t.summary.deselectAll : t.summary.selectAll,
                ]}
                selectedSubTab={subTabs}
              />
              <div className="w-full">{ChartSelector}</div>
            </div>
            
            <div ref={elementRef2} className="flex-1 min-h-0 w-full">
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
                  height={Math.max(elementHeight2 - 10, 200)}
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