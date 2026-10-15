import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBenchmarkFilters } from "@/hooks/useBenchmarkFilters";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";

// Filtros da página Benchmark dentro da gaveta (só onde a API aceita filtro: /v1/benchmark/projects).
// Sem filtro ativo, devolve o benchmark recebido da rota; com filtro, busca o benchmark filtrado.
export const useSummaryBenchmark = (baseData: IBenchmarkResponse) => {
  const { t } = useTranslation();
  const { FilterSection, activeBuildFilter, clearFilters } = useBenchmarkFilters();

  const floors = activeBuildFilter.floors.get();
  const activeCount = activeBuildFilter.technology.length + (floors ? floors.split(",").length : 0);
  const hasActiveFilter = activeCount > 0;

  const { data: filteredResponse } = useQuery({
    queryKey: ["summary-benchmark-filtered", JSON.stringify(activeBuildFilter)],
    queryFn: () =>
      getProjectsBenchmark({
        technology: activeBuildFilter.technology.length > 0 ? activeBuildFilter.technology : undefined,
        floors: floors || undefined,
      }),
    enabled: hasActiveFilter,
  });

  const data = hasActiveFilter && filteredResponse?.data ? filteredResponse.data : baseData;

  const FiltersButton = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 shrink-0 rounded-full border-primary text-primary hover:text-primary data-[state=open]:text-primary",
            // Com filtro ativo: teal cheio, inclusive com o popover aberto (o Button aplica bg-accent em data-[state=open])
            hasActiveFilter && "bg-primary text-white hover:bg-primary/90 hover:text-white data-[state=open]:bg-primary data-[state=open]:text-white",
          )}
        >
          <SlidersHorizontal className="size-4" />
          {t.summary.filters}
          {hasActiveFilter && <span className="text-xs font-semibold">({activeCount})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[26rem] max-w-[calc(100vw-2rem)]">
        {FilterSection}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilter}
            className="h-9 rounded-full border-primary text-primary hover:text-primary"
          >
            {t.benchmark.filters.clearFilters}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return { data, FiltersButton };
};
