import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { IUnit } from "@/types/units";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ItemCard from "./components/ItemCard";
import Legend from "./components/Legend";
import ListItem from "./components/ListItem";
import { useChartType } from "./hooks/useChartType";
import { barColors, recalculateY } from "./utils";

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
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const filteredFloors = floors.filter((el) => !!el.co2_max);

  const fakeFloors = data.benchmark?.[type as "co2" | "energy"]
    ?.map((el) => ({
      ...el,
      label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
    }))
    .filter((f) => f.min && f.max);
  const { isExpanded } = useSummary();

  const newItems = filteredFloors.map((el) => {
    return {
      co2: {
        id: el.id,
        y: 0,
        min: el.co2_min,
        max: el.co2_max,
        label: el.group_name,
      },
      energy: {
        id: el.id,
        y: 0,
        min: el.energy_min,
        max: el.energy_max,
        label: el.group_name,
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
      })),
    [newItems],
  );

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
    setPreviousProjects(filteredFloors.map((el) => el.id));
  }, [someSelected]);

  useEffect(() => {
    if (!someSelected) return;
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
  }, [previousProjects, selectedFloors, someSelected]);

  const [subTabs, setSubTabs] = useState<"Pavimentos">("Pavimentos");
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
  }, [floors, unit, fakeFloors]);

  const sum = (Object.values(avgByUnit) as Array<{ avg: number }>).reduce(
    (acc: number, b: { avg: number }) => acc + b.avg,
    0 as number,
  );

  const newDataItems = [...fakeFloors, ...newItems.map((item) => item[type])];

  const minData = useMemo(() => newDataItems.map((d) => d.min), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map((d) => d.max), [newDataItems]);
  const newData = recalculateY(
    newDataItems,
    Math.min(...minData),
    Math.max(...maxData),
  );

  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <FilterTabs
          tabs={["co2", "energy"]}
          onTabSelect={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          onSubTabSelect={(tab) => {
            if (tab === "Pavimentos") setSubTabs(tab as "Pavimentos");
            if (tab === "Selecionar Todos" || tab === "Desmarcar Todos")
              selectAll();
          }}
          subTabs={[
            "Pavimentos",
            selectedProjects.length === floors.length
              ? "Desmarcar Todos"
              : "Selecionar Todos",
          ]}
          selectedSubTab={subTabs}
        />
      </div>
      <div
        className={cn(
          "w-full flex justify-between gap-4 max-md:flex-col max-md:flex-col 2xl:h-[85%] max-sm:h-max",
          {
            "flex flex-col": isExpanded,
          },
        )}
      >
        <div className="flex flex-col items-start w-full">
          {ChartSelector}

          <div className="w-full mb-2">
            <div className="mb-2 text-lg text-gray-600">{unit.name}</div>
            <div className="flex w-auto">
              {(
                Object.values(avgByUnit) as Array<{
                  name: string;
                  avg: number;
                  id: string;
                }>
              ).map((f, idx) => {
                return (
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
                          {type === "co2" ? "kgCO₂/m²" : "MJ/m²"}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
          <ul
            className={cn("flex flex-col gap-2 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap my-4": isExpanded,
              "max-h-[350px] overflow-y-auto ": !isExpanded,
            })}
          >
            {stackedData.map((floor, idx) => {
              if (!floor) return null;
              return isExpanded ? (
                <ItemCard
                  key={floor.id}
                  item={floor as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type}
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
                  type={type}
                  hasConsumption={true}
                />
              );
            })}
          </ul>
          {<Legend />}

          {/* {!isExpanded && <Subtitle />} */}
        </div>
        {chartType == "scatter" ? (
          <D3GradientRangeChart
            data={newData}
            selectedBars={selectedProjects}
            totalProjects={data?.benchmark[type].length || 0}
            minData={minData}
            maxData={maxData}
          />
        ) : (
          <D3GradientRangeLineChart
            data={newData}
            selectedBars={selectedProjects}
            unit={type}
          />
        )}
      </div>
    </>
  );
};

export default FloorSummary;
