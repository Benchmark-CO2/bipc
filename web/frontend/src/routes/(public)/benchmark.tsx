import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import {
  IBenchmarkSeries,
  IBenchmarkSeriesPoint,
} from "@/actions/benchmarks/types";
import Logo from "@/assets/logo_full.svg";
import BrazilMapChart, {
  type MapChartStats,
} from "@/components/charts/brazilMapChart";
import D3RangeChart from "@/components/charts/d3chartCUM";
import D3GradientRangeLineChart, {
  SeriesPoint,
} from "@/components/charts/d3chartLine";
import Legend from "@/components/summaryVariants/components/Legend";
import { FilterTabs } from "@/components/ui/filter-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBenchmarkFilters } from "@/hooks/useBenchmarkFilters";
import { useBenchmarkMapData } from "@/hooks/useBenchmarkMapData";
import { useWindowSize } from "@/hooks/useWindowSize";
import { useTranslation } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type BenchmarkPoint = {
  id: string;
  minId: string;
  maxId: string;
  y: number;
  min: number;
  max: number;
  label: string;
  floors?: string | number;
  technology?: string[];
};

// Para o scatter chart: ordenar por y e parear min+max pela ordem
const normalizeBenchmarkSeries = (
  series?: IBenchmarkSeries | IBenchmarkSeriesPoint[] | undefined,
): BenchmarkPoint[] => {
  if (!series) return [];
  if (series instanceof Array && series.length > 0 && "value" in series[0])
    return series as unknown as BenchmarkPoint[]; // Apenas para material, que já vem pareado e ordenado

  const sortByY = (
    a: IBenchmarkSeries["min"][number],
    b: IBenchmarkSeries["min"][number],
  ) => a.y - b.y;
  const minList = [...((series as IBenchmarkSeries).min || [])].sort(sortByY);
  const maxList = [...((series as IBenchmarkSeries).max || [])].sort(sortByY);
  const pairCount = Math.min(minList.length, maxList.length);

  return Array.from({ length: pairCount }, (_, index) => {
    const minItem = minList[index];
    const maxItem = maxList[index];

    return {
      id: minItem.id,
      minId: minItem.id,
      maxId: maxItem.id,
      y: minItem.y,
      min: minItem.value,
      max: maxItem.value,
      label: "",
      floors: minItem.floors ?? maxItem.floors,
      technology: minItem.technology ?? maxItem.technology,
    };
  });
};

// Para o line chart: cada série é independente, sem join por id
const toSeriesPoints = (arr?: IBenchmarkSeries["min"]): SeriesPoint[] =>
  (arr || []).map((p) => ({ id: p.id, y: p.y, value: p.value }));

export const Route = createFileRoute("/(public)/benchmark")({
  component: RouteComponent,
  loader: ({ context }: { context: any }) => {
    return {
      auth: context.auth,
    };
  },
});

function RouteComponent() {
  const { FilterSection, activeBuildFilter, type, setType } =
    useBenchmarkFilters();
  const { t } = useTranslation();
  const { data: filteredResponse } = useQuery({
    queryKey: ["units-benchmarks", JSON.stringify(activeBuildFilter)],
    queryFn: () =>
      getProjectsBenchmark({
        technology:
          activeBuildFilter.technology.length > 0
            ? activeBuildFilter.technology
            : undefined,
        floors: activeBuildFilter.floors.get() || undefined,
      }),
  });

  const { data: baseResponse, isLoading: isBaseLoading } = useQuery({
    queryKey: ["units-benchmarks-base"],
    queryFn: () => getProjectsBenchmark({}),
  });

  const hasActiveFilter =
    activeBuildFilter.technology.length > 0 || !!activeBuildFilter.floors.get();

  const mapData = useBenchmarkMapData(
    baseResponse,
    type === "material" ? "co2" : type,
  );
  const filteredMapData = useBenchmarkMapData(
    filteredResponse,
    type === "material" ? "co2" : type,
  );
  const activeMapResult =
    hasActiveFilter && filteredMapData.states.length > 0
      ? filteredMapData
      : mapData;

  const baseChartData: BenchmarkPoint[] = normalizeBenchmarkSeries(
    baseResponse?.data?.benchmark?.[type],
  );

  const filteredChartData: BenchmarkPoint[] = normalizeBenchmarkSeries(
    filteredResponse?.data?.benchmark?.[type],
  );

  const chartData = useMemo(
    () => (baseChartData.length > 0 ? baseChartData : filteredChartData),
    [baseChartData, filteredChartData],
  );

  // Line chart: séries independentes sem join por id
  const baseMinSeries = useMemo(
    () =>
      toSeriesPoints(
        type !== "material"
          ? baseResponse?.data?.benchmark?.[type]?.min
          : undefined,
      ),
    [baseResponse, type],
  );
  const baseMaxSeries = useMemo(
    () =>
      toSeriesPoints(
        type !== "material"
          ? baseResponse?.data?.benchmark?.[type]?.max
          : undefined,
      ),
    [baseResponse, type],
  );
  const filteredMinSeries = useMemo(
    () =>
      toSeriesPoints(
        type !== "material"
          ? filteredResponse?.data?.benchmark?.[type]?.min
          : undefined,
      ),
    [filteredResponse, type],
  );
  const filteredMaxSeries = useMemo(
    () =>
      toSeriesPoints(
        type !== "material"
          ? filteredResponse?.data?.benchmark?.[type]?.max
          : undefined,
      ),
    [filteredResponse, type],
  );

  const lineMinSeries = hasActiveFilter ? filteredMinSeries : baseMinSeries;
  const lineMaxSeries = hasActiveFilter ? filteredMaxSeries : baseMaxSeries;
  const selectedFilteredMinIds = useMemo(
    () => (hasActiveFilter ? filteredMinSeries.map((d) => d.id) : []),
    [hasActiveFilter, filteredMinSeries],
  );
  const selectedFilteredMaxIds = useMemo(
    () => (hasActiveFilter ? filteredMaxSeries.map((d) => d.id) : []),
    [hasActiveFilter, filteredMaxSeries],
  );

  const selectedFilteredIds = useMemo(
    () => (hasActiveFilter ? selectedFilteredMinIds : []),
    [hasActiveFilter, selectedFilteredMinIds],
  );

  const [selectedChart, setSelectedChart] = useState("co2");
  const [mapStats, setMapStats] = useState<MapChartStats | null>(null);
  const { height: viewportHeight } = useWindowSize();
  const chartMaxHeight = Math.round(viewportHeight * 0.6);

  const maxData = chartData.map((d) => (d.max !== undefined ? d.max : 0));
  const minData = chartData.map((d) =>
    d.min !== undefined ? d.min : Infinity,
  );

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[1920px] px-6 lg:px-12 py-10 flex flex-col">
        <h1 className="text-3xl font-bold text-primary">
          {t.benchmark.pageTitle}
        </h1>
        <div className="h-full w-full flex flex-col-reverse items-start gap-10 pt-10 xl:gap-20 xl:grid xl:grid-cols-[clamp(300px,33vw,440px)_1fr] transition-all">
          {FilterSection}
          <div className="w-full min-w-0 flex flex-col items-start">
            <div className="w-full flex flex-wrap items-start gap-x-4 gap-y-4 mb-2">
              <div className="w-full sm:w-auto flex flex-col gap-2">
                <h2 className="text-primary font-semibold">
                  {t.benchmark.visualization}
                </h2>
                <Select onValueChange={setSelectedChart} value={selectedChart}>
                  <SelectTrigger className="w-full sm:w-[200px] !h-10">
                    <SelectValue placeholder={t.benchmark.chartPlaceholder} />
                  </SelectTrigger>
                  <SelectContent defaultValue={"co2"}>
                    {/* <SelectItem value="trend">
                      {t.benchmark.chartTrend}
                    </SelectItem> */}
                    <SelectItem value="co2">
                      {t.benchmark.chartBenchmark}
                    </SelectItem>
                    <SelectItem value="map">{t.benchmark.chartMap}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedChart !== "map" && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-primary font-semibold">
                    {t.benchmark.filters.indicators}
                  </h2>
                  <FilterTabs
                    tabs={["co2", "energy", "material"]}
                    onTabSelect={(tab) =>
                      setType(tab as "co2" | "energy" | "material")
                    }
                    selectedTab={type}
                    className="!h-10 !py-0"
                  />
                </div>
              )}
              {selectedChart === "map" && mapStats && (
                <div className="flex-1 min-w-[280px] flex items-stretch gap-4">
                  <div className="hidden sm:block w-px bg-border" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-primary font-semibold">
                        {mapStats.isStateView
                          ? mapStats.stateName
                          : t.brazilMap.title}
                      </h2>
                      {mapStats.isStateView && (
                        <span className="text-sm text-muted-foreground font-medium">
                          {mapStats.sigla}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t.d3chart.numberOfProjects}:{" "}
                        <span className="font-medium text-foreground">
                          {mapStats.projectCount}
                        </span>
                      </span>
                      {(mapStats.isStateView
                        ? mapStats.unmatchedCount
                        : mapStats.noStateCount) > 0 && (
                        <span
                          title={
                            mapStats.isStateView
                              ? t.brazilMap.unmatchedTooltip
                              : t.brazilMap.noStateTooltip
                          }
                        >
                          · ⚠{" "}
                          {mapStats.isStateView
                            ? mapStats.unmatchedCount
                            : mapStats.noStateCount}{" "}
                          {mapStats.isStateView
                            ? t.brazilMap.unmatchedWarning
                            : t.brazilMap.noStateWarning}
                        </span>
                      )}
                    </div>
                    <div className="self-end">
                      <Legend variant="map" maxCount={mapStats.maxCount} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full">
              {isBaseLoading ? (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  {t.benchmark.loadingData}
                </div>
              ) : selectedChart === "trend" ? (
                <D3GradientRangeLineChart
                  minSeriesData={lineMinSeries}
                  maxSeriesData={lineMaxSeries}
                  selectedBars={selectedFilteredIds}
                  unit={type === "co2" ? "kg CO₂/m²" : "MJ/m²"}
                  summary={false}
                />
              ) : selectedChart === "map" ? (
                <BrazilMapChart
                  data={activeMapResult.states}
                  totalCount={activeMapResult.totalCount}
                  noStateCount={activeMapResult.noStateCount}
                  unit={type === "co2" ? "kg CO₂/m²" : "MJ/m²"}
                  className="w-full"
                  maxHeight={chartMaxHeight}
                  allowZoom
                  onStatsChange={setMapStats}
                />
              ) : (
                <D3RangeChart
                  height={Math.round(window.innerHeight * 0.6)}
                  data={chartData}
                  selectedBars={selectedFilteredIds}
                  selectedMinBars={selectedFilteredMinIds}
                  selectedMaxBars={selectedFilteredMaxIds}
                  minData={minData}
                  maxData={maxData}
                  totalProjects={baseChartData.length || chartData.length}
                  unit={type === "co2" ? "kg CO₂/m²" : "MJ/m²"}
                  hideBars
                  showProcelScale
                  showBaseline={type !== "material"}
                  showTop5Line={type !== "material"}
                  showMaxCurve={type !== "material"}
                  showMinCurve={type !== "material"}
                  variant={type === "material" ? "cumulative" : "range"}
                  xAxisLabel={
                    t.benchmark.chartTypes[
                      type === "co2" || type === "energy"
                        ? "cumulativeFraction"
                        : "material"
                    ][type === "co2" ? "xAxisLabelCarbon" : "xAxisLabelEnergy"]
                  }
                  yAxisLabel={
                    t.benchmark.chartTypes[
                      type === "co2" || type === "energy"
                        ? "cumulativeFraction"
                        : "material"
                    ].yAxisLabel
                  }
                />
              )}
            </div>

            {selectedChart !== "map" && (
              <div className="flex flex-col gap-1 mt-4">
                <strong className="text-xs text-gray-shade-500">
                  {t.benchmark.legend}
                </strong>
                <p className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 block rounded-full bg-[#3b82f6]"></div>{" "}
                  <i>{t.benchmark.bestSupplier}</i>
                </p>
                <p className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 block rounded-full bg-[#E36F35]"></div>{" "}
                  <i>{t.benchmark.worstSupplier}</i>
                </p>
              </div>
            )}
          </div>
        </div>
        <section className="w-full mt-30">
          <h2 className="mb-8 text-3xl text-primary font-semibold">
            {t.benchmark.howItWorks}
          </h2>
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12 mt-10">
            {/* Logo column */}
            <div className="w-full lg:w-2/5 flex justify-center lg:justify-start">
              <img
                src={Logo}
                alt="BIPc logo"
                className="w-full max-w-[400px]"
              />
            </div>

            {/* Text column */}
            <div className="flex flex-col gap-6 w-full lg:w-3/5">
              <p>{t.benchmark.aboutP1}</p>
              <p>{t.benchmark.aboutP2}</p>
              <p>{t.benchmark.aboutP3}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
