import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import NotFoundList from "../ui/not-found-list";
import ItemCard from "./components/ItemCard";
import Legend from "./components/Legend";
import ListItem from "./components/ListItem";
import { useChartType } from "./hooks/useChartType";
import { barColors, normalizeBenchmarkSeries, recalculateY } from "./utils";

type TModules = {
  consumption: {
    co2_max: number;
    co2_min: number;
    energy_max: number;
    energy_min: number;
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
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const filteredProjects = projects.filter((el) => !!el.consumption);

  const newItems: Record<"co2" | "energy", Item>[] = filteredProjects.map(
    (el) => {
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
      };
    },
  ) as any;

  const managedData = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy"],
  )
    .map((el) => ({
      ...el,
      label: projects.find((f) => f.id === el.id)?.name || "",
    }));
  const { isExpanded } = useSummary();

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };
  const [previousProjects, setPreviousProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!someSelected) {
      setSelectedProjects([]);
      return;
    }
    setPreviousProjects(filteredProjects.map((el) => el.id));
  }, [projects, someSelected]);

  useEffect(() => {
    if (!someSelected) return;

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
  }, [previousProjects, projects, someSelected]);

  const [subTabs, setSubTabs] = useState<"Empreendimentos">("Empreendimentos");
  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };
  const newData = [
    ...managedData,
    ...(newItems.map((item) => item[type]) || []),
  ] as any;
  const minData = useMemo(() => newData.map((d: Item) => d.min), [newData]);
  const maxData = useMemo(() => newData.map((d: Item) => d.max), [newData]);
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;
  const updateYs = recalculateY(
    newData,
    minValue,
    maxValue,
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
            if (tab === "Empreendimentos") setSubTabs(tab as "Empreendimentos");
            if (tab === "Selecionar Todos" || tab === "Desmarcar Todos")
              selectAll();
          }}
          subTabs={[
            "Empreendimentos",
            selectedProjects.length === projects.length
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
          {ChartSelector}
          <ul
            className={cn("flex flex-col gap-2 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap": isExpanded,
              "max-h-[600px] overflow-y-auto ": !isExpanded,
            })}
          >
            {" "}
            {(!projects || projects.length === 0) && (
              <NotFoundList
                message="Nenhum empreendimento selecionado."
                description="Por favor, selecione ao menos um empreendimento para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {[
              ...newItems.map((el) => el[type as "co2" | "energy"] || []),
              ...projects.filter(
                (el) =>
                  !el.consumption &&
                  !newItems.some((_el) => _el.co2.id === el.id),
              ),
            ].map((project, _idx) => {
              return (
                <div key={project.id} className="">
                  {!isExpanded ? (
                    <ListItem
                      key={project.id}
                      item={
                        {
                          id: project.id,
                          label: project.min ? project.label : project.name,
                          co2: (project.min + project.max) / 2,
                          energy: (project.min + project.max) / 2,
                        } as any
                      }
                      selectedProjects={selectedProjects}
                      handleAddProject={handleAddProject}
                      sum={newItems
                        .flatMap((el) => el[type])
                        .reduce((acc, curr) => acc + curr.max, 0)}
                      color={barColors}
                      type={type}
                      hasConsumption={!!project.min}
                    />
                  ) : (
                    <ItemCard
                      key={project.id}
                      item={project as any}
                      selectedProjects={selectedProjects}
                      handleAddProject={handleAddProject}
                      sum={newItems
                        .flatMap((el) => el[type])
                        .reduce((acc, curr) => acc + curr.max, 0)}
                      color={barColors}
                      type={type}
                      hasConsumption={
                        !!projects.find((el) => el.id === project.id)
                          ?.consumption
                      }
                    />
                  )}
                </div>
              );
            })}
          </ul>
          <Legend />
        </div>

        {chartType === "scatter" ? (
          <D3GradientRangeChart
            data={updateYs}
            selectedBars={selectedProjects}
            unit={unitsOfMeasure[type] || ""}
            maxData={maxData}
            minData={minData}
            totalProjects={updateYs.length}
            showBaseline
            showTop5Line
            showProcelScale
          />
        ) : (
          <D3GradientRangeLineChart
            data={updateYs}
            selectedBars={selectedProjects}
            unit={type}
          />
        )}
      </div>
    </>
  );
};

export default SimulationsSummary;
