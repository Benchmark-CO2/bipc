import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import Logo from "@/assets/logo_full.svg";
import D3GradientRangeChart from "@/components/charts/d3chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
  loader: ({ context }) => {
    return {
      auth: context.auth,
    };
  },
});

function RouteComponent() {
  const { auth } = Route.useLoaderData();
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["units-benchmarks"],
    queryFn: getProjectsBenchmark,
  });

  const chartData = data?.data.benchmark.co2.map((f) => ({
    ...f,
    label: "",
  }));
  const width = (window.innerWidth - 221) * 0.5;
  const height = (window.innerHeight) * 0.5;
  return (
    <div className="h-full w-full flex items-start pt-40 justify-between max-md:flex-col">
      <div className="flex flex-col  gap-4 w-1/3 px-16 max-w-[500px] mx-auto max-md:w-full max-md:p-8">
        <img src={Logo} alt="" className="max-w-[250px]" />
        <h1 className='my-8 text-3xl text-primary font-semibold'>Benchmark | Como funciona</h1>
        <p>
          A plataforma BIPc foi desenvolvida para oferecer subsídios à
          projetistas e construtoras a melhorar a emissão de carbono embutido da
          construção, ainda na fase de projeto.
        </p>
        <p>
          O inventário do Benchmark é importante também para que todo o setor e
          a sociedade organizada tenham um retrato abrangente da produção
          nacional e assim possam definir estratégias setoriais com base em
          dados atuais, transparentes, de fácil acesso e compreensão.
        </p>
        <p>
          Assim, além dos recursos especificos para os usuários, a plataforma
          disponibiliza a visualização de dados gerais a toda sociedade.
        </p>
        <p className='flex flex-col'>
          Para compreender as variáveis apresentadas, acesse: 
         <a href="#" className='pl-2'> &bull; glossário</a> 
          </p>
          <p className='flex flex-col'>
          Para conhecer os métodos de cálculo e outros detalhes da plataforma,
          acesse: <a href="#" className='pl-2'>&bull; PD&I</a>
        </p>
      </div>
      <div className="w-2/3 flex flex-col items-start">
        <Select>
          <SelectTrigger className="w-[200px] self-start mb-4">
            <SelectValue placeholder="Gráfico" />
          </SelectTrigger>
          <SelectContent defaultValue={"co2"}>
            <SelectItem value="co2">Fração Acumuladas</SelectItem>
            {/* <SelectItem value='energia'>Energia</SelectItem> */}
          </SelectContent>
        </Select>
        <D3GradientRangeChart width={width} height={height} data={chartData} overrideDimensions/>
        <div className="w-[95%] flex items-center gap-2 justify-between my-4">
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tecnologia" />
            </SelectTrigger>
            <SelectContent defaultValue={"co2"}>
              <SelectItem value="co2">Todos</SelectItem>
              {/* <SelectItem value='energia'>Energia</SelectItem> */}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent defaultValue={"co2"}>
              <SelectItem value="co2">Todos</SelectItem>
              {/* <SelectItem value='energia'>Energia</SelectItem> */}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipologia" />
            </SelectTrigger>
            <SelectContent defaultValue={"co2"}>
              <SelectItem value="co2">Todos</SelectItem>
              {/* <SelectItem value='energia'>Energia</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span>Legenda:</span>
          <p className='flex items-center gap-2'>
            <div className="w-3 h-3 block rounded-full bg-[#3b82f6]"></div>{" "}
            <i>Melhor fornecedor</i>
          </p>
          <p className='flex items-center gap-2'>
            <div className="w-3 h-3 block rounded-full bg-[#E36F35]"></div>{" "}
            <i>Pior fornecedor</i>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="text-4xl font-bold sm:text-6xl">
        {t("public.comingSoonTitle")}
      </h1>
      <p className="mt-4 text-lg text-gray-600 sm:text-xl">
        {t("public.comingSoonDescription")}
      </p>
      <div className="mt-8 flex items-center gap-4">
        {auth.isAuthenticated ? (
          <Link
            to="/new_projects"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
          >
            {t("public.accessProjects")}
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
          >
            {t("public.login")}
          </Link>
        )}
      </div>
    </div>
  );
}
