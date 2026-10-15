import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from "@/i18n";
import { useState } from "react";

export const useChartType = (type: "co2" | "energy" | "material") => {
  const [chartType, setChartType] = useState<"line" | "scatter">("scatter");

  const { t } = useTranslation();

  const changeChartType = (chartType: string) => {
    setChartType(chartType as "line" | "scatter");
  };

  const ChartSelector = (
    <div className='flex flex-col gap-1 min-w-0 flex-1 max-sm:w-full'>
      <Label className="text-sm font-normal text-muted-foreground">{t.benchmark.chartType}</Label>
      <Select
        value={chartType}
        onValueChange={changeChartType}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={t.benchmark.chartType}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scatter">
            {t.benchmark.chartTypes.cumulativeFraction.name}
          </SelectItem>
          {type !== 'material' && (
            <SelectItem value="line">
              {t.benchmark.chartTypes.classification.name}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );


  return { chartType, changeChartType, ChartSelector };
}