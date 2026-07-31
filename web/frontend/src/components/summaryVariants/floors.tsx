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
import Divider from '../ui/divider';
import { FilterTabs } from "../ui/filter-tabs";
import Legend from "./components/Legend";
import { useChartType } from "./hooks/useChartType";
import { normalizeBenchmarkSeries, recalculateY } from "./utils";

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

  const filteredFloors = useMemo(
    () => floors.filter((el) => !!el.co2_max),
    [floors]
  );

  const [type, setType] = useState<"co2" | "energy" | "material">("co2");

  // 1. Inicializamos o estado com todos os andares já selecionados
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    filteredFloors.map((f) => f.id)
  );

  const fakeFloors = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy" | "material"],
  )?.map((el) => ({
    ...el,
    label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
  }));

  // Pegando isOpen e isExpanded do Contexto
  const { isExpanded, isOpen } = useSummary();

  const newItems = filteredFloors.map((el) => {
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

  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) return;
    setPreviousProjects(filteredFloors.map((el) => el.id));
  }, [someSelected, filteredFloors]);

  // 2. Lógica de auto-seleção se "someSelected" for false
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

  const avgByUnit = useMemo(() => {
    if (!floors.length || !unit) return 0;
    return floors.reduce(
      (acc, floor) => {
        if (!acc[floor.group_id]) {
          acc[floor.group_id] = { name: "", avg: 0, id: "" };
        }
        acc[floor.group_id] = {
          name: floor.group_name,
          avg:
            (floor[type === "co2" ? "co2_max" : "energy_max"] +
              floor[type === "co2" ? "co2_min" : "energy_min"]) /
            2,
          id: floor.group_id,
        };
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [floors, unit, type]);

  const sum = (Object.values(avgByUnit) as Array<{ avg: number; }>).reduce(
    (acc: number, b: { avg: number; }) => acc + b.avg,
    0 as number,
  );

  const newDataItems = [...fakeFloors, ...(type !== "material" ? newItems.map((item) => item[type]) : [])];

  const minData = useMemo(() => newDataItems.map((d) => d.min ?? d.value ?? 0), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map((d) => d.max ?? d.value ?? 0), [newDataItems]);
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;

  const newData = recalculateY(
    newDataItems,
    minValue,
    maxValue,
  );

  const newNewDataItems = newData.map(el => ({
    ...el,
    label: stackedData.find(eel => eel.id === el.id)?.label
  }));

  // ── DADOS DO GRÁFICO DE BARRAS (MOCK) ─────────────────────────────────────────
  // Substitua as propriedades 'parede', 'fundacao', 'cobertura' pelas corretas do seu payload
  const chartData = filteredFloors.map((el) => ({
    name: el.floor_group || 'Andar',
    parede: Math.floor(Math.random() * 20) + 10,
    fundacao: Math.floor(Math.random() * 10) + 5,
    cobertura: Math.floor(Math.random() * 5) + 2
  }));

  // ── Lógica de Cálculo de P, C, V, R ─────────────────────────────────────────
  const pcvMetrics = useMemo(() => {
    if (!newData || newData.length === 0) {
      return { P: 0, C: 0, V: 0, R: 0, hasSelection: false };
    }

    const sortedMin = [...newData].map((d) => d.min ?? d.value ?? 0).sort((a, b) => a - b);
    const sortedMax = [...newData].map((d) => d.max ?? d.value ?? 0).sort((a, b) => a - b);

    const p5Index = Math.floor(sortedMin.length * 0.05);
    const c5Value = sortedMin[Math.min(p5Index, sortedMin.length - 1)];
    const r5Value = sortedMax[Math.min(p5Index, sortedMax.length - 1)];

    const pValue = c5Value;
    const activeItems = newData.filter(d => selectedProjects.includes(String(d.id)));

    if (activeItems.length === 0) {
      return { P: pValue, C: 0, V: 0, R: 0, hasSelection: false };
    }

    const cValue = activeItems.reduce((acc, curr) => acc + (curr.min ?? curr.value ?? 0), 0) / activeItems.length;
    const rValue = activeItems.reduce((acc, curr) => acc + (curr.max ?? curr.value ?? 0), 0) / activeItems.length;

    let vValue = (c5Value - cValue) + (r5Value - rValue) / 2;
    if (vValue < 0) {
      vValue = (cValue + rValue) / 2;
    }

    return {
      P: pValue,
      C: cValue,
      V: vValue,
      R: rValue,
      hasSelection: true
    };
  }, [newData, selectedProjects]);

  // ── Lógica dos Dados de Valores e Cenários ──────────────────────────────────
  const unitTotal = type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark = type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure?.[type] || "Kg/m²";

  const activeStacked = selectedProjects.length > 0
    ? stackedData.filter(d => selectedProjects.includes(String(d.id)))
    : stackedData;

  const currentDataItems = selectedProjects.length > 0
    ? newData.filter(d => selectedProjects.includes(String(d.id)))
    : newData;

  const totalRefValue = activeStacked.reduce(
    (acc, curr) => acc + ((curr[type as keyof typeof curr] as number) || 0), 0
  );
  const benchmarkRefValue = activeStacked.length > 0 ? totalRefValue / activeStacked.length : 0;

  const bestScenario = currentDataItems.length > 0
    ? Math.min(...currentDataItems.map(d => d.min ?? d.value ?? 0)) : 0;

  const worstScenario = currentDataItems.length > 0
    ? Math.max(...currentDataItems.map(d => d.max ?? d.value ?? 0)) : 0;

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>

      {/* ── BARRA SUPERIOR: Valores e PCVRB ── */}
      <div className='flex justify-between gap-2 w-full'>
        <div className='border-1 border-secondary rounded-md flex p-2 box-border gap-4 max-md:gap-1 h-full'>
          <div className='flex flex-col'>
            <span className='text-secondary font-bold text-small max-md:text-xs'>
              Valor de Ref. - Total ({unitTotal})
            </span>
            <span className='text-xs'>{formatMetric(totalRefValue)}</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-secondary font-bold text-small max-md:text-xs'>
              Valor de Ref. - Benchmark ({unitBenchmark})
            </span>
            <span className='text-xs font-bold'>{formatMetric(benchmarkRefValue)}</span>
          </div>
        </div>
        <div className='flex gap-4 text-[16px] max-md:gap-2 max-md:text-xs'>
          <div className='text-md border-1 border-[#9F70DB] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#9F70DB] font-bold'>P</span>
            <span className='font-bold'>{formatMetric(pcvMetrics.P)}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#6C9EE0] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#6C9EE0] font-bold'>C</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.C) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-secondary rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-secondary font-bold'>V</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.V) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#E0756C] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-[#E0756C] font-bold'>R</span>
            <span className='font-bold'>{pcvMetrics.hasSelection ? formatMetric(pcvMetrics.R) : "-"}</span>
            <span className='font-light'>{currentUnit}</span>
          </div>
          <div className='text-md border-1 border-[#72E06C] bg-[#E2F1C1] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full'>
            <span className='text-black font-bold'>B</span>
            <div className='flex flex-col'>
              <span className='font-bold text-xs'>Classificação</span>
              <span className='font-light text-neutral-400 text-xs'>N: {newData.length} projetos</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL (Exibido quando aberto) ── */}
      {(isOpen || isExpanded) && (
        <div className='flex gap-4'>
          {/* COLUNA ESQUERDA (1/3) */}
          <div className="w-1/3 flex-shrink-0 mt-3 flex flex-col">
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
            <div className='mt-2'>

              {ChartSelector}
            </div>

            <div className='flex gap-3 my-3'>
              <div className='border-1 border-[#6C9EE0] rounded-md w-1/2 p-3 flex flex-col box-border gap-2'>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#6C9EE0]'>Melhor cenário ({unitTotal})</span>
                  <span>-</span>
                </p>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#6C9EE0]'>Melhor cenário ({unitBenchmark})</span>
                  <span className='font-bold'>{formatMetric(bestScenario)}</span>
                </p>
              </div>
              <div className='border-1 border-[#E0756C] rounded-md w-1/2 p-3 flex flex-col box-border gap-2'>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#E0756C]'>Pior cenário ({unitTotal})</span>
                  <span>-</span>
                </p>
                <p className=' flex flex-col text-sm'>
                  <span className='text-[#E0756C]'>Pior cenário ({unitBenchmark})</span>
                  <span className='font-bold'>{formatMetric(worstScenario)}</span>
                </p>
              </div>
            </div>

            <Divider className="mb-4" />

            <EmissionsChart data={chartData} />

            {/* Progresso Dinâmico (Tooltip + Barras) */}
            {/* <div className="w-full mt-6 mb-2">
              <div className="mb-2 text-lg text-gray-600">{unit?.name}</div>
              <div className="flex w-auto">
                {(
                  Object.values(avgByUnit) as Array<{
                    name: string;
                    avg: number;
                    id: string;
                  }>
                ).map((f, idx) => {
                  return f.avg > 0 ? (
                    <div
                      key={f.id}
                      className={cn("mb-2 flex flex-col items-start", {
                        "rounded-l-md": idx === 0,
                        "rounded-r-md": idx === floors.length - 1,
                      })}
                      style={{
                        width: `${((f.avg || 0) / sum) * 100}%`,
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger
                          style={{ backgroundColor: barColors }}
                          className="w-full"
                        >
                          <div className="w-full h-[16px]"></div>
                        </TooltipTrigger>
                        <TooltipContent
                          arrowClassName="bg-white opacity-0"
                          className={cn(
                            "bg-white text-black border-2 border-active shadow-md",
                            {
                              "ml-30": idx === 0,
                            },
                          )}
                        >
                          <span className="text-black text-base p-2">
                            {f.name}: {Math.round((f.avg || 0) * 10) / 10}{" "}
                            {type === "co2" ? "kg CO₂/m²" : "MJ/m²"}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : null;
                })}
              </div>
            </div> */}

            {/* Listagem de Andares (ItemCard / ListItem) */}
            {/* <ul
              className={cn("flex flex-col gap-2 text-xl w-full text-black mt-2", {
                "flex-col gap-2 flex-wrap": isExpanded,
                "max-h-[350px] overflow-y-auto": !isExpanded,
              })}
            >
              {stackedData.map((floor) => {
                if (!floor) return null;
                return isExpanded ? (
                  <ItemCard
                    key={floor.id}
                    item={floor as any}
                    selectedProjects={selectedProjects}
                    handleAddProject={handleAddProject}
                    sum={sum}
                    color={barColors}
                    type={type === "co2" ? "co2" : type === "energy" ? "energy" : "co2"}
                    hasConsumption={true}
                  />
                ) : (
                  <ListItem
                    key={floor.id}
                    item={floor as any}
                    selectedProjects={selectedProjects}
                    handleAddProject={handleAddProject}
                    sum={sum}
                    color={barColors}
                    type={type === "co2" ? "co2" : type === "energy" ? "energy" : "co2"}
                    hasConsumption={true}
                  />
                );
              })}
            </ul> */}
          </div>

          {/* COLUNA DIREITA (flex-1) */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 pt-3">
            <div className="flex flex-col gap-4 w-full">
              <Legend />

              {chartType === "scatter" ? (
                <D3GradientRangeChart
                  data={newNewDataItems}
                  selectedBars={selectedProjects}
                  unit={unitsOfMeasure?.[type as keyof typeof unitsOfMeasure] || ""}
                  totalProjects={fakeFloors.length || newData.length}
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
            </div>


          </div>
        </div>
      )}
    </div>
  );
};

export default FloorSummary;