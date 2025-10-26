import { TabsContainer } from "@/components/ui/tabsContainer";
import { useState } from "react";

export const useChartType = () => {
  const [chartType, setChartType] = useState<"line" | "scatter">("line");

  const changeChartType = (chartType: string) => {
    setChartType(chartType as "line" | "scatter");
  };

  const ChartSelector = (
    <TabsContainer
      tabs={["scatter", "line"]}
      tabsLabel={{
        line: "Tendência",
        scatter: "Fração acumulada",
      }}
      selectedTab={chartType}
      handleTabClick={changeChartType}
    />
  );


  return { chartType, changeChartType, ChartSelector };
}