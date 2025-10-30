import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import Footprint from "@/assets/footprint.svg";
import Logo from "@/assets/logo_full.svg";
import D3GradientRangeChart from "@/components/charts/d3chart";
import D3GradientRangeLineChart from "@/components/charts/d3chartLine";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import InventoryChart from "@/assets/inventoryChart.png";
import { useBenchmarkFilters } from '@/hooks/useBenchmarkFilters';
export const Route = createFileRoute("/(public)/benchmark")({
  component: RouteComponent,
  loader: ({ context }) => {
    return {
      auth: context.auth,
    };
  },
});



function RouteComponent() {
  const { FilterSection, activeBuildFilter } = useBenchmarkFilters();
  const { data } = useQuery({
    queryKey: ["units-benchmarks"],
    queryFn: getProjectsBenchmark,
  });

  const chartData =
    data?.data?.benchmark?.co2?.map((f) => ({
      ...f,
      label: "",
    })) || [];
  const width = (window.innerWidth - 421) * 0.5;
  const height = window.innerHeight * 0.5;
  const [selectedChart, setSelectedChart] = useState("trend");

  useEffect(() => {
    console.log(activeBuildFilter)
  }, [activeBuildFilter])

  return (
    <div className="flex flex-col p-10">
      <h1 className="text-3xl font-bold text-primary ">
        Benchmark | Visualização dos dados
      </h1>
      <div className="h-full w-full flex items-start pt-10 justify-between max-md:flex-col gap-10">
        {FilterSection}
        <div className="w-2/3 flex flex-col items-start">
          <h2 className="text-primary font-semibold">Visualização:</h2>

          <Select onValueChange={setSelectedChart} value={selectedChart}>
            <SelectTrigger className="w-[200px] self-start mb-4">
              <SelectValue placeholder="Gráfico" />
            </SelectTrigger>
            <SelectContent defaultValue={"co2"}>
              <SelectItem value="trend">Classificação</SelectItem>
              <SelectItem value="co2">Fração Acumulada</SelectItem>
            </SelectContent>
          </Select>
          {selectedChart === "trend" ? (
            <D3GradientRangeLineChart
              width={width}
              height={height}
              data={chartData}
              overrideDimensions
            />
          ) : (
            <D3GradientRangeChart
              width={width}
              height={height}
              data={chartData}
              overrideDimensions
            />
          )}

          <div className="flex flex-col gap-1">
            <span>Legenda:</span>
            <p className="flex items-center gap-2">
              <div className="w-3 h-3 block rounded-full bg-[#3b82f6]"></div>{" "}
              <i>Melhor fornecedor</i>
            </p>
            <p className="flex items-center gap-2">
              <div className="w-3 h-3 block rounded-full bg-[#E36F35]"></div>{" "}
              <i>Pior fornecedor</i>
            </p>
          </div>
        </div>
      </div>
      <section className="w-3/4 self-start">
        <h2 className="my-8 text-3xl text-primary font-semibold">
          Benchmark | Como funciona
        </h2>
        <div className="flex flex-col mt-20">
          <img src={Logo} alt="" className="max-w-[250px] mb-20 ml-20" />
          <div className="flex flex-col gap-6 w-3/4">
            <p>
              A plataforma BIPc foi desenvolvida para oferecer subsídios à
              projetistas e construtoras a melhorar a emissão de carbono
              embutido da construção, ainda na fase de projeto.
            </p>
            <p>
              O inventário do Benchmark é importante também para que todo o
              setor e a sociedade organizada tenham um retrato abrangente da
              produção nacional e assim possam definir estratégias setoriais com
              base em dados atuais, transparentes, de fácil acesso e
              compreensão.
            </p>
            <p>
              Assim, além dos recursos especificos para os usuários, a
              plataforma disponibiliza a visualização de dados gerais a toda
              sociedade.
            </p>
            <p className="flex flex-col">
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
            </p>
          </div>
        </div>
      </section>
      <section className="w-3/4 self-start mt-10">
        <h2 className="text-2xl text-primary font-semibold">
          Composição do inventário do Benchmark
        </h2>
        <h3 className="text-primary">
          Unidade habitacional divididas pelas tipologias
        </h3>
        <div className="p-10">
          <img src={Footprint} alt="" />
        </div>
      </section>
      <section className=" mt-10 self-center">
        <h2 className="text-2xl text-primary font-semibold">
          Composição atual do inventário do Benchmark
        </h2>
        <h3 className="text-primary">
          Unidades habitacionais divididas pelas tipologias
        </h3>
        <div className="flex items-center mt-10">
          <img src={InventoryChart} alt="" className="mx-10 self-end" />
        </div>
      </section>
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
