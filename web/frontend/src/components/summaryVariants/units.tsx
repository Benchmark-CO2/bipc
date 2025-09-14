import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";
import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { stackData } from "./utils";
import { Checkbox } from "../ui/checkbox";

type ProjectsSummaryProps = {
  units: (any & {
    co: number;
    mj: number;
    density: number;
  })[];
  data: IBenchmarkResponse
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
  if (!units.length) return [];
  return units.map((el, idx) => ({
    ...el,
    label: ``,
  }));
};

const UnitsSummary = ({ units, data }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    units?.map((unit) => unit.id) || []
  );
  const fakeUnits = generateFakeData(data.benchmark?.[type as "co2" | "energy"] || []).map(el => ({
        ...el,
        label: units.find(f => f.id === el.id)?.name || ''
      })
  );
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
  const stackedData = stackData(units, data);
  // if (!units.length)
  //   return (
  //     <div className="w-full flex flex-col justify-center items-center">
  //       <p className="text-2xl">Nenhuma unidade selecionada.</p>
  //     </div>
  //   );

  useEffect(() => {
    setSelectedProjects(selectedProjects.filter(id => units.find(u => u.id === id) !== undefined))
  }, [units])
  
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
            tabs={["co2", "energy"]}
            handleTabClick={(tab) => setType(tab as "co2" | "energy")}
            selectedTab={type}
          />
        </div>
        <ul className="flex flex-col gap-2 text-xl w-full text-black">
          {stackedData.length === 0 && (
            <div className="w-full flex flex-col justify-center items-center">
              <p className="text-gray-500">Nenhuma unidade selecionada.</p>
            </div>
          )}
          {stackedData.map((unit) => {
            if (!unit) return null;
            return (
              <li
                key={unit.id}
                className={cn("flex flex-col w-full items-start gap-3", {
                  "text-sm": isExpanded,
                })}
                onClick={() => handleAddProject(unit.id)}
              >
                <div className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={selectedProjects.includes(unit.id)} onClick={() => handleAddProject(unit.id)} />
                  <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">{unit.label}</h4>
                </div>
                <div className="flex w-full h-2 col-span-4">
                  <div
                    style={{
                      width: `${unit.co2}%`,
                    }}
                    className={`bg-pink-500  h-2 rounded-l-md`}
                  />
                  <div
                    style={{
                      width: `${unit.energy}%`,
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
