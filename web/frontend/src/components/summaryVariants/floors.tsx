import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import { TabsContainer } from "../ui/tabsContainer";
import { stackData } from "./utils";
import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { Checkbox } from "../ui/checkbox";
import NotFoundList from "../ui/not-found-list";

type ProjectsSummaryProps = {
  floors: (any & {
    co: number;
    mj: number;
    density: number;
  })[];
  title?: string;
  data: IBenchmarkResponse;
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

const FloorSummary = ({ floors, data }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    floors?.map((floor) => floor.id) || []
  );

  const fakeFloors = generateFakeData(
    data.benchmark?.[type as "co2" | "energy"]
  ).map((el) => ({
    ...el,
    label: floors.find((f) => f.id === el.id)?.group_name || "",
  }));
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
    if (isExpanded) return 700;
    return 220;
  };

  const stackedData = stackData(floors, data);
  // if (!floors.length)
  //   return (
  // <div className="w-full flex flex-col justify-center items-center">
  //   <p className="text-2xl">Nenhum pavimento selecionado.</p>
  // </div>
  //   );

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
        (id) => floors.find((u) => u.id === id) !== undefined
      )
    );
  }, [floors]);

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
            {stackedData.length === 0 && (
              <NotFoundList
                message="Nenhum pavimento selecionado."
                description="Por favor, selecione ao menos um pavimento para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {stackedData.map((floor) => {
              if (!floor) return null;
              return (
                <li
                  key={floor.id}
                  className={cn("flex flex-col w-full items-start gap-3", {
                    "text-sm": isExpanded,
                  })}
                  onClick={() => handleAddProject(floor.id)}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedProjects.includes(floor.id)}
                      onClick={() => handleAddProject(floor.id)}
                    />
                    <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">
                      {floor.label}
                    </h4>
                  </div>
                  <div className="flex w-full h-2 col-span-4">
                    <div
                      style={{
                        width: `${floor.co2}%`,
                      }}
                      className={`bg-pink-500  h-2 rounded-l-md`}
                    />
                    <div
                      style={{
                        width: `${floor.energy}%`,
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
        />
      </div>
    </>
  );
};

export default FloorSummary;
