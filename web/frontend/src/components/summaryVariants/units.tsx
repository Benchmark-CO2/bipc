import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";

type ProjectsSummaryProps = {
  units: (any & {
    co: number;
    mj: number;
    density: number;
  })[];
};
const calculateProgress = (project: ProjectsSummaryProps["units"][number]) => {
  const total = project.co + project.mj + project.density;
  return {
    co: (project.co / total) * 100,
    mj: (project.mj / total) * 100,
    density: (project.density / total) * 100,
  };
};
const data = [
  { id: "1", y: 0.0, min: 10, max: 40, label: "unidade 1" },
  { id: "2", y: 0.1, min: 15, max: 55, label: "unidade 2" },
  { id: "3", y: 0.2, min: 20, max: 60, label: "unidade 3" },
  { id: "4", y: 0.3, min: 25, max: 80, label: "unidade 4" },
  { id: "5", y: 0.4, min: 35, max: 85, label: "unidade 5" },
];

const generateFakeData = (units: ProjectsSummaryProps["units"]) => {
  return units.map((el, idx) => ({
    id: el.id,
    y: 0.2 * (idx + 1),
    min: el.co2_min + 1 * (idx + 1),
    max: el.co2_max + 5 * (idx + 1),
    label: el.name,
  }));
};

const UnitsSummary = ({ units }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co" | "mj" | "density">("co");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    units?.map((unit) => unit.id) || []
  );
  const fakeUnits = generateFakeData(units);
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

  if (!units.length)
    return (
      <div className="w-full flex flex-col justify-center items-center">
        <p className="text-2xl">Nenhuma unidade selecionada.</p>
      </div>
    );

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  console.log("selectedProjects", units);
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
          {fakeUnits.map((unit) => {
            const sum = unit.min + unit.max;
            return (
              <li
                key={unit.id}
                className={cn("flex flex-col w-full items-start gap-3", {
                  "text-sm": isExpanded,
                })}
                onClick={() => handleAddProject(unit.id)}
              >
                <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">{unit.label} {selectedProjects.includes(unit.id) && <span className='w-2 h-2 bg-active rounded-full' />}</h4>
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
      <D3GradientRangeChart
        width={width()}
        height={height()}
        data={fakeUnits}
        selectedBars={selectedProjects}
      />
    </div>
  );
};

export default UnitsSummary;
