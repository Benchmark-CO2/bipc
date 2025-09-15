import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { IProject } from "@/types/projects";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import NotFoundList from "../ui/not-found-list";
import { TabsContainer } from "../ui/tabsContainer";
import ItemCard from "./components/ItemCard";
import ListItem from "./components/ListItem";
import Subtitle from './components/Subtitle';
import { stackData } from "./utils";

type ProjectsSummaryProps = {
  projects: IProject[];
  data: IBenchmarkResponse;
};

const manageData = (data: ProjectsSummaryProps["data"]["benchmark"]["co2"]) => {
  if (!data) return [];
  return data.map((el) => ({
    ...el,
    label: "",
  }));
};
const ProjectsSummary = ({ projects, data }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  // const coSum = data.reduce((acc, project) => acc + project.min, 0);
  // const mjSum = data.reduce((acc, project) => acc + project.max, 0);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    projects.map((project) => project.id)
  );

  const managedData = manageData(
    data.benchmark?.[type as "co2" | "energy"] || []
  ).map((el) => ({
    ...el,
    label: projects.find((f) => f.id === el.id)?.name || "",
  })).filter(f => f.min && f.max);
  const { isExpanded } = useSummary();
  const isMobile = useIsMobile();
  const screenWidth = window.innerWidth;

  const width = () => {
    if (isMobile) return screenWidth * 0.7;
    if (isExpanded) return screenWidth / 2;
    return screenWidth / 2.5;
  };

  const stackedData = useMemo(
    () =>
      stackData(projects, data)?.map((el) => ({
        ...el,
        concreteWall: Math.random() * (10000 - 800) + 800,
        beamColumn: Math.random() * (10000 - 800) + 800,
        structural: Math.random() * (10000 - 800) + 800,
      })),
    [projects, data]
  );

  const height = () => {
    if (isMobile && !isExpanded) return 250;
    if (isMobile && isExpanded) return 320;
    if (isExpanded) return 700;
    return 220;
  };

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  useEffect(() => {
    setSelectedProjects(
      selectedProjects.filter(
        (id) => projects.find((u) => u.id === id) !== undefined
      )
    );
  }, [projects]);
  const [subTabs, setSubTabs] = useState<"Projetos">("Projetos");

  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <TabsContainer
          tabs={["co2", "energy"]}
          handleTabClick={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          handleClickSubTab={(tab) => setSubTabs(tab as "Projetos")}
          subTabs={["Projetos"]}
          selectedSubTab={subTabs}
        />
      </div>
      <div
        className={cn("w-full flex justify-between gap-4 max-md:flex-col", {
          "flex flex-col": isExpanded,
        })}
      >
        <div className="flex flex-col items-start w-full">
          <ul
            className={cn("flex flex-col gap-10 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap": isExpanded,
            })}
          >
            {" "}
            {(!stackedData || stackedData.length === 0) && (
              <NotFoundList
                message="Nenhum projeto selecionado."
                description="Por favor, selecione ao menos um projeto para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {(stackedData || []).map((project) => {
              if (!project) return null;
              const sum =
                (project.beamColumn || 0) +
                (project.concreteWall || 0) +
                (project.structural || 0);
              return isExpanded ? (
                <ItemCard
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                />
              ) : (
                <ListItem
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                />
              );
            })}
          </ul>
          {!isExpanded && <Subtitle  />}

        </div>
        <D3GradientRangeChart
          width={width()}
          height={height()}
          data={managedData}
          selectedBars={selectedProjects}
        />
      </div>
    </>
  );
};

export default ProjectsSummary;
