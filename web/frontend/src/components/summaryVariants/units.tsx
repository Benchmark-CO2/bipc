import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { ChartLegend } from './components/chartLegend';
import { EmissionsSection } from './components/emissionSection';
import { ScenarioCard } from './components/indicatorItem';
import { useChartType } from "./hooks/useChartType";
import { normalizeBenchmarkSeries, recalculateY } from "./utils";

export const translateCategory: Record<string, string> = {
  concrete_wall: "Parede de Concreto",
  foundation: "Fundação",
  roof: "Cobertura",
  // Adicione outras chaves que o backend pode enviar
};

export const getCategoryValue = (categoryData: any, currentType: "co2" | "energy" | "material") => {
  if (!categoryData) return 0;
  if (currentType === "material") return categoryData.material || 0;

  const min = categoryData?.[`${currentType}_min`] || 0;
  const max = categoryData?.[`${currentType}_max`] || 0;

  return (min + max) / 2; // Usando a média geométrica
};

type ProjectsSummaryProps = {
  selectedUnits: (any & {
    co: number;
    mj: number;
    density: number;
  })[];
  project: any;
  units: any[];
  data: IBenchmarkResponse;
  someSelected: boolean;
};

const UnitsSummary = ({
  units,
  data,
  selectedUnits,
  project,
  someSelected,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);
  const { t } = useTranslation();

  const filteredUnits = useMemo(
    () => units.filter((el) => !!el.consumptions),
    [units]
  );

  // Inicia APENAS com o Projeto Completo selecionado
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["total"]);

  const newItems = useMemo(() => {
    return filteredUnits.map((el) => {
      return {
        id: el.id,
        co2: {
          id: el.id,
          y: 0,
          min: el.consumptions.total.co2_min,
          max: el.consumptions.total.co2_max,
          label: el.name,
        },
        energy: {
          id: el.id,
          y: 0,
          min: el.consumptions.total.energy_min,
          max: el.consumptions.total.energy_max,
          label: el.name,
        },
        material: {
          id: el.id,
          y: 0,
          value: el.consumptions.total.material,
          min: el.consumptions.total.material,
          max: el.consumptions.total.material,
          label: el.name,
        },
      };
    });
  }, [filteredUnits]);

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

  // ── Lógica Centralizada: Calcula os dados e o PCV para TODOS os tipos ──
  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

    types.forEach((t) => {
      const managedData = normalizeBenchmarkSeries(
        data.benchmark?.[t],
      ).map((el) => ({
        ...el,
        label: selectedUnits.find((f) => f.id === el.id)?.name || "",
      }));

      const typeNewItems = newItems.map((item) => item[t]);

      let projectTotalItem = null;
      if (project?.consumption?.total) {
        projectTotalItem = {
          id: "total",
          y: 0,
          label: "Projeto completo",
          ...(t === "material"
            ? {
              value: project.consumption.total.material || 0,
              min: project.consumption.total.material || 0,
              max: project.consumption.total.material || 0,
            }
            : {
              min: project.consumption.total[`${t}_min`] || 0,
              max: project.consumption.total[`${t}_max`] || 0,
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

        // Tenta calcular o PCV usando as unidades selecionadas isoladamente
        let activeItems = newData.filter(d => selectedProjects.includes(String(d.id)) && String(d.id) !== "total");

        // Se não há unidades marcadas, mas o 'total' está, usa os dados do 'total' para não deixar os cards zerados
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
  }, [data.benchmark, selectedUnits, newItems, selectedProjects, project]);

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

  // ── 2. Extrai o Teto (MAX) do Benchmark para travar a escala do Gráfico da Esquerda ──
  const benchmarkMax = useMemo(() => {
    const getMax = (typeKey: 'co2' | 'energy' | 'material') => {
      // Usa a sua função de normalização para garantir que 'series' seja sempre um Array
      const series = normalizeBenchmarkSeries(data.benchmark?.[typeKey]) || [];

      if (series.length === 0) return 0;

      if (typeKey === 'material') {
        return Math.max(...series.map((d: any) => d.value ?? d.material ?? 0), 0);
      }
      return Math.max(...series.map((d: any) => d.max ?? d[`${typeKey}_max`] ?? 0), 0);
    };

    return {
      co2: getMax('co2'),
      energy: getMax('energy'),
      material: getMax('material'),
    };
  }, [data.benchmark]);

  const { isExpanded, isOpen } = useSummary();
  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) return;
    setPreviousProjects(selectedUnits.map((el) => el.id));
  }, [selectedUnits, someSelected]);

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(["total"]);
      return;
    }
    if (previousProjects.length < selectedUnits.length) {
      const diff = filteredUnits.filter((p) => !previousProjects.includes(p.id));
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > selectedUnits.length) {
      const diff = previousProjects.filter((p) => !filteredUnits.map((u) => u.id).includes(p));
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, selectedUnits, someSelected, filteredUnits]);

  const [selectedSubTab, setSelectedSubTab] = useState<string>(t.summary.buildings);

  const allPossibleIds = ["total", ...filteredUnits.map((f) => f.id)];

  const selectAll = () => {
    if (selectedProjects.length >= allPossibleIds.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(allPossibleIds);
    }
  };

  const projectEmissionsData = useMemo(() => {
    if (!filteredUnits) return [];

    const buildChartData = (consumptions: any) => {
      if (!consumptions) return [];

      const co2Row: Record<string, any> = { name: t.benchmark.chartTypes.emission.co2Label, id: 'co2' };
      const energyRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.energyLabel, id: 'energy' };
      const materialRow: Record<string, any> = { name: t.benchmark.chartTypes.emission.materialLabel, id: 'material' };

      Object.entries(consumptions).forEach(([key, values]) => {
        if (key !== "total") {
          const techName = translateCategory[key] || key;
          co2Row[techName] = getCategoryValue(values, "co2");
          energyRow[techName] = getCategoryValue(values, "energy");
          materialRow[techName] = getCategoryValue(values, "material");
        }
      });

      return [co2Row, energyRow, materialRow];
    };

    const result = [];

    // 3. Fallback inteligente usando MÉDIA (e não soma) se o backend não enviar o consumo do projeto inteiro
    let projectConsumptionSource = project?.consumption;
    if (!projectConsumptionSource) {
      projectConsumptionSource = { total: { co2_min: 0, co2_max: 0, energy_min: 0, energy_max: 0, material: 0 } };
      let unitCount = 0;

      filteredUnits.forEach(u => {
        if (u.consumptions?.total) {
          projectConsumptionSource.total.co2_min += (u.consumptions.total.co2_min || 0);
          projectConsumptionSource.total.co2_max += (u.consumptions.total.co2_max || 0);
          projectConsumptionSource.total.energy_min += (u.consumptions.total.energy_min || 0);
          projectConsumptionSource.total.energy_max += (u.consumptions.total.energy_max || 0);
          projectConsumptionSource.total.material += (u.consumptions.total.material || 0);
          unitCount++;
        }
      });

      if (unitCount > 0) {
        projectConsumptionSource.total.co2_min /= unitCount;
        projectConsumptionSource.total.co2_max /= unitCount;
        projectConsumptionSource.total.energy_min /= unitCount;
        projectConsumptionSource.total.energy_max /= unitCount;
        projectConsumptionSource.total.material /= unitCount;
      }
    }

    result.push({
      id: "total",
      title: "Projeto completo",
      isTotal: true,
      isChecked: selectedProjects.includes("total"),
      chartData: buildChartData(projectConsumptionSource)
    });

    filteredUnits.forEach((unit) => {
      result.push({
        id: unit.id,
        title: unit.name,
        isTotal: false,
        isChecked: selectedProjects.includes(unit.id),
        chartData: buildChartData(unit.consumptions)
      });
    });

    return result;
  }, [project, filteredUnits, selectedProjects]);

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  const onChangeProjectSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, id]);
    } else {
      setSelectedProjects((prev) => prev.filter((p) => p !== id));
    }
  };

  const projectArea = project?.area || project?.built_area || 1;

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>
      <div className='flex justify-between gap-2 w-full'>
        <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">
          <ScenarioCard
            letter="V"
            title={t.summary.chartLegend?.referenceValue_short || "Valor referência"}
            color="#62A436"
            items={[
              { total: formatMetric(allPcvMetrics.co2.V * projectArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.V * projectArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.V * projectArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />
          <ScenarioCard
            letter="C"
            title={t.summary.chartLegend?.constructionMitigationPotential_short || "Melhor cenário"}
            color="#5B9BD5"
            items={[
              { total: formatMetric(allPcvMetrics.co2.C * projectArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.C * projectArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.C * projectArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />
          <ScenarioCard
            letter="R"
            title={t.summary.chartLegend?.riskOfLowerConstructionMitigation_short || "Pior cenário"}
            color="#E0756C"
            items={[
              { total: formatMetric(allPcvMetrics.co2.R * projectArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.R * projectArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.R * projectArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />
          <ScenarioCard
            letter="P"
            title={t.summary.chartLegend?.projectMitigationPotential_short || "Potencial de mitigação"}
            color="#9F70DB"
            items={[
              { total: formatMetric(allPcvMetrics.co2.P * projectArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.P * projectArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.P * projectArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />
        </div>
      </div>

      {(isOpen || isExpanded) && (
        <div className='flex gap-4 items-start'>
          <div className='w-1/3 flex-shrink-0 mt-0 flex flex-col'>
            {/* O EmissionsSection agora recebe a âncora do benchmarkMáximo para não distorcer o eixo X */}
            <EmissionsSection
              data={projectEmissionsData}
              selected={selectedProjects}
              onChange={onChangeProjectSelection}
              benchmarkMax={benchmarkMax}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-between gap-0 pt-0">
            <div className='flex gap-2 justify-end items-center'>
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                fullWidth
                subTabs={[
                  t.summary.buildings,
                  selectedProjects.length >= allPossibleIds.length
                    ? t.summary.deselectAll
                    : t.summary.selectAll,
                ]}
                onSubTabSelect={(tab) => {
                  if (tab === t.summary.buildings) setSelectedSubTab(tab);
                  if (tab === t.summary.selectAll || tab === t.summary.deselectAll)
                    selectAll();
                }}
                selectedSubTab={selectedSubTab}
              />
              <div className='w-full'>
                {ChartSelector}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              {chartType === "scatter" ? (
                <D3GradientRangeChart
                  data={newData}
                  selectedBars={selectedProjects}
                  unit={unitsOfMeasure[type as keyof typeof unitsOfMeasure] || ""}
                  minData={minData}
                  maxData={maxData}
                  totalProjects={managedData.length || newData.length}
                  showBaseline={type !== "material"}
                  showTop5Line={type !== "material"}
                  showProcelScale
                  showMaxCurve={type !== "material"}
                  showMinCurve={type !== "material"}
                  showMidCurve={type !== "material"}
                  showProjectName
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
                />
              )}
              {type !== 'material' && <ChartLegend />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitsSummary;