import { Tooltip, TooltipContent } from '@/components/ui/tooltip';
import { useSummary } from '@/context/summaryContext';
import { cn } from '@/lib/utils';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
export const IndicatorItem = ({ color, value, currentUnit, label }: {
  color: string;
  value: number | string;
  currentUnit: string;
  label: string;
}) => {
  return (
    <div className={`text-md border-1 rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full`} style={{ borderColor: color }}>
      <span className='font-bold text-xl mx-1' style={{ color }}>{label}</span>
      <span className={`font-bold`} >{value}</span>
      <span className='font-light'>{currentUnit}</span>
    </div>
  );
};

type ScenarioItem = {
  total: string | number;
  benchmark: string | number;
  unitTotal: string;
  unitBenchmark: string;
};

type ScenarioCardProps = {
  letter: string;
  title: string;
  color: string;
  items: ScenarioItem[];
};

export const ScenarioCard = ({ letter, title, color, items }: ScenarioCardProps) => {
  const { isOpen } = useSummary();
  if (!isOpen) {
    return (
      <div
        className="border-2 rounded-lg p-3 flex-1 flex flex-col gap-1 min-w-[220px] box-border relative"
        style={{ borderColor: color }}
      >
        {/* Cabeçalho do Card */}
        <div className="flex items-start gap-2 absolute -top-2 -left-2">
          <Tooltip>
            <TooltipTrigger>
              <div
                className="rounded-full w-6 h-6 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {letter}
              </div>
            </TooltipTrigger>
            <TooltipContent className='bg-white ring ring-primary' arrowClassName='bg-white fill-white'>
              <span className={cn("font-bold text-lg", {
                'text-base': !isOpen
              })} style={{ color }}>{title}</span>
            </TooltipContent>
          </Tooltip>


        </div>

        {/* Títulos das Colunas */}
        <div className="flex justify-between border-b pb-0">
          <span className="text-sm font-medium" style={{ color }}>Total</span>
          <span className="text-sm font-medium" style={{ color }}>Benchmark</span>
        </div>

        {/* Lista de Métricas (CO2, Energia, Material) */}
        <div className="flex flex-col gap-0">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm text-neutral-700">
              <span>
                {item.total} <span className="text-xs">{item.unitTotal}</span>
              </span>
              <span className="font-bold">
                {item.benchmark} <span className="text-xs font-normal">{item.unitBenchmark}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className="border-2 rounded-lg p-3 flex-1 flex flex-col gap-1 min-w-[220px] box-border"
      style={{ borderColor: color }}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start gap-2">
        <div
          className="rounded-full w-6 h-6 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {letter}
        </div>
        <span className={cn("font-bold text-lg", {
          'text-base': !isOpen
        })} style={{ color }}>{title}</span>
      </div>

      {/* Títulos das Colunas */}
      <div className="flex justify-between border-b pb-1">
        <span className="text-sm font-medium" style={{ color }}>Total</span>
        <span className="text-sm font-medium" style={{ color }}>Benchmark</span>
      </div>

      {/* Lista de Métricas (CO2, Energia, Material) */}
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-neutral-700">
            <span>
              {item.total} <span className="text-xs">{item.unitTotal}</span>
            </span>
            <span className="font-bold">
              {item.benchmark} <span className="text-xs font-normal">{item.unitBenchmark}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};