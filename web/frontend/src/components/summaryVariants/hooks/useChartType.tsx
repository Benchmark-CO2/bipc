import { FilterTabs } from "@/components/ui/filter-tabs";
import { useState } from "react";

export const useChartType = () => {
  const [chartType, setChartType] = useState<"line" | "scatter">("line");

  const changeChartType = (chartType: string) => {
    setChartType(chartType as "line" | "scatter");
  };

  const ChartSelector = (
    <FilterTabs
      tabs={["scatter", "line"]}
      tabsLabel={{
        line: "Tendência",
        scatter: "Fração acumulada",
      }}
      selectedTab={chartType}
      onTabSelect={changeChartType}
    />
  );

  return { chartType, changeChartType, ChartSelector };
};
