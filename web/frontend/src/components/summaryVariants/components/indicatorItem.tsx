import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSummary } from '@/context/summaryContext';
import { cn } from '@/lib/utils';
import { Fragment, useLayoutEffect, useRef } from 'react';

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
  // Só o card V mostra as unidades; nos demais elas ficam no tooltip do valor
  showUnits?: boolean;
};

export const ScenarioCard = ({ letter, title, color, items, showUnits = false }: ScenarioCardProps) => {
  const { isOpen } = useSummary();
  const cardRef = useRef<HTMLDivElement>(null);

  // Largura do conteúdo (a sobra fica no fim da linha). Se a linha de cards quebrar, o card da 2ª linha
  // com o mesmo nº de métricas do primeiro card (V) fica da largura dele, alinhado a ele.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const row = card?.parentElement;
    if (!card || !row) return;

    const update = () => {
      card.style.width = '';
      const first = row.firstElementChild as HTMLElement | null;
      if (!first || first === card || card.offsetTop === first.offsetTop) return;
      if (Number(first.dataset.metrics) === items.length) card.style.width = `${first.offsetWidth}px`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <div
      ref={cardRef}
      data-metrics={items.length}
      className={cn(
        "relative flex items-center bg-white rounded-lg py-2 shadow-sm box-border min-w-0 max-sm:shrink-0 text-xs", // mobile: rolagem horizontal, como antes
        // A imagem mostra a borda verde (V) mais espessa, e as demais mais finas e cinzas.
        letter === 'V' ? "border-[3px]" : "border border-gray-300"
      )}
      // Quando a linha de cards (@container/cards) fica estreita, o texto cai ~20%.
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

      {/* Lista de Métricas em Linha: a sobra de largura é distribuída por igual (justify-between),
          então cada divisória fica exatamente no meio entre duas colunas */}
      <div className="flex items-stretch justify-between w-full px-1">
        {items.map((item, idx) => (
          <Fragment key={idx}>
            {idx > 0 && <div className="w-px shrink-0 bg-gray-200" />} {/* Divisória vertical */}
            <div className="flex flex-col gap-1.5 min-w-0 px-4 @max-[115rem]/cards:px-2 @max-[110rem]/cards:px-1.5">
              {/* Benchmark (Topo, Negrito) */}
              <div
                className="text-sm @max-[115rem]/cards:text-[0.7rem] font-bold text-neutral-900 whitespace-nowrap leading-5"
                title={showUnits ? undefined : `${item.benchmark} ${item.unitBenchmark}`}
              >
                {item.benchmark}{showUnits && <> <span className="text-xs @max-[115rem]/cards:text-[0.6rem] font-normal text-neutral-700">{item.unitBenchmark}</span></>}
              </div>

              {/* Total (Fundo, Normal) */}
              <div
                className="text-sm @max-[115rem]/cards:text-[0.7rem] text-neutral-600 whitespace-nowrap leading-5"
                title={showUnits ? undefined : `${item.total} ${item.unitTotal}`}
              >
                {item.total}{showUnits && <> <span className="text-xs @max-[115rem]/cards:text-[0.6rem] text-neutral-500">{item.unitTotal}</span></>}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};