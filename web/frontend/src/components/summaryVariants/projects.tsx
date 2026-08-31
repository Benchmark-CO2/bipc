import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
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
  const { isOpen } = useSummary();

  const filterProjects = useMemo(() =>
    projects.filter((el) => !!el.consumption),
    [projects]);

  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { chartType, ChartSelector } = useChartType(type);

  // 1. Inicia APENAS com o Total selecionado por padrão
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

  // ── Lógica Centralizada: Calcula os dados e o PCV para TODOS os tipos ──
  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

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
          label: "Total Geral (Média)",
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
  }, [data.benchmark, projects, newItems, selectedProjects, filterProjects, portfolioAverage]);

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
      // 2. Garante que retorne ao default ao zerar seleções externas
      setSelectedProjects(["total"]);
    }
  }, [someSelected]);

  const [subTabs, setSubTabs] = useState<string>(t.summary.projects);

  const allPossibleIds = ["total", ...filterProjects.map((p) => p.id)];

  const selectAll = () => {
    if (selectedProjects.length >= allPossibleIds.length) {
      setSelectedProjects([]); // ou ["total"] se preferir nunca zerar completamente
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
          const techName = translateCategory[key] || key;
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
      title: "Total Geral (Média)",
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
  }, [filterProjects, selectedProjects, portfolioAverage]);

  let activeProjectsForArea = filterProjects.filter(p => selectedProjects.includes(p.id));

  if (activeProjectsForArea.length === 0 && selectedProjects.includes("total")) {
    activeProjectsForArea = filterProjects; // 3. Se só o Total tá marcado, usa todos os projetos pro calculo de área
  } else if (activeProjectsForArea.length === 0) {
    activeProjectsForArea = filterProjects;
  }

  const totalArea = activeProjectsForArea.reduce((acc, curr) =>
    acc + (Number(curr.area) || Number(curr.built_area) || 1), 0
  );

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div>
      <div className='flex justify-between gap-2 w-full'>
        <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">
          <ScenarioCard
            letter="V"
            title={t.summary.chartLegend.referenceValue_short}
            color="#62A436" // Verde
            items={[
              { total: formatMetric(allPcvMetrics.co2.V * totalArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.V * totalArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.V * totalArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />

          <ScenarioCard
            letter="C"
            title={t.summary.chartLegend.constructionMitigationPotential_short}
            color="#5B9BD5" // Azul
            items={[
              { total: formatMetric(allPcvMetrics.co2.C * totalArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.C * totalArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.C * totalArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />

          <ScenarioCard
            letter="R"
            title={t.summary.chartLegend.riskOfLowerConstructionMitigation_short}
            color="#E0756C" // Vermelho
            items={[
              { total: formatMetric(allPcvMetrics.co2.R * totalArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.R * totalArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.R * totalArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />

          <ScenarioCard
            letter="P"
            title={t.summary.chartLegend.projectMitigationPotential_short}
            color="#9F70DB" // Roxo
            items={[
              { total: formatMetric(allPcvMetrics.co2.P * totalArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
              { total: formatMetric(allPcvMetrics.energy.P * totalArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
              { total: formatMetric(allPcvMetrics.material.P * totalArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
            ]}
          />
        </div>
      </div>
      {isOpen && (
        <div className='flex gap-4'>
          <div className='w-1/3 flex-shrink-0 mt-3 flex flex-col'>
            <EmissionsSection
              data={projectEmissionsData}
              selected={selectedProjects}
              onChange={onChangeProjectSelection}
              benchmarkMax={benchmarkMax}
            />
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
                  selectedProjects.length >= allPossibleIds.length ? t.summary.deselectAll : t.card.selectAll,
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
            {type !== 'material' && <ChartLegend />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsSummary;