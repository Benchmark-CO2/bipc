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
import { useIsMobile } from "@/hooks/useIsMobile";

type BenchmarkPoint = {
  id: string;
  y: number;
  min: number;
  max: number;
  label: string;
  floors?: string | number;
  technology?: string[];
};

// Para o scatter chart: join min+max pelo mesmo id (projetos que aparecem nos dois)
const normalizeBenchmarkSeries = (series?: IBenchmarkSeries): BenchmarkPoint[] => {
  if (!series) return [];

  const minList = series.min || [];
  const maxById = new Map((series.max || []).map((item) => [item.id, item]));

  return minList.reduce<BenchmarkPoint[]>((acc, minItem) => {
      const maxItem = maxById.get(minItem.id);
      if (!maxItem) return acc;

      acc.push({
        id: minItem.id,
        y: minItem.y,
        min: minItem.value,
        max: maxItem.value,
        label: "",
        floors: minItem.floors ?? maxItem.floors,
        technology: minItem.technology ?? maxItem.technology,
      });

      return acc;
    }, []);
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

  const isMobile = useIsMobile();
  const hasActiveFilter =
    activeBuildFilter.technology.length > 0 || !!activeBuildFilter.floors.get();

  const baseChartData: BenchmarkPoint[] = normalizeBenchmarkSeries(
    baseResponse?.data?.benchmark?.[type],
  );

  const filteredChartData: BenchmarkPoint[] = normalizeBenchmarkSeries(
    filteredResponse?.data?.benchmark?.[type],
  );

  const chartData = useMemo(() => {
    const merged = new Map(baseChartData.map((item) => [item.id, item]));

    filteredChartData.forEach((item) => {
      const baseItem = merged.get(item.id);

      if (baseItem) {
        // Keep baseline y to preserve visual ordering and only update range values.
        merged.set(item.id, {
          ...baseItem,
          min: item.min,
          max: item.max,
          floors: item.floors,
          technology: item.technology,
        });
        return;
      }

      merged.set(item.id, item);
    });

    return Array.from(merged.values());
  }, [baseChartData, filteredChartData]);

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

  const selectedFilteredIds = useMemo(
    () =>
      hasActiveFilter
        ? [...filteredMinSeries.map((d) => d.id), ...filteredMaxSeries.map((d) => d.id)]
        : [],
    [hasActiveFilter, filteredMinSeries, filteredMaxSeries],
  );

  const width = (window.innerWidth - 421) * 0.5;
  const height = window.innerHeight * 0.5;
  const [selectedChart, setSelectedChart] = useState("co2");

  const maxData = chartData.map((d) => (d.max !== undefined ? d.max : 0));
  const minData = chartData.map((d) =>
    d.min !== undefined ? d.min : Infinity,
  );

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[1920px] px-6 lg:px-12 py-10 flex flex-col">
        <h1 className="text-3xl font-bold text-primary">
          Benchmark | Visualização dos dados
        </h1>
        <div className="h-full w-full flex items-start pt-10 justify-between max-lg:flex-col-reverse gap-10 xl:gap-20 transition-all">
          {FilterSection}
          <div className="w-full max-lg:w-full! flex flex-col items-start">
            <div className="flex flex-col w-full gap-4 ">
              <h2 className="text-primary font-semibold">Visualização:</h2>
              <div className="flex flex-wrap gap-4 justify-between items-center mb-2">
                <Select onValueChange={setSelectedChart} value={selectedChart}>
                  <SelectTrigger className="w-[200px] self-start mb-4">
                    <SelectValue placeholder="Gráfico" />
                  </SelectTrigger>
                  <SelectContent defaultValue={"co2"}>
                    <SelectItem value="trend">
                      Curva das pegadas máxima e mínima
                    </SelectItem>
                    <SelectItem value="co2">Benchmark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-full">
              {isBaseLoading ? (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Carregando dados...
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
                  width={width}
                  height={height}
                  data={chartData}
                  selectedBars={selectedFilteredIds}
                  overrideDimensions={!isMobile}
                  minData={minData}
                  maxData={maxData}
                  totalProjects={baseChartData.length || chartData.length}
                  unit={type === "co2" ? "kg CO₂/m²" : "MJ/m²"}
                  hideBars
                  showProcelScale
                  showBaseline
                  showTop5Line
                />
              )}
            </div>

            <div className="flex flex-col gap-1 mt-4">
              <strong className="text-xs text-gray-shade-500">Legenda:</strong>
              <p className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 block rounded-full bg-[#3b82f6]"></div>{" "}
                <i>Melhor fornecedor</i>
              </p>
              <p className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 block rounded-full bg-[#E36F35]"></div>{" "}
                <i>Pior fornecedor</i>
              </p>
            </div>
          </div>
        </div>
        <section className="w-full mt-30">
          <h2 className="mb-8 text-3xl text-primary font-semibold">
            Como o Benchmark funciona
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
              <p>
                A plataforma BIPc foi desenvolvida para oferecer subsídios à
                projetistas e construtoras a melhorar a emissão de carbono
                embutido da construção, ainda na fase de projeto.
              </p>
              <p>
                O inventário do Benchmark é importante também para que todo o
                setor e a sociedade organizada tenham um retrato abrangente da
                produção nacional e assim possam definir estratégias setoriais
                com base em dados atuais, transparentes, de fácil acesso e
                compreensão.
              </p>
              <p>
                Assim, além dos recursos especificos para os usuários, a
                plataforma disponibiliza a visualização de dados gerais a toda
                sociedade.
              </p>
              {/* <p className="flex flex-col">
                Para compreender as variáveis apresentadas, acesse:
                <a href="#" className="pl-2">
                  {" "}
                  &bull; glossário
                </a>
              </p>
              <p className="flex flex-col">
                Para conhecer os métodos de cálculo e outros detalhes da
                plataforma, acesse:{" "}
                <a href="#" className="pl-2">
                  &bull; PD&I
                </a>
              </p> */}
            </div>
          </div>
        </section>
        {/* <section className="w-full lg:w-3/4 mt-10">
          <h2 className="text-2xl text-primary font-semibold">
            Composição do inventário do Benchmark
          </h2>
          <h3 className="text-primary">
            Unidade habitacional divididas pelas tipologias
          </h3>
          <div className="p-10">
            <img src={Footprint} alt="" className="max-w-full h-auto" />
          </div>
        </section>
        <section className="w-full mt-10">
          <h2 className="text-2xl text-primary font-semibold">
            Composição atual do inventário do Benchmark
          </h2>
          <h3 className="text-primary">
            Unidades habitacionais divididas pelas tipologias
          </h3>
          <div className="flex items-center justify-center mt-10">
            <img src={InventoryChart} alt="" className="max-w-full h-auto" />
          </div>
        </section> */}
      </div>
    </div>
  );

  // return (
  //   <div className="flex h-full w-full flex-col items-center justify-center">
  //     <h1 className="text-4xl font-bold sm:text-6xl">
  //       {t("public.comingSoonTitle")}
  //     </h1>
  //     <p className="mt-4 text-lg text-gray-600 sm:text-xl">
  //       {t("public.comingSoonDescription")}
  //     </p>
  //     <div className="mt-8 flex items-center gap-4">
  //       {auth.isAuthenticated ? (
  //         <Link
  //           to="/new_projects"
  //           className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
  //         >
  //           {t("public.accessProjects")}
  //         </Link>
  //       ) : (
  //         <Link
  //           to="/login"
  //           className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
  //         >
  //           {t("public.login")}
  //         </Link>
  //       )}
  //     </div>
  //   </div>
  // );
}
