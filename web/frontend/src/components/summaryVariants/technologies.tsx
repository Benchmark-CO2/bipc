import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import EmissionsChart from "../charts/barChart";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import Divider from "../ui/divider";
import { FilterTabs } from "../ui/filter-tabs";
import { IndicatorList } from "./components/indicatorsList";
import Legend from "./components/Legend";
import { useChartType } from "./hooks/useChartType";
import { getCategoryValue, translateCategory } from "./units";
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
  const { chartType, ChartSelector } = useChartType();
  const { t } = useTranslation();
  const translations = t as unknown as Translations;

  const filteredProjects = useMemo(
    () => projects.filter((el) => !!el.consumption),
    [projects],
  );

  const [type, setType] = useState<"co2" | "energy" | "material">("co2");

  // 1. Inicializamos com todos os projetos selecionados
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    filteredProjects.map((p) => p.id),
  );

  const newItems: Record<"co2" | "energy" | "material", Item>[] =
    filteredProjects.map((el) => {
      return {
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
          value: el?.consumption?.total.material || 0,
          label: el.name,
        },
      };
    }) as any;

  const managedData = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy" | "material"],
  ).map((el) => ({
    ...el,
    label: projects.find((f) => f.id === el.id)?.name || "",
  }));

  const { isExpanded, isOpen } = useSummary();

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) return;
    setPreviousProjects(filteredProjects.map((el) => el.id));
  }, [filteredProjects, someSelected]);

  // 2. Lógica de auto-seleção se "someSelected" for false
  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects(filteredProjects.map((p) => p.id));
      return;
    }

    if (previousProjects.length < projects.length) {
      const diff = filteredProjects.filter(
        (p) => !previousProjects.includes(p.id),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > projects.length) {
      const diff = previousProjects.filter(
        (p) => !projects.map((u) => u.id).includes(p),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, projects, someSelected, filteredProjects]);

  const [subTabs, setSubTabs] = useState<string>(
    t.summaryTechnologies.projects,
  );

  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };

  const listType: "co2" | "energy" | "material" = type;

  const newData = [
    ...managedData,
    ...(type !== "material"
      ? newItems.map((item) => item[listType]) || []
      : []),
  ] as any;

  const minData = useMemo(
    () => newData.map((d: Item) => d.min ?? (d as any).value ?? 0),
    [newData],
  );
  const maxData = useMemo(
    () => newData.map((d: Item) => d.max ?? (d as any).value ?? 0),
    [newData],
  );
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;
  const updateYs = recalculateY(newData, minValue, maxValue);

  const listSum =
    type !== "material"
      ? newItems
          .flatMap((el) => el[listType])
          .reduce((acc, curr) => acc + curr.max, 0)
      : 0;

  // ── DADOS DO GRÁFICO DE BARRAS (MOCK) ─────────────────────────────────────────
  // const chartData = filteredProjects.map((el) => ({
  //   name: el.name || 'Simulação',
  //   parede: Math.floor(Math.random() * 20) + 10,
  //   fundacao: Math.floor(Math.random() * 10) + 5,
  //   cobertura: Math.floor(Math.random() * 5) + 2
  // }));

  const chartData = filteredProjects.map((el) => {
    const dataRow: Record<string, any> = {
      name: el.name || translations.summaryUnits.defaultUnitName,
    };

    // Pega o objeto de consumos da unidade
    const cons = el.consumption || {};

    Object.entries(cons).forEach(([key, values]) => {
      if (key !== "total") {
        const translatedKey =
          translateCategory(key, translations.summaryUnits.categories) || key;
        dataRow[translatedKey] = getCategoryValue(values, type);
      }
    });

    return dataRow;
  });

  // ── PROGRESS BAR CÁLCULO (Tooltips) ─────────────────────────────────────────
  const avgByProject = useMemo(() => {
    if (!projects.length) return 0;
    return projects.reduce(
      (acc, proj) => {
        if (!proj.consumption) return acc;
        if (!acc[proj.id]) {
          acc[proj.id] = { name: proj.name, avg: 0, id: proj.id };
        }
        if (type === "material") {
          acc[proj.id].avg = proj.consumption.total.material || 0;
        } else {
          const min =
            type === "co2"
              ? proj.consumption.total.co2_min
              : proj.consumption.total.energy_min;
          const max =
            type === "co2"
              ? proj.consumption.total.co2_max
              : proj.consumption.total.energy_max;
          acc[proj.id].avg = (min + max) / 2;
        }
        return acc;
      },
      {} as Record<string, { name: string; avg: number; id: string }>,
    );
  }, [projects, type]);

  const sumByProject = (
    Object.values(avgByProject) as Array<{ avg: number }>
  ).reduce((acc: number, b: { avg: number }) => acc + b.avg, 0 as number);

  // ── LÓGICA DE P, C, V, R ────────────────────────────────────────────────────
  const pcvMetrics = useMemo(() => {
    if (!updateYs || updateYs.length === 0) {
      return { P: 0, C: 0, V: 0, R: 0, hasSelection: false };
    }

    const sortedMin = [...updateYs]
      .map((d) => d.min ?? d.value ?? 0)
      .sort((a, b) => a - b);
    const sortedMax = [...updateYs]
      .map((d) => d.max ?? d.value ?? 0)
      .sort((a, b) => a - b);

    const p5Index = Math.floor(sortedMin.length * 0.05);
    const c5Value = sortedMin[Math.min(p5Index, sortedMin.length - 1)];
    const r5Value = sortedMax[Math.min(p5Index, sortedMax.length - 1)];

    const pValue = c5Value;
    const activeItems = updateYs.filter((d: any) =>
      selectedProjects.includes(String(d.id)),
    );

    if (activeItems.length === 0) {
      return { P: pValue, C: 0, V: 0, R: 0, hasSelection: false };
    }

    const cValue =
      activeItems.reduce(
        (acc, curr) => acc + (curr.min ?? curr.value ?? 0),
        0,
      ) / activeItems.length;
    const rValue =
      activeItems.reduce(
        (acc, curr) => acc + (curr.max ?? curr.value ?? 0),
        0,
      ) / activeItems.length;

    let vValue = c5Value - cValue + (r5Value - rValue) / 2;
    if (vValue < 0) {
      vValue = (cValue + rValue) / 2;
    }

    return {
      P: pValue,
      C: cValue,
      V: vValue,
      R: rValue,
      hasSelection: true,
    };
  }, [updateYs, selectedProjects]);

  // ── Lógica dos Dados de Valores e Cenários ──────────────────────────────────
  const unitTotal =
    type === "energy" ? "MJ" : type === "material" ? "kg" : "kg CO₂";
  const unitBenchmark =
    type === "energy" ? "MJ/m²" : type === "material" ? "kg/m²" : "kg/m² CO₂";
  const currentUnit = unitsOfMeasure[type] || "Kg/m²";

  const stackedData = useMemo(
    () =>
      newItems.map((el) => ({
        id: el[type].id,
        label: el[type].label,
        co2: ((el.co2.max || 0) + (el.co2.min || 0)) / 2,
        energy: ((el.energy.max || 0) + (el.energy.min || 0)) / 2,
        material: (el as any).material?.value || 0,
      })),
    [newItems, type],
  );

  const activeStacked =
    selectedProjects.length > 0
      ? stackedData.filter((d) => selectedProjects.includes(String(d.id)))
      : stackedData;

  const currentDataItems =
    selectedProjects.length > 0
      ? updateYs.filter((d: any) => selectedProjects.includes(String(d.id)))
      : updateYs;

  const totalRefValue = activeStacked.reduce(
    (acc, curr) => acc + ((curr[type as keyof typeof curr] as number) || 0),
    0,
  );
  const benchmarkRefValue =
    activeStacked.length > 0 ? totalRefValue / activeStacked.length : 0;

  const bestScenario =
    currentDataItems.length > 0
      ? Math.min(...currentDataItems.map((d) => d.min ?? (d as any).value ?? 0))
      : 0;

  const worstScenario =
    currentDataItems.length > 0
      ? Math.max(...currentDataItems.map((d) => d.max ?? (d as any).value ?? 0))
      : 0;

  const formatMetric = (val: number) =>
    val.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>
      {/* ── BARRA SUPERIOR: Valores e PCVRB ── */}
      <div className="flex justify-between gap-2 w-full">
        <div className="border-1 border-secondary rounded-md flex p-2 box-border gap-4 max-md:gap-1 h-full">
          <div className="flex flex-col">
            <span className="text-secondary font-semibold text-small max-md:text-xs">
              Valor de Ref. - Total ({unitTotal})
            </span>
            <span className="text-xs">{formatMetric(totalRefValue)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-secondary font-semibold text-small max-md:text-xs">
              Valor de Ref. - Benchmark ({unitBenchmark})
            </span>
            <span className="text-xs font-bold">
              {formatMetric(benchmarkRefValue)}
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-[16px] max-md:gap-2 max-md:text-xs">
          <IndicatorList
            indicators={[
              {
                color: "#9F70DB",
                currentUnit,
                value: formatMetric(pcvMetrics.P),
                label: "P",
              },
              {
                color: "#6C9EE0",
                currentUnit,
                value: formatMetric(pcvMetrics.C),
                label: "C",
              },
              {
                color: "#E0756C",
                currentUnit,
                value: formatMetric(pcvMetrics.R),
                label: "R",
              },
            ]}
          />
          <div className="text-md border-1 border-[#72E06C] bg-[#E2F1C1] rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full">
            <span className="text-black font-bold">B</span>
            <div className="flex flex-col">
              <span className="font-bold text-xs">Classificação</span>
              <span className="font-light text-neutral-400 text-xs">
                N: {updateYs.length} projetos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL (Exibido quando aberto) ── */}
      {(isOpen || isExpanded) && (
        <div className="flex gap-4">
          {/* COLUNA ESQUERDA (1/3) */}
          <div className="w-1/3 flex-shrink-0 mt-3 flex flex-col">
            <FilterTabs
              tabs={["co2", "energy", "material"]}
              onTabSelect={(tab) =>
                setType(tab as "co2" | "energy" | "material")
              }
              selectedTab={type}
              fullWidth
              onSubTabSelect={(tab) => {
                if (tab === t.summaryTechnologies.projects) setSubTabs(tab);
                if (
                  tab === t.summary.selectAll ||
                  tab === t.summary.deselectAll
                )
                  selectAll();
              }}
              subTabs={[
                t.summaryTechnologies.projects,
                selectedProjects.length === projects.length
                  ? t.summary.deselectAll
                  : t.summary.selectAll,
              ]}
              selectedSubTab={subTabs}
            />
            <div className="mt-2">{ChartSelector}</div>

            <div className="flex gap-3 my-3">
              <div className="border-1 border-[#6C9EE0] rounded-md w-1/2 p-3 flex flex-col box-border gap-2">
                <p className=" flex flex-col text-sm">
                  <span className="text-[#6C9EE0]">
                    Melhor cenário ({unitTotal})
                  </span>
                  <span>-</span>
                </p>
                <p className=" flex flex-col text-sm">
                  <span className="text-[#6C9EE0]">
                    Melhor cenário ({unitBenchmark})
                  </span>
                  <span className="font-bold">
                    {formatMetric(bestScenario)}
                  </span>
                </p>
              </div>
              <div className="border-1 border-[#E0756C] rounded-md w-1/2 p-3 flex flex-col box-border gap-2">
                <p className=" flex flex-col text-sm">
                  <span className="text-[#E0756C]">
                    Pior cenário ({unitTotal})
                  </span>
                  <span>-</span>
                </p>
                <p className=" flex flex-col text-sm">
                  <span className="text-[#E0756C]">
                    Pior cenário ({unitBenchmark})
                  </span>
                  <span className="font-bold">
                    {formatMetric(worstScenario)}
                  </span>
                </p>
              </div>
            </div>

            <Divider className="mb-4" />

            <EmissionsChart data={chartData} />

            {/* Progresso Dinâmico (Tooltip + Barras) */}
            {/* <div className="w-full mt-6 mb-2">
              <div className="flex w-auto">
                {(
                  Object.values(avgByProject) as Array<{
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
                        "rounded-r-md": idx === Object.values(avgByProject).length - 1,
                      })}
                      style={{
                        width: `${((f.avg || 0) / sumByProject) * 100}%`,
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

            {/* Listagem de Projetos (ItemCard / ListItem) */}
            {/* <ul
              className={cn("flex flex-col gap-2 text-xl w-full text-black mt-2", {
                "flex-row gap-2 flex-wrap": isExpanded,
                "max-h-[350px] overflow-y-auto": !isExpanded,
              })}
            >
              {(!projects || projects.length === 0) && (
                <NotFoundList
                  message={t.summaryTechnologies.noProjectSelected}
                  description={t.summaryTechnologies.noProjectDescription}
                  className="bg-transparent border-0 shadow-none"
                />
              )}
              {[
                ...(newItems.map((el) => el[listType])),
                ...projects.filter(
                  (el) =>
                    !el.consumption &&
                    !newItems.some((_el) => _el.co2.id === el.id),
                ),
              ].map((project, _idx) => {
                return (
                  <div key={project.id} className="w-full">
                    {!isExpanded ? (
                      <ListItem
                        key={project.id}
                        item={
                          {
                            id: project.id,
                            label: project.min ? project.label : project.name,
                            co2: ((project.min || 0) + (project.max || 0)) / 2,
                            energy: ((project.min || 0) + (project.max || 0)) / 2,
                          } as any
                        }
                        selectedProjects={selectedProjects}
                        handleAddProject={handleAddProject}
                        sum={listSum}
                        color={barColors}
                        type={listType}
                        hasConsumption={!!project.min}
                      />
                    ) : (
                      <ItemCard
                        key={project.id}
                        item={project as any}
                        selectedProjects={selectedProjects}
                        handleAddProject={handleAddProject}
                        sum={listSum}
                        color={barColors}
                        type={listType}
                        hasConsumption={
                          !!projects.find((el) => el.id === project.id)?.consumption
                        }
                      />
                    )}
                  </div>
                );
              })}
            </ul> */}
          </div>

          {/* COLUNA DIREITA (flex-1) */}
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-4 pt-1">
            <div className="flex flex-col gap-4 w-full">
              <Legend />

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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationsSummary;
