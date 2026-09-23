import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSummary } from '@/context/summaryContext';
import { cn } from '@/lib/utils';

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
  
  return (
    <div
      className={cn(
        "relative flex items-center bg-white rounded-lg py-2 shadow-sm box-border flex-shrink-0 text-xs!",
        // A imagem mostra a borda verde (V) mais espessa, e as demais mais finas e cinzas.
        letter === 'V' ? "border-[3px]" : "border border-gray-300"
      )}
      style={{ borderColor: letter === 'V' ? color : undefined }}
    >
      {/* Badge Circular Flutuante e Tooltip */}
      <div className="absolute -top-3 -left-3 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="rounded-full w-6 h-6 flex items-center justify-center text-white font-bold text-xs shadow-md cursor-help"
              style={{ backgroundColor: color }}
            >
              {letter}
            </div>
          </TooltipTrigger>
          <TooltipContent className='bg-white ring ring-primary' arrowClassName='bg-white fill-white'>
            <span className={cn("font-bold text-xs", {
              'text-xs': !isOpen
            })} style={{ color }}>{title}</span>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Lista de Métricas em Linha */}
      <div className="flex items-center w-full px-1">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={cn("flex flex-col gap-1.5 px-4", {
              "border-r border-gray-200": idx !== items.length - 1 // Divisória vertical
            })}
          >
            {/* Benchmark (Topo, Negrito) */}
            <div className="text-sm font-bold text-neutral-900 whitespace-nowrap leading-5">
              {item.benchmark} <span className="text-xs font-normal text-neutral-700">{item.unitBenchmark}</span>
            </div>
            
            {/* Total (Fundo, Normal) */}
            <div className="text-sm text-neutral-600 whitespace-nowrap leading-5">
              {item.total} <span className="text-xs">{item.unitTotal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};