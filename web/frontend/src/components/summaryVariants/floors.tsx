import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import NotFoundList from "../ui/not-found-list";
import { TabsContainer } from "../ui/tabsContainer";
import ItemCard from './components/ItemCard';
import ListItem from './components/ListItem';
import Subtitle from './components/Subtitle';
import { stackData } from "./utils";

type ProjectsSummaryProps = {
  floors: (any)[];
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
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const fakeFloors = generateFakeData(
    data.benchmark?.[type as "co2" | "energy"]
  )?.map((el) => ({
    ...el,
    label: floors.find((f) => f.id === el.id)?.group_name || "",
  })).filter(f => f.min && f.max);
  const { isExpanded } = useSummary();
  const stackedData = useMemo(() => stackData(floors, data)?.map((el) => ({
      ...el,
      concreteWall: Math.random() * (10000 - 800) + 800,
      beamColumn: Math.random() * (10000 - 800) + 800,
      structural: Math.random() * (10000 - 800) + 800,
    })), [floors, data]);

  
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

  const [subTabs, setSubTabs] = useState<"Pavimentos">("Pavimentos");
  const selectAll = () => {
    if (selectedProjects.length === floors.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(floors.map((f) => f.id));
    }
  };
  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <TabsContainer
          tabs={["co2", "energy"]}
          handleTabClick={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          fullWidth
          handleClickSubTab={(tab) => {
            if (tab === "Pavimentos") setSubTabs(tab as "Pavimentos");
            if (tab === "Selecionar Todos" || tab === "Desmarcar Todos") selectAll();
          }}
          subTabs={["Pavimentos", selectedProjects.length === floors.length
            ? "Desmarcar Todos"
            : "Selecionar Todos"]}
          selectedSubTab={subTabs}
        />
      </div>
      <div
        className={cn("w-full flex justify-between gap-4 max-md:flex-col", {
          "flex flex-col": isExpanded,
        })}
      >        <div className="flex flex-col items-start w-full">
        <ul
            className={cn("flex flex-col gap-10 text-xl w-full text-black", {
              "flex-row gap-2 flex-wrap": isExpanded,
              "max-h-[400px] overflow-y-auto": !isExpanded,
            })}
          >            {stackedData.length === 0 && (
              <NotFoundList
                message="Nenhum pavimento selecionado."
                description="Por favor, selecione ao menos um pavimento para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {stackedData.map((floor) => {
              if (!floor) return null;
              const sum =
                (floor.beamColumn) +
                (floor.concreteWall) +
                (floor.structural);
              return isExpanded ? (
                <ItemCard key={floor.id} item={floor as any}   selectedProjects={selectedProjects} handleAddProject={handleAddProject} sum={sum} />
              ) : (
                <ListItem 
                  key={floor.id}
                  item={floor as any} 
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
          data={fakeFloors}
          selectedBars={selectedProjects}
        />
      </div>
    </>
  );
};

export default FloorSummary;
