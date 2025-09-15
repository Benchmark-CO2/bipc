import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import NotFoundList from "../ui/not-found-list";
import { TabsContainer } from "../ui/tabsContainer";
import ItemCard from "./components/ItemCard";
import ListItem from "./components/ListItem";
import Subtitle from './components/Subtitle';
import { stackData } from "./utils";

type ProjectsSummaryProps = {
  units: (any & {
    co: number;
    mj: number;
    density: number;
  })[];
  data: IBenchmarkResponse;
};

const generateFakeData = (units: ProjectsSummaryProps["units"]) => {
  if (!units.length) return [];
  return units.map((el) => ({
    ...el,
    label: ``,
  }));
};

const UnitsSummary = ({ units, data }: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const fakeUnits = generateFakeData(
    data.benchmark?.[type as "co2" | "energy"] || []
  ).map((el) => ({
    ...el,
    label: units.find((f) => f.id === el.id)?.name || "",
  })).filter(f => f.min && f.max);
  const { isExpanded } = useSummary();

  const stackedData = useMemo(
    () =>
      stackData(units, data)?.map((el) => ({
        ...el,
        concreteWall: Math.random() * (8000 - 1000) + 1000,
        beamColumn: Math.random() * (8000 - 1000) + 1000,
        structural: Math.random() * (8000 - 1000) + 1000,
      })),
    [units, data]
  );

  useEffect(() => {
    setSelectedProjects(
      selectedProjects.filter(
        (id) => units.find((u) => u.id === id) !== undefined
      )
    );
  }, [units]);

  const handleAddProject = (projectId: string) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };
  const [selectedSubTab, setSelectedSubTab] = useState<"Unidades">("Unidades");
  return (
    <div className={cn({ "flex flex-col gap-4": true, "h-full": isExpanded })}>
      <div className="w-full flex gap-2 mb-4">
        <TabsContainer
          tabs={["co2", "energy"]}
          handleTabClick={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          subTabs={["Unidades"]}
          handleClickSubTab={(tab) =>
            setSelectedSubTab(tab as "Unidades")
          }
          selectedSubTab={selectedSubTab}
        />
      </div>
      <div
        className={cn("w-full flex justify-between gap-4 max-md:flex-col", {
          "flex flex-col": isExpanded,
        })}
      >
        <div className="flex flex-col items-start w-full">
          <ul
            className={cn("flex flex-col gap-2 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap": isExpanded,
              "max-h-[300px] overflow-y-auto ": !isExpanded
            })}
          >
            {stackedData.length === 0 && (
              <NotFoundList
                message="Nenhuma unidade selecionada."
                description="Por favor, selecione ao menos uma unidade para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {stackedData.map((unit) => {
              if (!unit) return null;
              const sum = unit.concreteWall + unit.beamColumn + unit.structural;

              return isExpanded ? (
                <ItemCard
                  key={unit.id}
                  item={unit as any}
                  handleAddProject={handleAddProject}
                  selectedProjects={selectedProjects}
                  sum={sum}
                />
              ) : (
                <ListItem
                  key={unit.id}
                  item={unit as any}
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
          data={fakeUnits}
          selectedBars={selectedProjects}
        />
      </div>
    </div>
  );
};

export default UnitsSummary;
