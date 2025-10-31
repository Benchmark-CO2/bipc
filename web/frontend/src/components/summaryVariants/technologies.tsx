import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import NotFoundList from '../ui/not-found-list';
import ItemCard from './components/ItemCard';
import Legend from './components/Legend';
import ListItem from './components/ListItem';
import { useChartType } from "./hooks/useChartType";
import { barColors, recalculateY } from "./utils";

type TModules = {
  consumption: {
    co2_max: number;
    co2_min: number;
    energy_max: number;
    energy_min: number;
  };
  id: string;
  type: string;
  label: string
} 
type SimulationData = {
  active: boolean
  id: string
  modules: TModules[]
  name: string
  tower_id: string
  area: number
};

type ProjectsSummaryProps = {
  projects: SimulationData[];
  data: IBenchmarkResponse;
  someSelected: boolean;
};

type Item = {
  id: string;
  y: number;
  min: number;
  max: number;
  label: string;
};

const manageData = (data: ProjectsSummaryProps["data"]["benchmark"]["co2"]) => {
  if (!data) return [];
  return data.map((el) => ({
    ...el,
    label: "",
  }));
};
const SimulationsSummary = ({ projects, data, someSelected }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();

  const newItemsTotals: {
    co2: {
      id: string;
      y: number;
      min: number;
      max: number;
      label: string;
    },
    energy: {
      id: string;
      y: number;
      min: number;
      max: number;
      label: string;
    }
  }[] = projects.map(el => ({
    co2: {
      id: el.id,
      y: 0,
      min: el.modules.reduce((acc, curr) => acc + curr.consumption.co2_min, 0)/el.area,
      max: el.modules.reduce((acc, curr) => acc + curr.consumption.co2_max, 0)/el.area,
      label: el.name
    },
    energy: {
      id: el.id,
      y: 0,
      min: el.modules.reduce((acc, curr) => acc + curr.consumption.energy_min, 0)/el.area,
      max: el.modules.reduce((acc, curr) => acc + curr.consumption.energy_max, 0)/el.area,
      label: el.name
    }
  }));
  const newItems: Record<'co2' | 'energy', Item>[] = projects.map(el => ({
    co2: {
      id: el.id,
      y: 0,
      min: el.modules.reduce((acc, curr) => acc + curr.consumption.co2_min, 0)/el.area,
      max: el.modules.reduce((acc, curr) => acc + curr.consumption.co2_max, 0)/el.area,
      label: el.name
    },
    energy: {
      id: el.id,
      y: 0,
      min: el.modules.reduce((acc, curr) => acc + curr.consumption.energy_min, 0)/el.area,
      max: el.modules.reduce((acc, curr) => acc + curr.consumption.energy_max, 0)/el.area,
      label: el.name
    }
  }));

  const managedData = manageData((data.benchmark?.[type as "co2" | "energy"] || []))
    .map((el) => ({
      ...el,
      label: projects.find((f) => f.id === el.id)?.name || "",
    }))
    .filter((f) => f.min && f.max);
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
  const newData = [...managedData, ...(newItems.map(item => item[type]) || [])] as any;
  const minData = useMemo(() => newData.map((d: Item) => d.min), [newData]);
  const maxData = useMemo(() => newData.map((d: Item) => d.max), [newData]);
  const updateYs = recalculateY(newData, minData[0], maxData[maxData.length - 1]);

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
                message="Nenhum projeto selecionado."
                description="Por favor, selecione ao menos um projeto para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {
              (newItems.map(el => el[type as 'co2' | 'energy'] || [])).map(project => (
                <div key={project.id} className=''>
                  {!isExpanded ? (
                    <ListItem
                      key={project.id}
                      item={{
                        id: project.id,
                        label: project.label,
                        co2: (project.min + project.max) / 2,
                        energy: (project.min + project.max) / 2,
                      } as any}
                      selectedProjects={selectedProjects}
                      handleAddProject={handleAddProject}
                      sum={newItems.flatMap(el => el[type]).reduce((acc, curr) => acc + curr.max, 0)}
                        color={barColors}
                        type={type}
                      />
                    ) : (
                      <ItemCard
                        key={project.id}
                        item={{
                          id: project.id,
                          label: project.name,
                          co2: project.modules.flatMap(el => el.consumption).reduce((acc, curr) => acc + ((type === 'co2' ? curr.co2_max + curr.co2_min : curr.energy_max + curr.energy_min) / 2), 0),
                          energy: project.modules.flatMap(el => el.consumption).reduce((acc, curr) => acc + ((type === 'co2' ? curr.co2_max + curr.co2_min : curr.energy_max + curr.energy_min) / 2), 0),
                        } as any}
                        selectedProjects={selectedProjects}
                        handleAddProject={handleAddProject}
                        sum={newItemsTotals.flatMap(el => el[type]).reduce((acc, curr) => acc + curr.max, 0)}
                        color={barColors}
                        type={type}
                      />)}
                </div>
              ))
            }
            {/* {(stackedData || []).map((project, idx) => {
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
                />
              );
            })} */}
          </ul>
          {<Legend  />}
          {/* {!isExpanded && <Subtitle />} */}
        </div>

        {chartType === "scatter" ? (
          <D3GradientRangeChart
            data={updateYs}
            selectedBars={selectedProjects}
            unit={unitsOfMeasure[type] || ""}
            maxData={maxData}
            minData={minData}
            totalProjects={updateYs.length}
          />
        ) : (
          <D3GradientRangeLineChart
            data={managedData}
            selectedBars={selectedProjects}
          />
        )}
      </div>
    </>
  );
};

export default SimulationsSummary;
