import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { IProject } from "@/types/projects";
import { useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";

type ProjectsSummaryProps = {
  projects: IProject[];
};

const data = [
  { id: "1", y: 0.0, min: 10, max: 40, label: "projeto 1" },
  { id: "2", y: 0.1, min: 15, max: 55, label: "projeto 2" },
  { id: "3", y: 0.2, min: 20, max: 60, label: "projeto 3" },
  { id: "4", y: 0.3, min: 25, max: 80, label: "projeto 4" },
  { id: "5", y: 0.4, min: 35, max: 85, label: "projeto 5" },
];

const generateFakeData = (projects: ProjectsSummaryProps["projects"]) => {
  return projects.map((el, idx) => ({
    id: el.id,
    y: 0.2 * (idx + 1),
    min: el.consumption.co2_min,
    max: el.consumption.co2_max,
    label: el.name,
  }));
};
const ProjectsSummary = ({ projects }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co" | "mj" | "density">("co");
  // const coSum = data.reduce((acc, project) => acc + project.min, 0);
  // const mjSum = data.reduce((acc, project) => acc + project.max, 0);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    projects.map((project) => project.id)
  );
  const fakeProjects = generateFakeData(projects);
  const { isExpanded } = useSummary();
  const isMobile = useIsMobile();
  const screenWidth = window.innerWidth;

  const width = () => {
    if (isMobile) return screenWidth * 0.7;
    if (isExpanded) return screenWidth / 2;
    return screenWidth / 2.5;
  };

  const height = () => {
    if (isMobile && !isExpanded) return 250;
    if (isMobile && isExpanded) return 320;
    if (isExpanded) return 800;
    return 220;
  };

  if (!projects.length)
    return (
      <div className="w-full flex flex-col justify-center items-center">
        <p className="text-2xl">Nenhum projeto selecionado.</p>
      </div>
    );

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  return (
    <div className="w-full flex justify-between gap-10 max-md:flex-col">
      <div className="flex flex-col items-start w-full">
        <div className="w-full flex gap-2 mb-10">
          <TabsContainer
            tabs={["co", "mj", "density"]}
            handleTabClick={(tab) => setType(tab as "co" | "mj" | "density")}
            selectedTab={type}
          />
        </div>
        <ul className="flex flex-col gap-2 text-xl w-full text-black">
          {fakeProjects.map((project) => {
            const sum = project.min + project.max;
            return (
              <li
                key={project.id}
                className={cn("flex flex-col w-full items-start gap-3", {
                  "text-sm": isExpanded,
                })}
                onClick={() => handleAddProject(project.id)}
              >
                              <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">{project.label} {selectedProjects.includes(project.id) && <span className='w-2 h-2 bg-active rounded-full' />}</h4>

                <div className="flex w-full h-2 col-span-4">
                  <div
                    style={{
                      width: `${(sum / 2 / sum) * 100}%`,
                    }}
                    className={`bg-pink-500  h-2 rounded-l-md`}
                  />
                  <div
                    style={{
                      width: `${(sum / 2 / sum) * 100}%`,
                    }}
                    className={`bg-yellow-500 h-2 rounded-r-full`}
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
        data={fakeProjects}
        selectedBars={selectedProjects}
      />
    </div>
  );
};

export default ProjectsSummary;
