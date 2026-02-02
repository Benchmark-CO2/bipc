import { IProject, TProjectPhase } from "@/types/projects";
import { ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { DrawerFormProject } from "../layout";
import { Button } from "./button";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/utils/queryClient";
import { toast } from "sonner";
import { deleteProject } from "@/actions/projects/deleteProjects";
import { useNavigate } from "@tanstack/react-router";

interface ICustomBanner {
  name: string;
  description: string;
  city: string;
  state: string;
  phase: TProjectPhase;
  image?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  cep?: string;
  id?: string;
  unitsCount?: number;
  totalArea?: number;
  collapsed?: boolean;
}

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

const CustomBanner = ({
  name,
  description,
  city,
  state,
  phase,
  image,
  neighborhood,
  street,
  number,
  cep,
  id,
  unitsCount,
  totalArea,
  collapsed = false,
}: ICustomBanner) => {
  const { hasPermission } = useProjectPermissions(id || "");
  const fullAddress = [street, number, neighborhood].filter(Boolean).join(", ");
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const navigate = useNavigate();

  const project = {
    name,
    description,
    city,
    state,
    phase,
    neighborhood: neighborhood || "",
    street: street || "",
    number: number || "",
    cep: cep || "",
    id: id || "",
  } as IProject;

  const { mutate: onDeleteProject } = useMutation({
    mutationFn: (projectId: string) => {
      return deleteProject(projectId);
    },
    onSuccess: async () => {
      toast.success("Empreendimento excluído com sucesso");
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      navigate({ to: `/new_projects` });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao excluir o empreendimento", {
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro desconhecido",
        duration: 5000,
      });
    },
  });

  const handleCollapseToggle = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("@banner/collapsed", String(newState));
      return newState;
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-full max-md:w-12/12 h-16 shadow-md shadow-zinc-600 dark:shadow-zinc-900 rounded-lg mx-auto relative overflow-hidden transition-all duration-300">
        {image && (
          <img
            className="h-full w-full object-cover z-1 absolute right-0 top-0 rounded-lg opacity-30"
            src={image}
            alt={name}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/85 to-slate-900/70 text-white rounded-lg">
          <div className="h-full px-6 max-md:px-4 flex items-center justify-between">
            <h1 className="text-lg max-md:text-base font-bold text-white truncate flex-1">
              {name}
            </h1>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md ${phaseColors[phase]}`}
              >
                {phaseLabels[phase]}
              </span>

              {hasPermission("*:*") && (
                <ModalConfirmDelete
                  componentTrigger={
                    <Button variant="outline-destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  }
                  title="Confirmar exclusão do empreendimento"
                  onConfirm={() => onDeleteProject?.(project.id)}
                />
              )}

              {hasPermission("update:project") && (
                <DrawerFormProject
                  componentTrigger={
                    <Button variant="outline-bipc" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  }
                  projectData={project}
                />
              )}
              <button
                onClick={handleCollapseToggle}
                className="text-slate-300 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                aria-label="Colapsar banner"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-md:w-12/12 h-48 shadow-lg shadow-zinc-600 dark:shadow-zinc-900 rounded-lg mx-auto relative overflow-hidden transition-all duration-300">
      {image && (
        <img
          className="h-full w-full object-cover z-1 absolute right-0 top-0 rounded-lg"
          src={image}
          alt={name}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/85 to-slate-900/70 text-white rounded-lg">
        <div className="h-full p-6 max-md:p-4 flex flex-col justify-between">
          {/* Header Section */}
          <div className="flex-shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h1 className="text-xl max-md:text-lg font-bold text-white truncate">
                  {name}
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-slate-300">📍</span>
                  <span className="text-sm text-slate-200 truncate">
                    {city}, {state}
                  </span>
                </div>
                {fullAddress && (
                  <div className="text-xs text-slate-300 truncate max-w-md mt-0.5 ml-4">
                    {fullAddress}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md ${phaseColors[phase]}`}
                  >
                    {phaseLabels[phase]}
                  </span>

                  {hasPermission("*:*") && (
                    <ModalConfirmDelete
                      componentTrigger={
                        <Button variant="outline-destructive" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      }
                      title="Confirmar exclusão do empreendimento"
                      onConfirm={() => onDeleteProject?.(project.id)}
                    />
                  )}

                  {hasPermission("update:project") && (
                    <DrawerFormProject
                      componentTrigger={
                        <Button variant="outline-bipc" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                      }
                      projectData={project}
                    />
                  )}
                  <button
                    onClick={handleCollapseToggle}
                    className="text-slate-300 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                    aria-label="Colapsar banner"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {unitsCount && unitsCount > 0 && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                      <span className="text-blue-300 font-medium">🏢</span>
                      <span className="text-xs font-semibold text-white">
                        {unitsCount}{" "}
                        {unitsCount === 1 ? "Edificação" : "Edificações"}
                      </span>
                    </div>
                  )}

                  {totalArea && totalArea > 0 && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                      <span className="text-green-300 font-medium">📐</span>
                      <span className="text-xs font-semibold text-white">
                        {totalArea.toLocaleString("pt-BR", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        m²
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="flex-1 flex items-end">
            <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomBanner;
