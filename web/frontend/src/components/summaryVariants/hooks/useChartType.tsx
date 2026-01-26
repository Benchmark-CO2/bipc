import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from "react";

type TChartSelector = Array<"line" | "scatter">

export const useChartType = () => {
  const [chartType, setChartType] = useState<TChartSelector>(["scatter"]);

  const changeChartType = (chartType: string | TChartSelector) => {
    const newType = [chartType] as TChartSelector

    setChartType(newType.flat());
  };

  const ChartSelector = (
    <div className='w-11/12 max-sm:w-full'>
      <Label className="mb-2">Tipo de Gráfico:</Label>
      <Select
        value={chartType[0]}
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
            Classificação
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );


  return { chartType, changeChartType, ChartSelector };
}