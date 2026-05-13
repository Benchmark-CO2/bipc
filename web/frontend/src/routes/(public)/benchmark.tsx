import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { IBenchmarkSeries } from "@/actions/benchmarks/types";
import Logo from "@/assets/logo_full.svg";
import D3GradientRangeChart from "@/components/charts/d3chart";
import D3GradientRangeLineChart, { SeriesPoint } from "@/components/charts/d3chartLine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBenchmarkFilters } from "@/hooks/useBenchmarkFilters";
import { useTranslation } from "@/i18n";

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
const normalizeBenchmarkSeries = (series?: IBenchmarkSeries): BenchmarkPoint[] => {
  if (!series) return [];

  const sortByY = (a: IBenchmarkSeries["min"][number], b: IBenchmarkSeries["min"][number]) =>
    a.y - b.y;
  const minList = [...(series.min || [])].sort(sortByY);
  const maxList = [...(series.max || [])].sort(sortByY);
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
  const { FilterSection, activeBuildFilter, type } = useBenchmarkFilters();
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
    () => toSeriesPoints(baseResponse?.data?.benchmark?.[type]?.min),
    [baseResponse, type],
  );
  const baseMaxSeries = useMemo(
    () => toSeriesPoints(baseResponse?.data?.benchmark?.[type]?.max),
    [baseResponse, type],
  );
  const filteredMinSeries = useMemo(
    () => toSeriesPoints(filteredResponse?.data?.benchmark?.[type]?.min),
    [filteredResponse, type],
  );
  const filteredMaxSeries = useMemo(
    () => toSeriesPoints(filteredResponse?.data?.benchmark?.[type]?.max),
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
        <div className="h-full w-full flex items-start pt-10 justify-between max-lg:flex-col-reverse gap-10 xl:gap-20 transition-all">
          {FilterSection}
          <div className="w-full max-lg:w-full! flex flex-col items-start">
            <div className="flex flex-col w-full gap-4 ">
              <h2 className="text-primary font-semibold">{t.benchmark.visualization}</h2>
              <div className="flex flex-wrap gap-4 justify-between items-center mb-2">
                <Select onValueChange={setSelectedChart} value={selectedChart}>
                  <SelectTrigger className="w-[200px] self-start mb-4">
                    <SelectValue placeholder={t.benchmark.chartPlaceholder} />
                  </SelectTrigger>
                  <SelectContent defaultValue={"co2"}>
                    <SelectItem value="trend">
                      {t.benchmark.chartTrend}
                    </SelectItem>
                    <SelectItem value="co2">{t.benchmark.chartBenchmark}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              ) : (
                <D3GradientRangeChart
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
                  showBaseline
                  showTop5Line
                  showMaxCurve
                  showMinCurve
                />
              )}
            </div>

            <div className="flex flex-col gap-1 mt-4">
              <strong className="text-xs text-gray-shade-500">{t.benchmark.legend}</strong>
              <p className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 block rounded-full bg-[#3b82f6]"></div>{" "}
                <i>{t.benchmark.bestSupplier}</i>
              </p>
              <p className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 block rounded-full bg-[#E36F35]"></div>{" "}
                <i>{t.benchmark.worstSupplier}</i>
              </p>
            </div>
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
