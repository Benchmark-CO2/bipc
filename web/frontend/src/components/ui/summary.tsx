import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTranslation } from '@/i18n';
import { cn } from "@/lib/utils";
import { ChevronDown, Maximize, Minimize } from "lucide-react";
import type { MouseEvent } from "react";

const Summary = () => {
  // Removemos o isExpanded e toggleExpanded do context
  const { isOpen, toggleSummary, context, isFullScreen, setIsFullScreen } = useSummary();
  const { t } = useTranslation()
  // Estado local apenas para controle visual da tela cheia (detalhado)
  const isMobile = useIsMobile()

  // Abre/fecha a gaveta (usado pela seta e pelo título da aba)
  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOpen) {
      setIsFullScreen(false); // Garante que resete o detalhado ao fechar
    }
    toggleSummary();
  };

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
          "h-[12vh]": isOpen && isMobile, // Ajuste para dispositivos móveis quando aberto
          "h-[88vh]": isOpen && isMobile && isFullScreen, // Ajuste para dispositivos móveis quando em tela cheia
        }
      )}
    >
      {/* Grupo de Botões Superiores Direitos */}
      <div className="absolute flex items-end top-0 right-6 -translate-y-full bottom-0 z-[100]">
        <div className="flex items-stretch relative h-10 pr-24">
          
          {/* Aba de Texto */}
          <button
            onClick={handleToggle}
            className="flex items-center justify-center px-9 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-colors bg-primary hover:bg-[linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1))] cursor-pointer rounded-t-md shadow-[4px_0px_4px_0px_rgba(0,0,0,0.25)] relative z-52"
          >
            {t.summary.title}
          </button>

          {/* Botão Laranja: Abre/Fecha o componente inteiro */}
          <button
            onClick={handleToggle}
            className="flex items-center justify-end px-4 py-1.5 text-white transition-colors bg-primary hover:bg-[linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1))] cursor-pointer border-l border-white/20 rounded-t-md w-16 absolute top-0 bottom-0 right-12 z-51 shadow-[4px_0px_4px_0px_rgba(0,0,0,0.25)]"
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
            className="flex items-center justify-end px-4 py-1.5 text-white transition-colors bg-primary hover:bg-[linear-gradient(rgba(0,0,0,0.1),rgba(0,0,0,0.1))] cursor-pointer border-l border-white/20 rounded-t-md w-16 absolute top-0 bottom-0 right-0 z-50 shadow-[4px_0px_4px_0px_rgba(0,0,0,0.25)]"
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
            // Tela cheia (desktop): não rola como um todo; a altura passa para o conteúdo (só a lista de projetos rola)
            'p-2 pt-4 overflow-hidden flex flex-col min-h-0 max-sm:overflow-auto': isFullScreen,
          })}>
            {context.component || null}
          </div>
        )}
      </div>
    </section>
  );
};

export default Summary;