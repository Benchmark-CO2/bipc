import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { Checkbox } from "../ui/checkbox";
import { Tabs } from "../ui/tabs";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";

type ProjectsSummaryProps = {
  techs: (any & {
    co2: number;
    energy: number;
    density: number;
  })[];
  title?: string;
};

const manageData = (floors: ProjectsSummaryProps["techs"]) => {
  return floors.map((el, idx) => ({
    id: el.id,
    y: 0.2 * (idx + 1),
    min: el.co2_min,
    max: el.co2_max,
    label: el?.type,
  }));
};

const TechnologiesSummary = ({ techs }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "density">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    techs?.map((tech) => tech.id) || []
  );

  const fakeFloors = manageData(techs);
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

  if (!techs.length)
    return (
      <div className="w-full flex flex-col justify-center items-center">
        <p className="text-2xl">Nenhuma Tecnologia construtiva selecionada.</p>
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
          <Tabs
            tabs={["co2", "energy", "density"]}
            handleTabClick={(tab) =>
              setType(tab as "co2" | "energy" | "density")
            }
            selectedTab={type}
          />
        </div>
        <ul className="flex flex-col gap-2 text-xl w-full text-black">
          {techs.map((unit) => {
            const sum = unit.min + unit.max;
            return (
              <li
                key={unit.id}
                className={cn("flex flex-col w-full items-start gap-3", {
                  "text-sm": isExpanded,
                })}
                onClick={() => handleAddProject(unit.id)}
              >
                <div className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedProjects.includes(unit.id)}
                    onClick={() => handleAddProject(unit.id)}
                  />
                  <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">
                    {unit.label}
                  </h4>
                </div>
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
        data={fakeFloors}
        selectedBars={selectedProjects}
        unit={unitsOfMeasure[type as keyof typeof unitsOfMeasure] || ""}
      />
    </div>
  );
};

export default TechnologiesSummary;
