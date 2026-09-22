import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { ChevronDown, Maximize, Minimize } from "lucide-react";

const Summary = () => {
  // Removemos o isExpanded e toggleExpanded do context
  const { isOpen, toggleSummary, context, isFullScreen, setIsFullScreen } = useSummary();
  
  // Estado local apenas para controle visual da tela cheia (detalhado)

  if (context?.hide) return null;

  return (
    <section
      data-open={isOpen}
      // Trocado para data-fullscreen para evitar conflito de CSS que usava data-expanded
      data-fullscreen={isFullScreen}
      className={cn(
        "absolute bottom-0 right-0 w-full max-md:mx-auto max-md:left-0 transition-all duration-300 ease-in-out z-49 bg-gray-50 dark:bg-sidebar shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]",
        "border-t-[4px] border-[#1a7f83]",
        {
          "h-0": !isOpen, // 1. Totalmente recolhido (só as abas aparecem)
          "h-32": isOpen && !isFullScreen, // 2. Overview
          "h-[96.6vh]": isOpen && isFullScreen, // 3. Detalhado
        }
      )}
    >
      {/* Grupo de Botões Superiores Direitos */}
      <div className="absolute flex items-end top-0 right-4 -translate-y-full z-[100]">
        <div className="flex items-stretch overflow-hidden rounded-t-[8px]">
          
          {/* Aba de Texto */}
          <div className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-white bg-[#1a7f83]">
            Benchmark do projeto
          </div>

          {/* Botão Laranja: Abre/Fecha o componente inteiro */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen) {
                setIsFullScreen(false); // Garante que resete o detalhado ao fechar
              }
              toggleSummary();
            }}
            className="flex items-center justify-center px-3 py-1.5 text-white transition-colors bg-[#f15a3b] hover:bg-[#d94f33] cursor-pointer border-l border-white/20"
          >
            <ChevronDown
              className={cn("w-4 h-4 transition-transform duration-300", {
                "rotate-180": !isOpen, // Seta para cima quando recolhido
                "rotate-0": isOpen, // Seta para baixo quando aberto
              })}
            />
          </button>

          {/* Botão Verde: Alterna Tela Cheia (Detalhado) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) {
                toggleSummary(); // Se estiver totalmente fechado, abre o painel
                setIsFullScreen(true); // E já expande para o detalhado
              } else {
                setIsFullScreen(!isFullScreen);
              }
            }}
            className="flex items-center justify-center px-3 py-1.5 text-white transition-colors bg-[#62ba33] hover:bg-[#53a02a] cursor-pointer border-l border-white/20"
          >
            {isFullScreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
          
        </div>
      </div>

      {/* Conteúdo interno encapsulado */}
      <div 
        className={cn("relative flex flex-col w-full h-full overflow-hidden transition-opacity duration-300", {
          'cursor-pointer': isOpen && !isFullScreen,
          'opacity-0 invisible': !isOpen, // Esconde conteúdo para não vazar quando h-0
          'opacity-100 visible': isOpen,
        })} 
        // Clique no corpo do overview expande para o detalhado
        onClick={(isOpen && !isFullScreen) ? () => setIsFullScreen(true) : undefined}
      >
        {context && (
          <div className={cn("w-full flex-1 px-2 py-2 overflow-auto", {
            'p-2 pt-4': isFullScreen,
          })}>
            {context.component || null}
          </div>
        )}
      </div>
    </section>
  );
};

export default Summary;