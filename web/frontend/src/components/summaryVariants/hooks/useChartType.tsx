import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from "react";

export const useChartType = () => {
  const [chartType, setChartType] = useState<"line" | "scatter">("scatter");

  const changeChartType = (chartType: string) => {
    setChartType(chartType as "line" | "scatter");
  };

  const ChartSelector = (
    <div className='w-11/12 max-sm:w-full'>
      <Label className="mb-2">Tipo de Gráfico:</Label>
      <Select
      value={chartType}
      onValueChange={changeChartType}
    >
      <SelectTrigger className="w-full mb-4">
        <SelectValue
          placeholder="Tipo de Gráfico"
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="scatter">
          Fração acumulada
        </SelectItem>
        <SelectItem value="line">
          Gráfico de tendência
        </SelectItem>
      </SelectContent>
    </Select>
    </div>
  );


  return { chartType, changeChartType, ChartSelector };
}