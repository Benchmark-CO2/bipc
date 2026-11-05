import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';
import { cn } from "@/lib/utils";

type ClassificationCardProps = {
  grade: "A" | "B" | "C" | "D";
  totalProjects: number;
};

export const ClassificationCard = ({ grade, totalProjects }: ClassificationCardProps) => {
  // Cores dinâmicas por nota (ajuste os hexadecimais conforme o seu design system)
  const gradeStyles = {
    A: "bg-[#d1e7dd] border-[#a3cfbb]", // Verde mais forte
    B: "bg-[#e8f5e9] border-[#a5d6a7]", // Verde claro (como na imagem)
    C: "bg-[#fff3cd] border-[#ffe69c]", // Amarelado
    D: "bg-[#f8d7da] border-[#f1aeb5]", // Avermelhado
  };

  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex flex-col items-center justify-center self-stretch border rounded-lg px-4 py-2 shadow-sm flex-shrink-0 cursor-help",
            gradeStyles[grade]
          )}
        >
          <span className="text-2xl font-extrabold leading-none text-neutral-900">{grade}</span>
          <span className="text-xs text-neutral-600 leading-tight mt-1 whitespace-nowrap">
            {t.summary.classification.projectsCountShort.replace('{{count}}', String(totalProjects))}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className='bg-white ring ring-primary' arrowClassName='bg-white fill-white'>
        <span className="text-xs text-neutral-900">
          <span className="font-bold">{t.summary.classification.title}</span>
          {' · '}
          {t.summary.classification.projectsCount.replace('{{count}}', String(totalProjects))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
};
