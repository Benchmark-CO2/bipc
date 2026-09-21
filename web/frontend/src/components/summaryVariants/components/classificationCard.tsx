import { cn } from "@/lib/utils";

type ClassificationCardProps = {
  grade: "A" | "B" | "C" | "D";
  totalProjects: number;
};

const ClassificationCard = ({ grade, totalProjects }: ClassificationCardProps) => {
  // Cores dinâmicas por nota (ajuste os hexadecimais conforme o seu design system)
  const gradeStyles = {
    A: "bg-[#d1e7dd] border-[#a3cfbb]", // Verde mais forte
    B: "bg-[#e8f5e9] border-[#a5d6a7]", // Verde claro (como na imagem)
    C: "bg-[#fff3cd] border-[#ffe69c]", // Amarelado
    D: "bg-[#f8d7da] border-[#f1aeb5]", // Avermelhado
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 border rounded-lg px-5 py-3 shadow-sm flex-shrink-0",
        gradeStyles[grade]
      )}
    >
      <span className="text-2xl font-extrabold text-neutral-900">{grade}</span>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-neutral-900 leading-tight">
          Classificação
        </span>
        <span className="text-xs text-neutral-600 leading-tight mt-0.5">
          N: {totalProjects} projetos
        </span>
      </div>
    </div>
  );
};

export default ClassificationCard;