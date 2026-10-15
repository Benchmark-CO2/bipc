import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { IUnit } from "@/types/units";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { Button } from "../ui/button";
import { FilterTabs } from "../ui/filter-tabs";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChartLegend } from "./components/chartLegend";
import { ClassificationCard } from './components/classificationCard';
import { EmissionsSection } from "./components/emissionSection";
import { ScenarioCard } from "./components/indicatorItem";
import { useChartType } from "./hooks/useChartType";
import { useElementHeight } from './hooks/useElementHeight';
import { getCategoryValue, translateCategory } from "./units";
import { calculateGrade, MARKER_COLORS, normalizeBenchmarkSeries, recalculateY } from "./utils";

export interface IFloorSummaryItem {
  id: string;
  group_id: string;
  group_name: string;
  floor_group: string;
  category: string;
  floor_index: number;
  co2_min: number;
  co2_max: number;
  energy_min: number;
  energy_max: number;
  material: number;
}

export interface ISelectedFloor extends IFloorSummaryItem { }

type ProjectsSummaryProps = {
  floors: IFloorSummaryItem[];
  title?: string;
  data: IBenchmarkResponse;
  unit: IUnit;
  selectedFloors: ISelectedFloor[];
  someSelected: boolean;
};

const FloorSummary = ({
  floors,
  data,
  unit,
  selectedFloors,
  someSelected,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);
  const { t } = useTranslation();
  const { isExpanded, isFullScreen } = useSummary();

  const filteredFloors = useMemo(
    () => floors.filter((el) => !!el.co2_max),
    [floors],
  );

  const [selectedProjects, setSelectedProjects] = useState<string[]>(["total"]);

  const newItems = useMemo(() => {
    return filteredFloors.map((el) => {
      return {
        co2: {
          id: el.id,
          y: 0,
          min: el.co2_min,
          max: el.co2_max,
          label: el.floor_group,
        },
        energy: {
          id: el.id,
          y: 0,
          min: el.energy_min,
          max: el.energy_max,
          label: el.floor_group,
        },
        material: {
          id: el.id,
          y: 0,
          min: el.material,
          max: el.material,
          value: el.material,
          label: el.floor_group,
        },
      };
    });
  }, [filteredFloors]);

  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

    types.forEach((t) => {
      const managedData =
        normalizeBenchmarkSeries(data.benchmark?.[t])?.map((el) => ({
          ...el,
          label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
        })) || [];

      const typeNewItems = newItems.map((item) => item[t]);

      let unitTotalItem = null;
      const unitConsumptions = (unit as any)?.consumptions?.total;
      if (unitConsumptions) {
        unitTotalItem = {
          id: "total",
          y: 0,
          label: `Total (${unit.name || "Unidade"})`,
          ...(t === "material"
            ? {
              value: unitConsumptions.material || 0,
              min: unitConsumptions.material || 0,
              max: unitConsumptions.material || 0,
            }
            : {
              min: unitConsumptions[`${t}_min`] || 0,
              max: unitConsumptions[`${t}_max`] || 0,
            }),
        };
      }

      const newDataItems = unitTotalItem
        ? [...managedData, ...typeNewItems, unitTotalItem]
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

        let activeItems = newData.filter((d) => selectedProjects.includes(String(d.id)) && String(d.id) !== "total");

        if (activeItems.length === 0 && selectedProjects.includes("total")) {
          activeItems = newData.filter((d) => String(d.id) === "total");
        }

        if (activeItems.length > 0) {
          hasSelection = true;
          C = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
          R = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;
          V = c5Value - C + (r5Value - R) / 2;

          if (V < 0) V = (C + R) / 2;
        }
      }

      result[t] = {
        managedData, newData, minData: minDataArr, maxData: maxDataArr, pcvMetrics: { P, C, V, R, hasSelection },
      };
    });

    return result;
  }, [data.benchmark, selectedFloors, newItems, selectedProjects, unit]);

  const { managedData, newData, minData, maxData } = processedData[type];

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
    if (!someSelected) setSelectedProjects(["total"]);
  }, [someSelected]);

  const allPossibleIds = ["total", ...filteredFloors.map((f) => f.id)];

  const selectAll = () => {
    if (selectedProjects.length >= allPossibleIds.length) {
      setSelectedProjects([]); 
    } else {
      setSelectedProjects(allPossibleIds);
    }
  };

  const floorEmissionsData = useMemo(() => {
    if (!unit || !filteredFloors) return [];

    const buildChartData = (item: any, isUnitTotal: boolean = false) => {
      const co2Row: Record<string, any> = { name: t.benchmark.chartTypes.emission.co2Label, id: "co2" };
      const energyRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.energyLabel, id: "energy" };
      const materialRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.materialLabel, id: "material" };

      if (isUnitTotal && (item as any)?.consumptions) {
        Object.entries((item as any).consumptions).forEach(([key, values]) => {
          if (key !== "total") {
            const techName = translateCategory(key) || key;
            co2Row[techName] = getCategoryValue(values, "co2");
            energyRow[techName] = getCategoryValue(values, "energy");
            materialRow[techName] = getCategoryValue(values, "material");
          }
        });
      } else {
        const cat = item.category;
        if (cat) {
          const techName = translateCategory(cat) || cat;
          co2Row[techName] = getCategoryValue(item, "co2");
          energyRow[techName] = getCategoryValue(item, "energy");
          materialRow[techName] = getCategoryValue(item, "material");
        } else {
          co2Row["Total"] = getCategoryValue(item, "co2");
          energyRow["Total"] = getCategoryValue(item, "energy");
          materialRow["Total"] = getCategoryValue(item, "material");
        }
      }

      return [co2Row, energyRow, materialRow];
    };

    const result = [];

    result.push({
      id: "total",
      title: `Total (${unit.name || "Unidade"})`,
      isTotal: true,
      isChecked: selectedProjects.includes("total"),
      chartData: buildChartData(unit, true),
    });

    filteredFloors.forEach((floor) => {
      result.push({
        id: floor.id,
        title: floor.floor_group || "Andar",
        isTotal: false,
        isChecked: selectedProjects.includes(floor.id),
        chartData: buildChartData(floor, false),
      });
    });

    return result;
  }, [unit, filteredFloors, selectedProjects]);

  const onChangeProjectSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, id]);
    } else {
      setSelectedProjects((prev) => prev.filter((p) => p !== id));
    }
  };

  const formatMetric = (val: number) => val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const unitArea = (unit as any)?.area || (unit as any)?.built_area || 1;

  const currentGrade = calculateGrade(
    (allPcvMetrics.co2.C + allPcvMetrics.co2.R) / 2, 
    processedData.co2.newData.map((el: any) => (el.max + el.min) / 2)
  );  
  const totalProjectsCount = newData.length;

  const { ref: elementRef } = useElementHeight<HTMLDivElement>();
  const { ref: elementRef2, height: elementHeight2 } = useElementHeight<HTMLDivElement>();
  const [val, setVal] = useState('stacked_bar');
  const isMobile = useIsMobile();
  
  return (
    <div ref={elementRef} className={cn("flex flex-col overflow-hidden pb-4", isExpanded ? "h-full" : "h-[80vh]")}>
      <div className="shrink-0 flex justify-between gap-2 w-full">
        <div className="flex items-center gap-4 w-full overflow-x-auto pt-3 pb-2">
          <div className="flex flex-col gap-1.5 text-sm font-bold text-right text-neutral-800 pl-2 shrink-0">
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mt-1">Benchmark</span>
            <span className="leading-5 whitespace-nowrap flex items-center justify-end mb-1">Total</span>
          </div>
          <ScenarioCard letter="V" title={t.summary.chartLegend?.referenceValue || "Valor referência"} color={MARKER_COLORS.V} items={[{ total: formatMetric(allPcvMetrics.co2.V * unitArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.V * unitArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.V * unitArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ScenarioCard letter="C" title={t.summary.chartLegend?.constructionMitigationPotential || "Melhor cenário"} color={MARKER_COLORS.C} items={[{ total: formatMetric(allPcvMetrics.co2.C * unitArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.C * unitArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" }]} />
          <ScenarioCard letter="R" title={t.summary.chartLegend?.riskOfLowerConstructionMitigation || "Pior cenário"} color={MARKER_COLORS.R} items={[{ total: formatMetric(allPcvMetrics.co2.R * unitArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.R * unitArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" }]} />
          <ScenarioCard letter="P" title={t.summary.chartLegend?.projectMitigationPotential || "Potencial de mitigação"} color={MARKER_COLORS.P} items={[{ total: formatMetric(allPcvMetrics.co2.P * unitArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" }, { total: formatMetric(allPcvMetrics.energy.P * unitArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" }, { total: formatMetric(allPcvMetrics.material.P * unitArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" }]} />
          <ClassificationCard grade={currentGrade} totalProjects={totalProjectsCount} />
        </div>
      </div>

      {isFullScreen && (
        <div className="flex-1 min-h-0 flex gap-4 max-sm:gap-2 max-sm:flex-col max-sm:p-2 overflow-hidden mt-5 max-sm:mt-2">
          <div className="w-1/3 shrink-0 flex flex-col min-h-0 max-sm:w-full overflow-y-auto pr-2">
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
                {selectedProjects.length >= allPossibleIds.length ? t.summary.deselectAll : t.summary.selectAll}
              </Button>
            </div>
            <div className="mt-2 flex-1 min-h-0">
              <EmissionsSection
                data={floorEmissionsData}
                selected={selectedProjects}
                onChange={onChangeProjectSelection}
                benchmarkMax={benchmarkMax}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2 max-sm:w-full overflow-hidden">
            <div className="shrink-0 flex gap-2 items-end max-sm:flex-col max-sm:items-stretch">
              {ChartSelector}
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                className="h-9!"
              />
            </div>
            
            <div ref={elementRef2} className="flex-1 min-h-0 w-full">
              {chartType === "scatter" ? (
                <D3GradientRangeChart
                  data={newData}
                  selectedBars={selectedProjects}
                  unit={unitsOfMeasure?.[type as keyof typeof unitsOfMeasure] || ""}
                  totalProjects={managedData.length || newData.length}
                  minData={minData}
                  maxData={maxData}
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
                  data={newData}
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

export default FloorSummary;