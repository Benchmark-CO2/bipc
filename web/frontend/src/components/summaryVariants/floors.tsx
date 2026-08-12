import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { IUnit } from "@/types/units";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import EmissionsChart from '../charts/barChart';
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { ChartLegend } from './components/chartLegend';
import { EmissionLegend } from './components/emissionLegend';
import { ScenarioCard } from './components/indicatorItem';
import { IndicatorList } from './components/indicatorsList';
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
  const { chartType, ChartSelector } = useChartType();
  const { t } = useTranslation();
  const { isExpanded, isOpen } = useSummary();

  const filteredFloors = useMemo(
    () => floors.filter((el) => !!el.co2_max),
    [floors]
  );

  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    filteredFloors.map((f) => f.id)
  );

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
      // 1. Prepara managedData (antigo fakeFloors)
      const managedData = normalizeBenchmarkSeries(
        data.benchmark?.[t],
      )?.map((el) => ({
        ...el,
        label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
      })) || [];

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
  }, [data.benchmark, selectedFloors, newItems, selectedProjects]);

  // ── Extração dos dados da tab/tipo atual para uso nos gráficos ──
  const {
    managedData, // antigo fakeFloors
    newData,
    minData,
    maxData,
    pcvMetrics
  } = processedData[type];

  const allPcvMetrics = {
    co2: processedData.co2.pcvMetrics,
    energy: processedData.energy.pcvMetrics,
    material: processedData.material.pcvMetrics,
  };

  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) return;
    setPreviousProjects(filteredFloors.map((el) => el.id));
  }, [someSelected, filteredFloors]);

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(filteredFloors.map((f) => f.id));
      return;
    }
    if (previousProjects.length < selectedFloors.length) {
      const diff = filteredFloors.filter((p) => !selectedFloors.includes(p.id));
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > selectedFloors.length) {
      const diff = previousProjects.filter(
        (p) =>
          !selectedFloors
            .filter((el) => el.consumption)
            .map((u) => u.id)
            .includes(p),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, selectedFloors, someSelected, filteredFloors]);

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const [subTabs, setSubTabs] = useState<string>(t.summaryFloors.floors);

  const selectAll = () => {
    if (selectedProjects.length === filteredFloors.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredFloors.map((f) => f.id));
    }
  };

  // ── PREPARAÇÃO DOS DADOS PARA OS GRÁFICOS DE BARRAS ─────────────────────────
  const floorEmissionsData = useMemo(() => {
    if (!unit || !filteredFloors) return [];

    const buildChartData = (item: any, isUnitTotal: boolean = false) => {
      const co2Row: Record<string, any> = { name: "CO₂ (kg)" };
      const energyRow: Record<string, any> = { name: "Energia (MJ)" };
      const materialRow: Record<string, any> = { name: `Material (${unitsOfMeasure.material || 'kg'})` };

      // Se for o total da unidade e tiver 'consumptions' (mesmo padrão do UnitsSummary)
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
      // Se for um andar específico (puxando a categoria direto se existir)
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
      isChecked: selectedProjects.length === filteredFloors.length,
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

  // ── Lógica dos Dados de Valores e Cenários ──────────────────────────────────
  const unitTotal = type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark = type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure?.[type] || "Kg/m²";

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

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>

      {/* ── BARRA SUPERIOR: Valores e PCVRB ── */}
      <div className='flex justify-between gap-2 w-full'>
        {!isOpen && (
          <div className='border-1 border-secondary rounded-md flex p-2 box-border gap-4 max-md:gap-1 h-full'>
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
          </div>
        )}

        <div className='flex gap-4 text-[16px] max-md:gap-2 max-md:text-xs'>
          {!isOpen && (
            <IndicatorList indicators={[
              { color: '#9F70DB', currentUnit, value: formatMetric(pcvMetrics.P), label: 'P' },
              { color: '#6C9EE0', currentUnit, value: formatMetric(pcvMetrics.C), label: 'C' },
              { color: '#E0756C', currentUnit, value: formatMetric(pcvMetrics.R), label: 'R' },
            ]} />
          )}
          {!isOpen && (
            <div className='text-md border-1 border-[#72E06C] bg-[#E2F1C1] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
              <span className='text-black font-bold'>B</span>
              <div className='flex flex-col'>
                <span className='font-bold text-xs'>Classificação</span>
                <span className='font-light text-neutral-400 text-xs'>N: {newData.length} projetos</span>
              </div>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex flex-wrap xl:flex-nowrap gap-4 w-full">
            <ScenarioCard
              letter="V"
              title={t.summary.chartLegend?.referenceValue || "Valor referência"}
              color="#62A436"
              items={[
                { total: "211.205,95", benchmark: formatMetric(allPcvMetrics.co2.V), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: "112.548,60", benchmark: formatMetric(allPcvMetrics.energy.V), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: "561,06", benchmark: formatMetric(allPcvMetrics.material.V), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="C"
              title={t.summary.chartLegend?.constructionMitigationPotential || "Melhor cenário"}
              color="#5B9BD5"
              items={[
                { total: "162.707,40", benchmark: formatMetric(allPcvMetrics.co2.C), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: "86.819,86", benchmark: formatMetric(allPcvMetrics.energy.C), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: "432,02", benchmark: formatMetric(allPcvMetrics.material.C), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="R"
              title={t.summary.chartLegend?.projectMitigationPotential || "Pior cenário"}
              color="#E0756C"
              items={[
                { total: "314.193,60", benchmark: formatMetric(allPcvMetrics.co2.R), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: "167.476,41", benchmark: formatMetric(allPcvMetrics.energy.R), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: "833,17", benchmark: formatMetric(allPcvMetrics.material.R), unitTotal: "m³", unitBenchmark: "m³/m²" },
              ]}
            />
            <ScenarioCard
              letter="P"
              title={t.summary.chartLegend?.riskOfLowerConstructionMitigation || "Potencial de mitigação"}
              color="#9F70DB"
              items={[
                { total: "81.353,70", benchmark: formatMetric(allPcvMetrics.co2.P), unitTotal: "CO₂ kg", unitBenchmark: "CO₂ kg/m²" },
                { total: "43.341,90", benchmark: formatMetric(allPcvMetrics.energy.P), unitTotal: "MJ", unitBenchmark: "MJ/m²" },
                { total: "216,00", benchmark: formatMetric(allPcvMetrics.material.P), unitTotal: "m³", unitBenchmark: "m³/m²" },
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
            {/* <Divider className="mb-4" /> */}

            <div className="flex flex-col gap-6 w-full">
              {/* Legenda Global no topo */}
              <div className="mb-2">
                <h3 className="text-lg font-bold mb-4">Total de Emissões por tecnologia</h3>
                <EmissionLegend 
                  keys={Array.from(
                    new Set(
                      floorEmissionsData.flatMap(p => 
                        p.chartData.flatMap(Object.keys)
                      )
                    )
                  ).filter(k => k !== 'name')} 
                />
              </div>

              {/* Loop pelos blocos (Total + Andares) */}
              {floorEmissionsData.map((section) => (
                <div key={section.id} className="flex flex-col gap-2 border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      checked={section.isChecked}
                      onChange={() => {
                        if (section.isTotal) {
                          selectAll();
                        } else {
                          handleAddProject(section.id);
                        }
                      }}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="font-bold text-gray-800 text-sm">{section.title}</span>
                  </div>

                  <div className="w-full">
                    <EmissionsChart data={section.chartData} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA DIREITA (flex-1) */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 pt-3">
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
                  selectedProjects.length === filteredFloors.length
                    ? t.summary.deselectAll
                    : t.summary.selectAll,
                ]}
                selectedSubTab={subTabs}
              />
              <div className='mt-2 w-full'>
                {ChartSelector}
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
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
              <ChartLegend />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorSummary;