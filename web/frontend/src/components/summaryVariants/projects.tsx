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
import Legend from './components/Legend';
import ListItem from "./components/ListItem";
import { useChartType } from "./hooks/useChartType";
import { barColors, recalculateY, stackData } from "./utils";

type ProjectsSummaryProps = {
  projects: any[];
  data: IBenchmarkResponse;
  someSelected: boolean;
};

const manageData = (data: ProjectsSummaryProps["data"]["benchmark"]["co2"]) => {
  if (!data) return [];
  return data.map((el) => ({
    ...el,
    label: "",
  }));
};
const ProjectsSummary = ({ projects, data, someSelected }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const filterProjects = projects.filter(el => !!el.consumption);
  const managedData = manageData(data.benchmark?.[type as "co2" | "energy"])
    .map((el) => ({
      ...el,
      label: projects.find((f) => f.id === el.id)?.name || "",
    }))
    .filter((f) => f.min && f.max);

  const newItems = filterProjects.filter(el => !!el.consumption).map(el => {
    return {
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
    }
  })
  const { isExpanded } = useSummary();

  const stackedData = useMemo(
    () =>
      stackData(projects, data)?.map((el) => ({
        ...el,
      })),
    [projects, data]
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
    if (!someSelected) {
      setSelectedProjects([]);
      return;
    }
    setPreviousProjects(
      projects.map(el => el.id)
    );
  }, [projects, someSelected]);

  useEffect(() => {
    if (!someSelected) return

    if (previousProjects.length < projects.length) {
      const diff = projects.filter((p) => !previousProjects.includes(p.id));
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > projects.length) {
      const diff = previousProjects.filter(
        (p) => !projects.map((u) => u.id).includes(p)
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, projects, someSelected]);

  const [subTabs, setSubTabs] = useState<"Projetos">("Projetos");
  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  };
  const sum = stackedData.reduce(
    (acc, b) => acc + ((b[type as keyof typeof b] as number) || 0),
    0
  );

  const newDataItems = [...managedData, ...newItems.map(item => item[type])]

  const minData = useMemo(() => newDataItems.map(d => d.min), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map(d => d.max), [newDataItems]);
  const newData = recalculateY(newDataItems, Math.min(...minData), Math.max(...maxData));

  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <FilterTabs
          tabs={["co2", "energy"]}
          onTabSelect={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          onSubTabSelect={(tab) => {
            if (tab === "Projetos") setSubTabs(tab as "Projetos");
            if (tab === "Selecionar Todos" || tab === "Desmarcar Todos")
              selectAll();
          }}
          subTabs={[
            "Projetos",
            selectedProjects.length === projects.length
              ? "Desmarcar Todos"
              : "Selecionar Todos",
          ]}
          selectedSubTab={subTabs}
        />
      </div>
      <div
        className={cn("w-full flex justify-between gap-4 max-md:flex-col 2xl:h-[85%] max-sm:h-max", {
          "flex flex-col": isExpanded,
        })}
      >
        <div className="flex flex-col items-start w-full justify-between h-full">
          {ChartSelector}
          <ul
            className={cn("flex flex-col gap-2 text-xl w-full text-black h-full", {
              "flex-row gap-2 flex-wrap": isExpanded,
              "max-h-[280px] overflow-y-auto xl:max-h-[200px] 2xl:max-h-[420px]": !isExpanded,
            })}
          >
            {(!stackedData || stackedData.length === 0) && (
              <NotFoundList
                message="Nenhum projeto selecionado."
                description="Por favor, selecione ao menos um projeto para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {(stackedData || []).map((project, idx) => {
              if (!project) return null;
              return isExpanded ? (
                <ItemCard
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type}
                  hasConsumption={!!projects.find(el => el.id === project.id)?.consumption}
                />
              ) : (
                <ListItem
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type}
                  hasConsumption={!!projects.find(el => el.id === project.id)?.consumption}
                />
              );
            })}
          </ul>
          {<Legend />}
          {/* {!isExpanded && <Subtitle />} */}
        </div>

        {chartType === "scatter" ? (
          <D3GradientRangeChart
            data={newData}
            selectedBars={selectedProjects}
            unit={unitsOfMeasure[type] || ""}
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

export default ProjectsSummary;
