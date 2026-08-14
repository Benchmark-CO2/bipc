import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";

const Summary = () => {
  const { isOpen, toggleSummary, context, isExpanded } = useSummary();

  if (context?.hide) return null;

  return (
    <section
      data-open={isOpen}
      data-expanded={isExpanded}
      className={cn(
        "absolute bottom-0 right-0 w-full max-md:mx-auto max-md:left-0 transition-all z-49 bg-gray-50 dark:bg-sidebar shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]",
        "border-t-[5px] border-[#5cb82b]", // Borda verde superior baseada na imagem
        {
          "h-[100vh]": isOpen,
          "h-32": !isOpen, // Recolhe totalmente, deixando apenas a aba visível
        }
      )}
    >
      {/* Botão Flutuante Superior (Aba "Clique e veja mais") */}
      {(
        <div className={cn("absolute flex items-end top-0 left-1/2 -translate-x-1/2 -translate-y-full z-[100]", {
          'top-5': isOpen,
         '': !isOpen,
        })}>
        <button
          onClick={() => {
            toggleSummary();
          }}
          className={cn("flex items-center justify-center gap-2 px-6 py-1 text-sm font-medium text-white transition-colors bg-[#5cb82b] hover:bg-[#4ea022] rounded-t-2xl shadow-sm cursor-pointer", {
            'rounded-t-none rounded-b-xl': isOpen,
          })}
        >
          <ChevronUp
            className={cn("w-4 h-4 transition-transform", {
              "rotate-180": isOpen,
            })}
          />
          <span>{isOpen ? "Fechar" : "Benchmark"}</span>
        </button>
        </div>
      )}

      <div className={cn("relative flex flex-col w-full h-full overflow-hidden pt-0", {
        'cursor-pointer': !isOpen,
      })} onClick={!isOpen ? toggleSummary : undefined}>
        {context && (
          <div className={cn("w-full flex-1 px-2 py-2 overflow-auto", {
            'p-2 pt-6': isOpen,
          })}>
            <div className='flex justify-between text-secondary'>
              {/* {!isOpen && <h2 className='font-semibold text-xl text-primary mb-2.5 font-roboto-flex'>Benchmark do projeto</h2>} */}
              {/* {isOpen && (
                <div className='flex mb-2 gap-2 cursor-pointer absolute top-0 left-1/2 -translate-x-1/2 bg-secondary' onClick={toggleSummary}>
                  <div className='flex text-xs justify-center items-center gap-2 text-white px-2 p-1' >
                    Recolher <ChevronDown className='w-4 h-4' />
                  </div>
                </div>
              )} */}
            </div>
            {/* O conteúdo (incluindo o título "Benchmark do projeto" e os cards) 
                virá diretamente do context.component, conforme solicitado */}
            {context.component || null}
          </div>
        )}
      </div>
    </section>
  );
};

export default Summary;
