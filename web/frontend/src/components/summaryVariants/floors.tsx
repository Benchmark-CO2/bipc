import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { IUnit } from "@/types/units";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ItemCard from "./components/ItemCard";
import ListItem from "./components/ListItem";
import { barColors, stackData } from "./utils";

type ProjectsSummaryProps = {
  floors: any[];
  title?: string;
  data: IBenchmarkResponse;
  unit: IUnit;
  selectedFloors: any[];
};

const generateFakeData = (floors: IBenchmarkResponse["benchmark"]["co2"]) => {
  return floors.map((el, idx) => ({
    id: el.id,
    y: 0.2 * (idx + 1),
    min: el.min,
    max: el.max,
    label: "",
  }));
};

const FloorSummary = ({
  floors,
  data,
  unit,
  selectedFloors,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const fakeFloors = generateFakeData(
    data.benchmark?.[type as "co2" | "energy"]
  )
    ?.map((el) => ({
      ...el,
      label: selectedFloors.find((f) => f.id === el.id)?.group_name || "",
    }))
    .filter((f) => f.min && f.max);
  const { isExpanded } = useSummary();
  const stackedData = useMemo(
    () =>
      stackData(selectedFloors, data)?.map((el) => ({
        ...el,
      })),
    [selectedFloors, data]
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
    setPreviousProjects(
      selectedFloors.map(el => el.id)
    );
  }, [selectedFloors]);


  useEffect(() => {
    if (previousProjects.length < selectedFloors.length) {
      const diff = selectedFloors.filter(
        (p) => !previousProjects.includes(p.id)
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => [
          ...prev,
          ...diff.map((d) => d.id),
        ]);
      }
    } else if (previousProjects.length > selectedFloors.length) {
      const diff = previousProjects.filter(
        (p) => !selectedFloors.map((u) => u.id).includes(p)
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) =>
          prev.filter((p) => !diff.includes(p))
        );
      }
    }
  }, [previousProjects, selectedFloors]);

  const [subTabs, setSubTabs] = useState<"Pavimentos">("Pavimentos");
  const selectAll = () => {
    if (selectedProjects.length === selectedFloors.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(selectedFloors.map((f) => f.id));
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
      {} as Record<string, number>
    );
  }, [floors, unit, fakeFloors]);

  const sum = (Object.values(avgByUnit) as Array<{ avg: number }>).reduce(
    (acc: number, b: { avg: number }) => acc + b.avg,
    0 as number
  );

  console.log("floors", stackedData, avgByUnit);
  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <TabsContainer
          tabs={["co2", "energy"]}
          handleTabClick={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          handleClickSubTab={(tab) => {
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
        className={cn("w-full flex justify-between gap-4 max-md:flex-col", {
          "flex flex-col": isExpanded,
        })}
      >
        <div className="flex flex-col items-start w-full">
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
                        style={{ backgroundColor: barColors[idx] }}
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
                          }
                        )}
                      >
                        <span className="text-black text-base p-2">
                          {f.name}: {Math.round((f.avg || 0) * 10) / 10}{" "}
                          {type === "co2" ? "KgCO₂/m²" : "MJ/m²"}
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
                  color={barColors[idx]}
                  type={type}
                />
              ) : (
                <ListItem
                  key={floor.id}
                  item={floor as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors[idx]}
                  type={type}
                />
              );
            })}
          </ul>
          {/* {!isExpanded && <Subtitle />} */}
        </div>
        <D3GradientRangeChart
          data={fakeFloors}
          selectedBars={selectedProjects}
        />
      </div>
    </>
  );
};

export default FloorSummary;
