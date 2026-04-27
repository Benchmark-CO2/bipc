import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ItemCard from "./components/ItemCard";
import Legend from "./components/Legend";
import ListItem from "./components/ListItem";
import { useChartType } from "./hooks/useChartType";
import { barColors, normalizeBenchmarkSeries, recalculateY } from "./utils";

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
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const filteredUnits = units.filter((el) => !!el.consumptions);

  const fakeUnits = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy"],
  )
    .map((el) => ({
      ...el,
      label: selectedUnits.find((f) => f.id === el.id)?.name || "",
    }));

  const newItems = filteredUnits.map((el) => {
    return {
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
    };
  });
  const { isExpanded } = useSummary();

  const stackedData = useMemo(
    () =>
      newItems.map((el) => ({
        id: el[type].id,
        label: el[type].label,
        co2: (el.co2.max + el.co2.min) / 2,
        energy: (el.energy.max + el.energy.min) / 2,
      })),
    [newItems],
  );

  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) return;
    setPreviousProjects(selectedUnits.map((el) => el.id));
  }, [selectedUnits, someSelected]);

  useEffect(() => {
    if (!someSelected) return;
    if (previousProjects.length < selectedUnits.length) {
      const diff = filteredUnits.filter(
        (p) => !previousProjects.includes(p.id),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > selectedUnits.length) {
      const diff = previousProjects.filter(
        (p) => !filteredUnits.map((u) => u.id).includes(p),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, selectedUnits, someSelected]);

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };
  const [selectedSubTab, setSelectedSubTab] =
    useState<"Edificações">("Edificações");
  const selectAll = () => {
    if (selectedProjects.length === filteredUnits.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredUnits.map((f) => f.id));
    }
  };

  const avgByUnit = useMemo(() => {
    if (!units.length || !project) return 0;
    return units.reduce(
      (acc, unit) => {
        if (!acc[unit.id]) {
          acc[unit.id] = { name: "", avg: 0, id: "" };
        }
        acc[unit.id] = {
          name: unit.name,
          avg:
            (unit[type === "co2" ? "co2_max" : "energy_max"] +
              unit[type === "co2" ? "co2_min" : "energy_min"]) /
            2,
          id: unit.id,
        };
        if (!acc[unit.id].avg) delete acc[unit.id];
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [units, project, type]);

  const sum = (Object.values(avgByUnit) as Array<{ avg: number }>).reduce(
    (acc: number, b: { avg: number }) => acc + b.avg,
    0 as number,
  );

  const newDataItems = [...fakeUnits, ...newItems.map((item) => item[type])];

  const minData = useMemo(() => newDataItems.map((d) => d.min), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map((d) => d.max), [newDataItems]);
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;
  const newData = recalculateY(
    newDataItems,
    minValue,
    maxValue,
  );

  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>
      <div className="w-full flex gap-2 mb-4">
        <FilterTabs
          tabs={["co2", "energy"]}
          onTabSelect={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          subTabs={[
            "Edificações",
            selectedProjects.length === units.length
              ? "Desmarcar Todos"
              : "Selecionar Todos",
          ]}
          onSubTabSelect={(tab) => {
            if (tab === "Edificações") setSelectedSubTab(tab as "Edificações");
            if (tab === "Selecionar Todos" || tab === "Desmarcar Todos")
              selectAll();
          }}
          selectedSubTab={selectedSubTab}
        />
      </div>

      <div
        className={cn(
          "w-full flex justify-between gap-4 max-md:flex-col 2xl:h-[85%] max-sm:h-max",
          {
            "flex flex-col h-full justify-between": isExpanded,
          },
        )}
      >
        <div className="flex flex-col items-start w-full">
          {ChartSelector}
          <div className="w-full mb-2">
            <div className="mb-2 text-lg text-gray-600">{project.name}</div>
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
                      "rounded-r-md": idx === units.length - 1,
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
          </div>
          <ul
            className={cn("flex flex-col gap-2 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap my-4": isExpanded,
              "max-h-[350px] overflow-y-auto ": !isExpanded,
            })}
          >
            {stackedData.map((unit, idx) => {
              if (!unit) return null;

              return isExpanded ? (
                <ItemCard
                  key={unit.id}
                  item={unit as any}
                  handleAddProject={handleAddProject}
                  selectedProjects={selectedProjects}
                  sum={sum}
                  color={barColors}
                  type={type}
                  hasConsumption={!!unit[type]}
                />
              ) : (
                <ListItem
                  key={unit.id}
                  item={unit as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type}
                  hasConsumption={!!unit[type]}
                />
              );
            })}
          </ul>
          <Legend />
          {/* {!isExpanded && <Subtitle />} */}
        </div>
        {chartType === "scatter" ? (
          <D3GradientRangeChart
            data={newData}
            selectedBars={selectedProjects}
            unit={unitsOfMeasure[type as keyof typeof unitsOfMeasure] || ""}
            minData={minData}
            maxData={maxData}
            totalProjects={fakeUnits.length || newData.length}
            showBaseline
            showTop5Line
            showProcelScale
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
  );
};

export default UnitsSummary;
