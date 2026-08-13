import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from "@/i18n";
import { useState } from "react";

export const useChartType = () => {
  const [chartType, setChartType] = useState<"line" | "scatter">("scatter");

  const { t } = useTranslation();

  const changeChartType = (chartType: string) => {
    setChartType(chartType as "line" | "scatter");
  };

  const ChartSelector = (
    <div className='w-11/12 max-sm:w-full'>
      <Label className="mb-0">{t.benchmark.chartType}:</Label>
      <Select
        value={chartType}
        onValueChange={changeChartType}
      >
        <SelectTrigger className="w-full mb-4">
          <SelectValue
            placeholder={t.benchmark.chartType}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scatter">
            {t.benchmark.chartTypes.cumulativeFraction.name}
          </SelectItem>
          <SelectItem value="line">
            {t.benchmark.chartTypes.classification.name}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );


  return { chartType, changeChartType, ChartSelector };
}