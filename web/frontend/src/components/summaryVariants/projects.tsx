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
  
  // Inicia com todos os projetos selecionados para refletir o portfólio completo
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() => 
    filterProjects.map(p => p.id)
  );

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

        let activeItems = newData.filter(d => selectedProjects.includes(String(d.id)));

        // Se nenhum projeto estiver selecionado, usamos todos para não zerar os cards
        if (activeItems.length === 0) {
          activeItems = newData.filter(d => filterProjects.some(fp => String(fp.id) === String(d.id)));
        }

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
  }, [data.benchmark, projects, newItems, selectedProjects, filterProjects]);

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

  const onChangeProjectSelection = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, projectId]);
    } else {
      setSelectedProjects((prev) => prev.filter((id) => id !== projectId));
    }
  };

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(filterProjects.map(p => p.id));
    }
  }, [someSelected, filterProjects]);

  const [subTabs, setSubTabs] = useState<string>(t.summary.projects);

  const selectAll = () => {
    if (selectedProjects.length >= filterProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filterProjects.map((p) => p.id));
    }
  };

  // ── Prepara os dados para o Componente EmissionsSection (Esquerda) ──
  const projectEmissionsData = useMemo(() => {
    if (!filterProjects) return [];

    const buildChartData = (consumption: any) => {
      if (!consumption) return [];

      const co2Row: Record<string, any> = { name: "CO₂ (kg)" };
      const energyRow: Record<string, any> = { name: "Energia (MJ)" };
      const materialRow: Record<string, any> = { name: `Material (${unitsOfMeasure.material || 'kg'})` };

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

    return filterProjects.map((proj) => ({
      id: proj.id,
      title: proj.name,
      isTotal: false,
      isChecked: selectedProjects.includes(proj.id),
      chartData: buildChartData(proj.consumption)
    }));
  }, [filterProjects, selectedProjects]);

  // ── Calcula a área total dos projetos selecionados para os valores absolutos ──
  const activeProjectsForArea = selectedProjects.length > 0 
    ? filterProjects.filter(p => selectedProjects.includes(p.id))
    : filterProjects; // Se nada selecionado, usa o portfólio todo no cálculo

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
          {/* Adicionado o componente EmissionsSection que estava faltando renderizar */}
          <div className='w-1/3 flex-shrink-0 mt-3 flex flex-col'>
            <EmissionsSection 
              data={projectEmissionsData} 
              selected={selectedProjects} 
              onChange={onChangeProjectSelection} 
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
                  selectedProjects.length >= filterProjects.length ? t.summary.deselectAll : t.card.selectAll,
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