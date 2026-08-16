import EmissionsChart from "@/components/charts/barChart";
import { Checkbox } from "@/components/ui/checkbox";

export type TEmissionChartRow = Record<string, any> & { name: string };

export type TEmissionSectionItem = {
  id: string;
  title: string;
  isTotal?: boolean;
  isChecked?: boolean;
  defaultChecked?: boolean;
  chartData: TEmissionChartRow[];
};

export type TBenchmarkMax = number | Record<string, number>;

export const EmissionsSection = ({
  data,
  selected,
  onChange,
  benchmarkMax,
}: {
  data: readonly TEmissionSectionItem[];
  selected?: readonly string[];
  onChange?: (id: string, checked: boolean) => void;
  benchmarkMax: TBenchmarkMax;
}) => {
  return (
    <div className="flex flex-col gap-2 w-full overflow-y-auto max-h-[70vh]">
      {/* 1. Legenda Global no Topo */}
      <div className="mb-0">
        <h2 className="text-xl font-bold mb-2">
          Total de Emissões por tecnologia
        </h2>

        {/* <EmissionLegend keys={data[0]?.chartData?.map(item => item.name) || []} /> */}
      </div>

      {/* 2. Lista de Gráficos (Total + Edificações) */}
      {data.map((section) => (
        <div
          key={section.id}
          className="flex flex-col gap-1 border-b pb-0 last:border-b-0"
        >
          {/* Cabeçalho da Seção com Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              value={section.id}
              checked={selected?.includes(section.id) ?? section.defaultChecked}
              onCheckedChange={(checked) =>
                onChange?.(section.id, !!checked as boolean)
              }
            />
            <span className="font-bold text-gray-800">{section.title}</span>
          </div>

          {/* Gráfico D3 */}
          <div className="w-full">
            <EmissionsChart
              data={section.chartData}
              benchmarkMax={benchmarkMax}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
