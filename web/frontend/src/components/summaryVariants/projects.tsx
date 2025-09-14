import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { IProject } from "@/types/projects";
import { useEffect, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";
import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { stackData } from "./utils";
import { Checkbox } from "../ui/checkbox";
import NotFoundList from "../ui/not-found-list";

type ProjectsSummaryProps = {
  projects: IProject[];
  data: IBenchmarkResponse;
};

const colors = [
  "bg-pink-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-red-500",
];

const manageData = (data: ProjectsSummaryProps["data"]["benchmark"]["co2"]) => {
  if (!data) return [];
  return data.map((el, idx) => ({
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
  }));
  const { isExpanded } = useSummary();
  const isMobile = useIsMobile();
  const screenWidth = window.innerWidth;

  const width = () => {
    if (isMobile) return screenWidth * 0.7;
    if (isExpanded) return screenWidth / 2;
    return screenWidth / 2.5;
  };

  const stackedData = stackData(projects, data);

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

  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <TabsContainer
          tabs={["co2", "energy"]}
          handleTabClick={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
        />
      </div>
      <div className="w-full flex justify-between gap-10 max-md:flex-col">
        <div className="flex flex-col items-start w-full">
          <ul className="flex flex-col gap-2 text-xl w-full text-black">
            {(!stackedData || stackedData.length === 0) && (
              <NotFoundList
                message="Nenhum projeto selecionado."
                description="Por favor, selecione ao menos um projeto para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {(stackedData || []).map((project) => {
              if (!project) return null;
              return (
                <li
                  key={project.id}
                  className={cn("flex flex-col w-full items-start gap-3", {
                    "text-sm": isExpanded,
                  })}
                  onClick={() => handleAddProject(project.id)}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onClick={() => handleAddProject(project.id)}
                    />
                    <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">
                      {project.label}
                    </h4>
                  </div>

                  <div className="flex w-full h-2 col-span-4">
                    <div
                      style={{
                        width: `${project.co2 || 0}%`,
                      }}
                      className={cn(`h-2 rounded-r-full`, colors[0])}
                    />
                    <div
                      style={{
                        width: `${project.energy || 0}%`,
                      }}
                      className={cn(`h-2 rounded-r-full`, colors[1])}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* <CustomChart 
            maxWidth={width()}
            maxHeight={height()}
            datachart={projects.reduce((acc, project) => {
              acc['gray'] = [
                ...(acc['gray'] || []),
                { y: (project[type] / (type === 'co' ? coSum : type === 'mj' ? mjSum : densitySum)) * 10, x: project[type], fill: true, label: type + project.name, fillColor: 'hsl(340 75% 55%)' },
              ];
              return acc;
            }, {} as Record<string, DataPoint[]>)} 

          /> */}
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
