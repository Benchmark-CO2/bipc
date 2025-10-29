import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { posLaunchFeatures } from '@/utils/posLaunchFeatures';
import { Info, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const useMinMax = (data: { min: number; max: number }[], accessorMin: (el: { min: number; max: number }) => number, accessorMax: (el: { min: number; max: number }) => number, type: string) => {
  const minValue = parseFloat(data?.reduce((acc, curr) => (accessorMin(curr) < acc ? accessorMin(curr) : acc), Number.POSITIVE_INFINITY).toFixed(2));
  const maxValue = parseFloat(data?.reduce((acc, curr) => (accessorMax(curr) > acc ? accessorMax(curr) : acc), Number.NEGATIVE_INFINITY).toFixed(2));

  const [min, setMin] = useState<number>(Number(minValue));
  const [max, setMax] = useState<number>(Number(maxValue));

  const updateMin = (value: number) => {
    if (min === null || value !== min) {
      setMin(value);
    }
  }

  const updateMax = (value: number) => {
    if (max === null || value !== max) {
      setMax(value);
    }
  };

  const resetFilters = () => {
    setMin(minValue);
    setMax(maxValue);
  };

  const filteredData = useMemo(() => {
    return data?.filter(
      (el) =>
        (min !== null ? el.min >= min : true) &&
        (max !== null ? el.max <= max : true)
    );
  }, [data, min, max, type]);

  useEffect(() => {
    resetFilters()
  }, [type, data]);


  const MinMaxComponent = (
    <div className={`relative flex items-center gap-2 rounded-sm border border-gray-200 bg-white p-4 w-1/2 min-w-[150px] dark:border-gray-700 dark:bg-gray-800`}>
      <div className="flex text-xs gap-4 items-end">
        <span>Mínimo: <Input value={min !== null ? min : ""} onChange={(e) => updateMin(parseFloat(e.target.value))} /></span>
        <span>Máximo: <Input value={max !== null ? max : ""} onChange={(e) => updateMax(parseFloat(e.target.value))} /></span>
      </div>
      <RefreshCcw size={16} className="absolute right-8 top-2 cursor-pointer text-gray-500 hover:text-gray-600" onClick={resetFilters} />
      <Tooltip defaultOpen={false}>
        <TooltipTrigger className="absolute right-2 top-2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <Info size={16} />
        </TooltipTrigger>
        <TooltipContent arrowClassName="opacity-0" className="bg-white rounded-md border-2 border-active  shadow-md text-black p-2">
          <span className="text-black text-sm">
            Defina os valores mínimo e máximo para filtrar os dados exibidos no gráfico.
          </span>
        </TooltipContent>
      </Tooltip>
    </div>
  )
  return { min, max, filteredData, MinMaxComponent: posLaunchFeatures.filterChartMinMax.enabled ? MinMaxComponent : null  };
}