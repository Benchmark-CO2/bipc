import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { IUnit } from "@/types/units";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { ChartLegend } from './components/chartLegend';
import { EmissionsSection } from './components/emissionSection';
import { ScenarioCard } from './components/indicatorItem';
import { useChartType } from "./hooks/useChartType";
import { getCategoryValue } from './units';
import { normalizeBenchmarkSeries, recalculateY } from "./utils";

export const translateCategory: Record<string, string> = {
  concrete_wall: "Parede de Concreto",
  foundation: "Fundação",
  roof: "Cobertura",
  // Adicione outras chaves que o backend pode enviar
};

type ProjectsSummaryProps = {
  floors: any[];
  title?: string;
  data: IBenchmarkResponse;
  unit: IUnit;
  selectedFloors: any[];
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
  const { isExpanded, isOpen } = useSummary();

  const filteredFloors = useMemo(
    () => floors.filter((el) => !!el.co2_max),
    [floors]
  );

  
  // 1. Inicia APENAS com a Unidade (Total) selecionada
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

  // ── Lógica Centralizada: Calcula os dados e o PCV para TODOS os tipos ──
  const processedData = useMemo(() => {
    const types = ["co2", "energy", "material"] as const;
    const result: Record<string, any> = {};

    types.forEach((t) => {
      // 1. Prepara managedData
      const managedData = normalizeBenchmarkSeries(
        data.benchmark?.[t],
      )?.map((el) => ({
        ...el,
        label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
      })) || [];

      // 2. Prepara newDataItems (incluindo o Total da Unidade)
      const typeNewItems = t !== "material" ? newItems.map((item) => item[t]) : [];
      
      let unitTotalItem = null;
      // Trata o objeto "unit" como "total" no gráfico
      const unitConsumptions = (unit as any)?.consumptions?.total;
      if (unitConsumptions) {
        unitTotalItem = {
          id: "total",
          y: 0,
          label: `Total (${unit.name || 'Unidade'})`,
          ...(t === "material" 
            ? {
                value: unitConsumptions.material || 0,
                min: unitConsumptions.material || 0,
                max: unitConsumptions.material || 0,
              }
            : {
                min: unitConsumptions[`${t}_min`] || 0,
                max: unitConsumptions[`${t}_max`] || 0,
              }
          )
        };
      }

      const newDataItems = unitTotalItem 
        ? [...managedData, ...typeNewItems, unitTotalItem] 
        : [...managedData, ...typeNewItems];

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

        // Filtra os andares selecionados, ignorando o "total" para o cálculo da média
        let activeItems = newData.filter(d => selectedProjects.includes(String(d.id)) && String(d.id) !== "total");

        // Se só o "total" estiver marcado, usamos ele para os cards não ficarem zerados
        if (activeItems.length === 0 && selectedProjects.includes("total")) {
          activeItems = newData.filter(d => String(d.id) === "total");
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
  }, [data.benchmark, selectedFloors, newItems, selectedProjects, unit]);

  // ── Extração dos dados da tab/tipo atual para uso nos gráficos ──
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

  // ── NOVO: Extrai o Teto (MAX) do Benchmark para travar a escala do Gráfico da Esquerda ──
  const benchmarkMax = useMemo(() => {
    const getMax = (typeKey: 'co2' | 'energy' | 'material') => {
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

  useEffect(() => {
    if (!someSelected) {
      // Retorna ao estado inicial se a seleção for limpa externamente
      setSelectedProjects(["total"]);
    }
  }, [someSelected]);

  const [subTabs, setSubTabs] = useState<string>(t.summaryFloors.floors);
  
  const allPossibleIds = ["total", ...filteredFloors.map((f) => f.id)];

  const selectAll = () => {
    if (selectedProjects.length >= allPossibleIds.length) {
      setSelectedProjects([]); // Ou ["total"] se preferir nunca zerar completamente
    } else {
      setSelectedProjects(allPossibleIds);
    }
  };

  // ── PREPARAÇÃO DOS DADOS PARA A LISTA ESQUERDA (EmissionsSection) ──
  const floorEmissionsData = useMemo(() => {
    if (!unit || !filteredFloors) return [];

    const buildChartData = (item: any, isUnitTotal: boolean = false) => {
      const co2Row: Record<string, any> = { name: "CO₂ (kg)" };
      const energyRow: Record<string, any> = { name: "Energia (MJ)" };
      const materialRow: Record<string, any> = { name: `Material (${unitsOfMeasure.material || 'kg'})` };

      // Se for o total da unidade e tiver 'consumptions'
      if (isUnitTotal && (item as any)?.consumptions) {
        Object.entries((item as any).consumptions).forEach(([key, values]) => {
          if (key !== "total") {
            const techName = translateCategory[key] || key;
            co2Row[techName] = getCategoryValue(values, "co2");
            energyRow[techName] = getCategoryValue(values, "energy");
            materialRow[techName] = getCategoryValue(values, "material");
          }
        });
      } 
      // Se for um andar específico
      else {
        const cat = item.category;
        if (cat) {
          const techName = translateCategory[cat] || cat;
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

    // 1. Dados Totais (Unidade Inteira)
    result.push({
      id: "total",
      title: `Total (${unit.name || 'Unidade'})`,
      isTotal: true,
      // Agora o isChecked baseia-se puramente no array state
      isChecked: selectedProjects.includes("total"),
      chartData: buildChartData(unit, true)
    });

    // 2. Dados por Andar
    filteredFloors.forEach((floor) => {
      result.push({
        id: floor.id,
        title: floor.floor_group || "Andar",
        isTotal: false,
        isChecked: selectedProjects.includes(floor.id),
        chartData: buildChartData(floor, false)
      });
    });

    return result;
  }, [unit, filteredFloors, selectedProjects]);

  // Função simplificada para adicionar/remover do array de selecionados
  const onChangeProjectSelection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, id]);
    } else {
      setSelectedProjects((prev) => prev.filter((p) => p !== id));
    }
  };

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  // Área da unidade para cálculos de Valores Absolutos nos ScenarioCards
  const unitArea = (unit as any)?.area || (unit as any)?.built_area || 1;

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>

      {/* ── BARRA SUPERIOR: Valores e PCVRB ── */}
      <div className='flex justify-between gap-2 w-full'>
        { (
          <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">
            <ScenarioCard
              letter="V"
              title={t.summary.chartLegend?.referenceValue || "Valor referência"}
              color="#62A436"
              items={[
                { total: formatMetric(allPcvMetrics.co2.V * unitArea), benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.V * unitArea), benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.V * unitArea), benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="C"
              title={t.summary.chartLegend?.constructionMitigationPotential || "Melhor cenário"}
              color="#5B9BD5"
              items={[
                { total: formatMetric(allPcvMetrics.co2.C * unitArea), benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.C * unitArea), benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.C * unitArea), benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="R"
              title={t.summary.chartLegend?.riskOfLowerConstructionMitigation || "Pior cenário"}
              color="#E0756C"
              items={[
                { total: formatMetric(allPcvMetrics.co2.R * unitArea), benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.R * unitArea), benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.R * unitArea), benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="P"
              title={t.summary.chartLegend?.projectMitigationPotential || "Potencial de mitigação"}
              color="#9F70DB"
              items={[
                { total: formatMetric(allPcvMetrics.co2.P * unitArea), benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: formatMetric(allPcvMetrics.energy.P * unitArea), benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: formatMetric(allPcvMetrics.material.P * unitArea), benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
          </div>
        )}
      </div>

      {/* ── CONTEÚDO PRINCIPAL (Exibido quando aberto) ── */}
      {(isOpen || isExpanded) && (
        <div className='flex gap-4 items-start'>
          
          {/* COLUNA ESQUERDA (1/3) */}
          <div className="w-1/3 flex-shrink-0 mt-0 flex flex-col">
            <div className="flex flex-col gap-0 w-full">
              <div className="mb-0">
                <h3 className="text-lg font-bold mb-0">Total de Emissões por tecnologia</h3>
              </div>
              {/* NOVO: Passando o benchmarkMax calculado */}
              <EmissionsSection 
                data={floorEmissionsData} 
                selected={selectedProjects} 
                onChange={onChangeProjectSelection} 
                benchmarkMax={benchmarkMax}
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
                  if (tab === t.summaryFloors.floors) setSubTabs(tab);
                  if (tab === t.summary.selectAll || tab === t.summary.deselectAll)
                    selectAll();
                }}
                subTabs={[
                  t.summaryFloors.floors,
                  selectedProjects.length >= allPossibleIds.length
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

export default FloorSummary;