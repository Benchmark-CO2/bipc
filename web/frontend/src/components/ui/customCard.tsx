import { IProject, TProjectPhase } from "@/types/projects";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { Edit, EllipsisVertical, Clock } from "lucide-react";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { DrawerFormProject } from "../layout";
import DrawerInvite from "../layout/drawer-invite";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { Checkbox } from "./checkbox";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

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

const CardMenu = ({
  onDeleteProject,
  project,
  onEditClick,
}: {
  onDeleteProject?: (projectUid: string) => void;
  project: IProject;
  onEditClick: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <DropdownMenu dir="ltr" modal={false} key={project.id}>
      <DropdownMenuTrigger asChild>
        <button
          data-action="card-menu"
          className="z-10 absolute right-3 top-3 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <EllipsisVertical className="w-5 h-5" color="#FFF" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="relative flex flex-col w-[200px]">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <DrawerInvite projectId={project.id} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditClick}>
          <div className="w-full flex items-center justify-between">
            {t("common.edit")}
            <Edit size={20} className="delete-project hover:shadow-md" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <ModalConfirmDelete
            key={project.id}
            title={t("modalConfirmDelete.projectTitle")}
            onConfirm={() => onDeleteProject?.(project.id)}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const { description, name, updated_at, phase } = project;
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const handleClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const dataType = target
      .closest("[data-action]")
      ?.getAttribute("data-action");
    if (
      dataType === "delete-project" ||
      dataType === "edit-project" ||
      dataType === "card-menu"
    ) {
      console.log("Action not handled for:", dataType);
      return;
    } else if (dataType === "open-project") {
      onClick();
    }
  };

  const handleClickCheck = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleSelectProject(project.id!, !selectedProjects.get(project.id!));
  };

  const handleEditClick = () => {
    editButtonRef.current?.click();
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
        data-action="open-project"
        onClick={handleClickCard}
        className="card w-full relative md:max-w-md flex-col items-center justify-center overflow-hidden rounded-lg bg-primary shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-lg hover:scale-[1.02] dark:shadow-dark-900 h-[160px]"
      >
        <div className="group w-full h-full">
          <CardMenu
            onDeleteProject={onDeleteProject}
            project={project}
            onEditClick={handleEditClick}
          />
          <div className="flex h-full w-full max-w-md flex-col justify-between gap-2 p-3 py-4 text-white">
            <div className="flex w-full justify-between items-start pr-8">
              <Checkbox
                onClick={handleClickCheck}
                data-checked={selectedProjects?.get(project.id!) || false}
                checked={selectedProjects?.get(project.id!) || false}
                className="data-[checked=true]:bg-white data-[checked=true]:text-primary scale-125 border-white bg-primary transition-all"
              />
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold text-white shadow-md ${phaseColors[phase]}`}
              >
                {phaseLabels[phase]}
              </span>
            </div>

            {/* Project Name and Description */}
            <div className="flex flex-col gap-1 flex-1 min-h-0">
              <span className="text-xl font-bold text-left line-clamp-1">
                {name}
              </span>
              <span className="text-sm text-slate-200 line-clamp-2 leading-snug">
                {description}
              </span>
            </div>

            {/* Footer with Date */}
            <div className="flex items-center gap-1.5 text-slate-300 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {formatDate(updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DrawerFormProject
        componentTrigger={
          <button ref={editButtonRef} className="hidden" aria-hidden="true" />
        }
        projectData={project}
      />
    </>
  );
};

export const CustomCardSkeleton = () => {
  return (
    <div className="relative h-[160px] w-full">
      <div className="h-full w-full animate-pulse rounded-lg bg-gray-300"></div>
      <div className="absolute top-0 left-0 h-full w-full rounded-lg bg-black opacity-50"></div>
    </div>
  );
};

export default CustomCard;
