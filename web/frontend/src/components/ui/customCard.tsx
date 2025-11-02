import { IProject, TProjectPhase } from "@/types/projects";
import { Calendar, Pencil, Trash2 } from "lucide-react";
import React, { useRef } from "react";
import { DrawerFormProject } from "../layout";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { Button } from "./button";
import { Checkbox } from "./checkbox";

const phaseLabels: Record<TProjectPhase, string> = {
  preliminary_study: "Estudo Preliminar",
  not_defined: "Não Definido",
  basic_project: "Projeto Básico",
  executive_project: "Projeto Executivo",
  released_for_construction: "Liberado para Construção",
};

const phaseColors: Record<TProjectPhase, string> = {
  preliminary_study: "bg-blue-500/90",
  not_defined: "bg-gray-500/90",
  basic_project: "bg-yellow-500/90",
  executive_project: "bg-orange-500/90",
  released_for_construction: "bg-green-500/90",
};
interface CustomCardProps {
  project: IProject;
  onClick: () => void;
  onDeleteProject?: (projectUid: string) => void;
  selectedProjects: Map<string, boolean>;
  handleSelectProject: (projectUid: string, isSelected: boolean) => void;
}
const CustomCard = ({
  onClick,
  project,
  onDeleteProject,
  selectedProjects,
  handleSelectProject,
}: CustomCardProps) => {
  const { name, phase, description, created_at } = project;
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const handleClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const dataType = target
      .closest("[data-action]")
      ?.getAttribute("data-action");
    if (
      dataType === "delete-project" ||
      dataType === "edit-project" ||
      dataType === "card-menu" ||
      dataType === "checkbox"
    ) {
      return;
    }
    onClick();
  };

  const handleClickCheck = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleSelectProject(project.id!, !selectedProjects.get(project.id!));
  };

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    editButtonRef.current?.click();
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    deleteButtonRef.current?.click();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <>
      <div
        onClick={handleClickCard}
        className="card w-full relative md:max-w-md overflow-hidden rounded-lg border border-secondary bg-transparent transition-all duration-300 hover:cursor-pointer hover:shadow-md hover:border-secondary/80 dark:border-zinc-500 "
      >
        <div className="w-full h-full p-4">
          {/* Header with checkbox and name */}
          <div className="flex w-full items-center mb-3 gap-2">
            <Checkbox
              data-action="checkbox"
              onClick={handleClickCheck}
              checked={selectedProjects?.get(project.id!) || false}
              className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary scale-110 transition-all flex-shrink-0 dark:data-[state=checked]:bg-primary dark:border-primary dark:data-[state=checked]:text-white max-sm:scale-120"
            />
            <h3 className="text-lg font-semibold text-primary line-clamp-1 flex-1">
              {name}
            </h3>
          </div>

          {/* Phase Badge */}
          <div className="mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold text-white shadow-sm ${phaseColors[phase]}`}
            >
              {phaseLabels[phase]}
            </span>
          </div>

          {/* Last Modified Date */}
          <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">
              Última modificação {formatDate(created_at)}
            </span>
          </div>

          {/* Project Description */}
          <div className="mb-4 min-h-[2.5rem]">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
              {description || "Sem descrição"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              data-action="delete-project"
              onClick={handleDeleteClick}
              variant="outline-destructive"
              size="icon-lg"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              data-action="edit-project"
              onClick={handleEditClick}
              variant="bipc"
              size="icon-lg"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <DrawerFormProject
        componentTrigger={
          <button ref={editButtonRef} className="hidden" aria-hidden="true" />
        }
        projectData={project}
      />

      <ModalConfirmDelete
        componentTrigger={
          <button ref={deleteButtonRef} className="hidden" aria-hidden="true" />
        }
        title="Confirmar exclusão do projeto"
        onConfirm={() => onDeleteProject?.(project.id)}
      />
    </>
  );
};

export const CustomCardSkeleton = () => {
  return (
    <div className="w-full md:max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
          <div className="w-24 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"></div>
        </div>

        {/* Title skeleton */}
        <div className="w-3/4 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>

        {/* Date skeleton */}
        <div className="w-1/2 h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>

        {/* Status badge skeleton */}
        <div className="w-28 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>

        {/* Buttons skeleton */}
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
          <div className="flex-1 h-8 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default CustomCard;
