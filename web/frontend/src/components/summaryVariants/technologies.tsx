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
import { getCategoryValue, translateCategory } from './units';
import { normalizeBenchmarkSeries, recalculateY } from "./utils";

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
    [key: string]: any; // Para englobar as categorias individuais
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
  const { isExpanded, isOpen } = useSummary();

  const filteredProjects = useMemo(
    () => projects.filter((el) => !!el.consumption),
    [projects]
  );


  // Inicia com todas as simulações marcadas
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() =>
    filteredProjects.map((p) => p.id)
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
        material: el.material?.value || 0
      })),
    [newItems, type],
  );

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

        // Fallback: Se não houver nenhum projeto selecionado, usamos todos para o PCV não zerar
        if (activeItems.length === 0) {
          activeItems = newData.filter(d => filteredProjects.some(fp => String(fp.id) === String(d.id)));
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
  }, [data.benchmark, projects, newItems, selectedProjects, filteredProjects]);

  // ── Extração dos dados da tab/tipo atual para uso nos gráficos ──
  const {
    managedData,
    newData: updateYs,
    minData,
    maxData,
    pcvMetrics
  } = processedData[type];

  const allPcvMetrics = {
    co2: processedData.co2.pcvMetrics,
    energy: processedData.energy.pcvMetrics,
    material: processedData.material.pcvMetrics,
  };

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

  const [subTabs, setSubTabs] = useState<string>(
    t.summaryTechnologies.projects,
  );

  const selectAll = () => {
    if (selectedProjects.length >= filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };

  // ── PREPARAÇÃO DOS DADOS PARA OS GRÁFICOS DE BARRAS ─────────────────────────
  const simulationEmissionsData = useMemo(() => {
    if (!filteredProjects) return [];

    const buildChartData = (consumptions: any) => {
      const co2Row: Record<string, any> = { name: "CO₂ (kg)" };
      const energyRow: Record<string, any> = { name: "Energia (MJ)" };
      const materialRow: Record<string, any> = { name: `Material (${unitsOfMeasure.material || 'kg'})` };

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
      chartData: buildChartData(proj.consumption)
    }));
  }, [filteredProjects, selectedProjects]);

  // ── Lógica dos Dados de Valores e Cenários ──────────────────────────────────
  const unitTotal = type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark = type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure[type] || "Kg/m²";

  const activeStacked = selectedProjects.length > 0
    ? stackedData.filter(d => selectedProjects.includes(String(d.id)))
    : stackedData;

  // Calculo de área (soma das simulações selecionadas)
  const activeProjectsForArea = selectedProjects.length > 0 
    ? filteredProjects.filter(p => selectedProjects.includes(p.id))
    : filteredProjects;

  const totalArea = activeProjectsForArea.reduce((acc, curr) => 
    acc + (Number(curr.area) || 1), 0
  );

  const totalRefValue = activeStacked.reduce(
    (acc, curr) => acc + ((curr[type as keyof typeof curr] as number) || 0), 0
  );
  const benchmarkRefValue = activeStacked.length > 0 ? totalRefValue / activeStacked.length : 0;

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>

      {/* ── BARRA SUPERIOR: Valores e PCVRB ── */}
      <div className='flex justify-between gap-2 w-full'>
        

        {(
          <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">
            <ScenarioCard
              letter="V"
              title={t.summary.chartLegend?.referenceValue_short || "Valor referência"}
              color="#62A436"
              items={[
                { total: formatMetric(allPcvMetrics.co2.V * totalArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.V * totalArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.V * totalArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="C"
              title={t.summary.chartLegend?.constructionMitigationPotential_short || "Melhor cenário"}
              color="#5B9BD5"
              items={[
                { total: formatMetric(allPcvMetrics.co2.C * totalArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.C * totalArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.C * totalArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="R"
              title={t.summary.chartLegend?.riskOfLowerConstructionMitigation_short || "Pior cenário"}
              color="#E0756C"
              items={[
                { total: formatMetric(allPcvMetrics.co2.R * totalArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.R * totalArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.R * totalArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="P"
              title={t.summary.chartLegend?.constructionMitigationPotential_short || "Potencial de mitigação"}
              color="#9F70DB"
              items={[
                { total: formatMetric(allPcvMetrics.co2.P * totalArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.P * totalArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.P * totalArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
          </div>
        )}
      </div>

      {/* ── CONTEÚDO PRINCIPAL (Exibido quando aberto) ── */}
      {(isOpen || isExpanded) && (
        <div className='flex gap-4 items-start'>
          {/* COLUNA ESQUERDA (1/3) */}
          <div className="w-1/3 flex-shrink-0 mt-3 flex flex-col">
            <div className="flex flex-col gap-6 w-full">
              <div className="mb-0">
                <h3 className="text-lg font-bold mb-0">Total de Emissões por tecnologia</h3>
              </div>
              <EmissionsSection 
                data={simulationEmissionsData} 
                selected={selectedProjects} 
                onChange={onChangeProjectSelection} 
              />
            </div>
          </div>

          {/* COLUNA DIREITA (flex-1) */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-0 pt-0">
            <div className='flex gap-2 justify-end items-center'>
              <FilterTabs
                tabs={["co2", "energy", "material"]}
                onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
                selectedTab={type}
                fullWidth
                onSubTabSelect={(tab) => {
                  if (tab === t.summaryTechnologies.projects) setSubTabs(tab);
                  if (tab === t.summary.selectAll || tab === t.summary.deselectAll)
                    selectAll();
                }}
                subTabs={[
                  t.summaryTechnologies.projects,
                  selectedProjects.length >= filteredProjects.length
                    ? t.summary.deselectAll
                    : t.summary.selectAll,
                ]}
                selectedSubTab={subTabs}
              />
              <div className='mt-2 w-full'>
                {ChartSelector}
              </div>
            </div>

            <div className="flex flex-col gap-0 w-full">
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
                  xAxisLabel={
                    t.benchmark.chartTypes[
                    type === "co2" || type === "energy"
                      ? "cumulativeFraction"
                      : "material"
                    ][type === "co2" ? "xAxisLabelCarbon" : "xAxisLabelEnergy"]
                  }
                  yAxisLabel={
                    t.benchmark.chartTypes[
                      type === "co2" || type === "energy"
                        ? "cumulativeFraction"
                        : "material"
                    ].yAxisLabel
                  }
                  height={350}
                />
              ) : (
                <D3GradientRangeLineChart
                  data={updateYs}
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

export default SimulationsSummary;