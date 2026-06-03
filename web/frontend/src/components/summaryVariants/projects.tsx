import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { useSummary } from "@/context/summaryContext";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { unitsOfMeasure } from "@/utils/unitsOfMeasure";
import { useEffect, useMemo, useState } from "react";
import D3GradientRangeChart from "../charts/d3chart";
import D3GradientRangeLineChart from "../charts/d3chartLine";
import { FilterTabs } from "../ui/filter-tabs";
import NotFoundList from "../ui/not-found-list";
import ItemCard from "./components/ItemCard";
import Legend from "./components/Legend";
import ListItem from "./components/ListItem";
import { useChartType } from "./hooks/useChartType";
import { barColors, normalizeBenchmarkSeries, recalculateY } from "./utils";

type ProjectsSummaryProps = {
  projects: any[];
  data: IBenchmarkResponse;
  someSelected: boolean;
  showProjectName?: boolean;
};

const ProjectsSummary = ({
  projects,
  data,
  someSelected,
  showProjectName = true,
}: ProjectsSummaryProps) => {
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const { chartType, ChartSelector } = useChartType();
  const { t } = useTranslation();
  const filterProjects = projects.filter((el) => !!el.consumption);
  const managedData = normalizeBenchmarkSeries(
    data.benchmark?.[type as "co2" | "energy" | "material"],
  )
    .map((el) => ({
      ...el,
      label: projects.find((f) => f.id === el.id)?.name || "",
    }));

  const newItems = filterProjects
    .filter((el) => !!el.consumption)
    .map((el) => {
      return {
        co2: {
          id: el.id,
          y: 0,
          min: el.consumption.total.co2_min,
          max: el.consumption.total.co2_max,
          label: el.name,
        },
        energy: {
          id: el.id,
          y: 0,
          min: el.consumption.total.energy_min,
          max: el.consumption.total.energy_max,
          label: el.name,
        },
      };
    });
  const { isExpanded } = useSummary();

  const stackedData = useMemo(
    () =>
      type !== "material"
        ? newItems.map((el) => ({
            id: el[type].id,
            label: el[type].label,
            co2: (el.co2.max + el.co2.min) / 2,
            energy: (el.energy.max + el.energy.min) / 2,
          }))
        : [],
    [newItems, type],
  );

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
    setPreviousProjects(projects.map((el) => el.id));
  }, [projects, someSelected]);

  useEffect(() => {
    if (!someSelected) return;

    if (previousProjects.length < projects.length) {
      const diff = projects.filter((p) => !previousProjects.includes(p.id));
      if (diff.length > 0) {
        setSelectedProjects((prev) => [...prev, ...diff.map((d) => d.id)]);
      }
    } else if (previousProjects.length > projects.length) {
      const diff = previousProjects.filter(
        (p) => !projects.map((u) => u.id).includes(p),
      );
      if (diff.length > 0) {
        setSelectedProjects((prev) => prev.filter((p) => !diff.includes(p)));
      }
    }
  }, [previousProjects, projects, someSelected]);

  const [subTabs, setSubTabs] = useState<string>(t.summary.projects);
  const selectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  };
  const sum = stackedData.reduce(
    (acc, b) => acc + ((b[type as keyof typeof b] as number) || 0),
    0,
  );

  const newDataItems = [...managedData, ...(type !== "material" ? newItems.map((item) => item[type]) : [])];

  const minData = useMemo(() => newDataItems.map((d) => d.min), [newDataItems]);
  const maxData = useMemo(() => newDataItems.map((d) => d.max), [newDataItems]);
  const minValue = minData.length ? Math.min(...minData) : 0;
  const maxValue = maxData.length ? Math.max(...maxData) : 0;
  const newData = recalculateY(
    newDataItems,
    minValue,
    maxValue,
  );

  return (
    <>
      <div className="w-full flex gap-2 mb-4">
        <FilterTabs
          tabs={["co2", "energy", "material"]}
          onTabSelect={(tab) => setType(tab as "co2" | "energy" | "material")}
          selectedTab={type}
          fullWidth
          onSubTabSelect={(tab) => {
            if (tab === t.summary.projects) setSubTabs(tab);
            if (tab === t.card.selectAll || tab === t.summary.deselectAll)
              selectAll();
          }}
          subTabs={[
            t.summary.projects,
            selectedProjects.length === projects.length
              ? t.summary.deselectAll
              : t.card.selectAll,
          ]}
          selectedSubTab={subTabs}
        />
      </div>
      <div
        className={cn(
          "w-full flex justify-between gap-4 max-md:flex-col 2xl:h-[85%] max-sm:h-max",
          {
            "flex flex-col": isExpanded,
          },
        )}
      >
        <div className="flex flex-col items-start w-full justify-between h-full">
          {ChartSelector}
          <ul
            className={cn(
              "flex flex-col gap-2 text-xl w-full text-black flex-1 min-h-0",
              {
                "flex-row gap-2 flex-wrap": isExpanded,
                "overflow-y-auto max-h-[180px] xl:max-h-[150px] 2xl:max-h-[320px]":
                  !isExpanded,
              },
            )}
          >
            {(!stackedData || stackedData.length === 0) && (
              <NotFoundList
                message="Nenhum empreendimento selecionado."
                description="Por favor, selecione ao menos um empreendimento para visualizar o resumo."
                className="bg-transparent border-0 shadow-none"
              />
            )}
            {(stackedData || []).map((project) => {
              if (!project) return null;
              return isExpanded ? (
                <ItemCard
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type as "co2" | "energy"}
                  hasConsumption={
                    !!projects.find((el) => el.id === project.id)?.consumption
                  }
                />
              ) : (
                <ListItem
                  key={project.id}
                  item={project as any}
                  selectedProjects={selectedProjects}
                  handleAddProject={handleAddProject}
                  sum={sum}
                  color={barColors}
                  type={type as "co2" | "energy"}
                  hasConsumption={
                    !!projects.find((el) => el.id === project.id)?.consumption
                  }
                />
              );
            })}
          </ul>
          {<Legend />}
          {/* {!isExpanded && <Subtitle />} */}
        </div>

        {chartType === "scatter" ? (
          <D3GradientRangeChart
            data={newData}
            selectedBars={selectedProjects}
            unit={unitsOfMeasure[type] || ""}
            totalProjects={managedData.length || newData.length}
            minData={minData}
            maxData={maxData}
            showBaseline={type !== "material"}
            showTop5Line={type !== "material"}
            showProcelScale
            showMaxCurve={type !== "material"}
            showMinCurve={type !== "material"}
            showMidCurve={type !== "material"}
            showProjectName={showProjectName}
            variant={type === "material" ? "cumulative" : "range"}
            xAxisLabel={t.benchmark.chartTypes[type === 'co2' || type === 'energy' ? 'cumulativeFraction' : 'material'][type === 'co2' ? 'xAxisLabelCarbon' : 'xAxisLabelEnergy']}
            yAxisLabel={t.benchmark.chartTypes[type === 'co2' || type === 'energy' ? 'cumulativeFraction' : 'material'].yAxisLabel}
          />
        ) : (
          <D3GradientRangeLineChart
            data={newData}
            selectedBars={selectedProjects}
            unit={type}
            showProjectName={showProjectName}
          />
        )}
      </div>
    </>
  );
};

export default ProjectsSummary;
