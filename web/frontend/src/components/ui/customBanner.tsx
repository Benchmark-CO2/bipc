import { IProject, TProjectPhase } from "@/types/projects";
import { phaseColors, phaseLabels } from "@/utils/phaseConfig";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { DrawerFormProject } from "../layout";
import { Button } from "./button";
import DialogTransferOwnership from "../layout/dialog-transfer-ownership";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/utils/queryClient";
import { toast } from "sonner";
import { deleteProject } from "@/actions/projects/deleteProjects";
import { useNavigate } from "@tanstack/react-router";
import ModalSimple from "../layout/modal-simple";
import { postDuplicateProject } from "@/actions/projects/postDuplicateProject";

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

  const { mutate: onDuplicateProject } = useMutation({
    mutationFn: (projectId: string) => {
      return postDuplicateProject(projectId);
    },
    onSuccess: async (data) => {
      toast.success("Empreendimento duplicado com sucesso");
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      navigate({ to: `/new_projects` });
    },
    onError: (error: unknown) => {
      toast.error("Erro ao duplicar o empreendimento", {
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

  return (
    <div className="w-full max-md:w-12/12 rounded-lg mx-auto relative overflow-hidden transition-all duration-500">
      {image && (
        <img
          className="h-full w-full object-cover z-1 absolute right-0 top-0 rounded-lg opacity-30"
          src={image}
          alt={name}
        />
      )}

      <div className="relative bg-sidebar text-white rounded-lg px-6 max-md:px-4 py-4">
        <div className={`flex flex-col ${isCollapsed ? "gap-0" : "gap-3"}`}>
          {/* Primeira linha: name, phase, botões */}
          <div className="flex items-center justify-between gap-4 flex-wrap min-h-[40px]">
            <h1 className="text-lg max-md:text-base font-bold text-white flex-1 min-w-[200px] break-words my-auto">
              {name}
            </h1>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md ${phaseColors[phase]}`}
              >
                {phaseLabels[phase]}
              </span>

              {hasPermission("*:*") && (
                <ModalSimple
                  componentTrigger={
                    <Button variant="outline-bipc" size="icon">
                      <Copy className="w-4 h-4" />
                    </Button>
                  }
                  title="Duplicar empreendimento"
                  content="Tem certeza que deseja duplicar este empreendimento? Esta ação criará uma cópia idêntica do empreendimento, incluindo todas as suas informações e configurações. Você poderá editar os detalhes do novo empreendimento após a duplicação."
                  confirmTitle="Duplicar"
                  onConfirm={() => onDuplicateProject(project.id)}
                />
              )}

              {hasPermission("*:*") && (
                <DialogTransferOwnership
                  componentTrigger={
                    <Button variant="outline-bipc" size="icon">
                      <UserCheck className="w-4 h-4" />
                    </Button>
                  }
                  projectId={project.id}
                  projectName={name}
                />
              )}

              {hasPermission("update:project") && (
                <DrawerFormProject
                  componentTrigger={
                    <Button variant="bipc" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  }
                  projectData={project}
                />
              )}

              {hasPermission("*:*") && (
                <ModalConfirmDelete
                  componentTrigger={
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  }
                  title="Confirmar exclusão do empreendimento"
                  onConfirm={() => onDeleteProject?.(project.id)}
                />
              )}

              <button
                onClick={handleCollapseToggle}
                className="text-slate-300 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                aria-label={isCollapsed ? "Expandir banner" : "Colapsar banner"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 transition-transform duration-500" />
                ) : (
                  <ChevronUp className="w-4 h-4 transition-transform duration-500" />
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo expansível */}
          <div
            className={`grid transition-all duration-500 ease-in-out ${
              isCollapsed
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            }`}
          >
            <div className="overflow-hidden">
              {/* Segunda linha: city, state, fullAddress, unitsCount, totalArea */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                  <span className="text-xs text-slate-300">📍</span>
                  <span className="text-sm text-slate-200">
                    {city}, {state}
                  </span>
                </div>

                {fullAddress && (
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                    <span className="text-xs text-slate-300">🏠</span>
                    <span className="text-sm text-slate-200">
                      {fullAddress}
                    </span>
                  </div>
                )}

                {unitsCount && unitsCount > 0 && (
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                    <span className="text-blue-300 font-medium text-xs">
                      🏢
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {unitsCount}{" "}
                      {unitsCount === 1 ? "Edificação" : "Edificações"}
                    </span>
                  </div>
                )}

                {totalArea && totalArea > 0 && (
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-md px-3 py-1.5">
                    <span className="text-green-300 font-medium text-xs">
                      📐
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {totalArea.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}{" "}
                      m²
                    </span>
                  </div>
                )}
              </div>

              {/* Description Section */}
              {description && (
                <div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomBanner;
