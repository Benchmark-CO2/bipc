import { deleteProject } from "@/actions/projects/deleteProjects";
import { postDuplicateProject } from "@/actions/projects/postDuplicateProject";
import { generateReport } from "@/actions/report/generateReport";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useTranslation } from "@/i18n";
import { IProject, TProjectPhase } from "@/types/projects";
import { parseApiError } from "@/utils/parseApiError";
import { phaseColors } from "@/utils/phaseConfig";
import { queryClient } from "@/utils/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Edit,
  Loader2,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DrawerFormProject } from "../layout";
import DialogTransferOwnership from "../layout/dialog-transfer-ownership";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import ModalSimple from "../layout/modal-simple";
import { Button } from "./button";
import { SimpleTooltip } from "./simple-tooltip";

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
  const { t } = useTranslation();

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
      toast.success(t.projects.deleteSuccess);
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      navigate({
        to: `/new_projects`,
        search: {
          activationRequired: false,
        },
      });
    },
    onError: (error: unknown) => {
      toast.error(t.projects.deleteError, {
        description: parseApiError(error, t),
        duration: 5000,
      });
    },
  });

  const { mutate: onDuplicateProject } = useMutation({
    mutationFn: (projectId: string) => {
      return postDuplicateProject(projectId);
    },
    onSuccess: async () => {
      toast.success(t.projects.duplicateSuccess);
      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      navigate({
        to: `/new_projects`,
        search: {
          activationRequired: false,
        },
      });
    },
    onError: (error: unknown) => {
      toast.error(t.projects.duplicateError, {
        description: parseApiError(error, t),
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

  const { mutate: onGenerateReport, isPending: isGeneratingReport } =
    useMutation({
      mutationFn: (projectId: string) => generateReport(projectId),
      onMutate: () => ({
        toastId: toast.loading(t.customBanner.downloadReportLoading),
      }),
      onSuccess: (response, _projectId, context) => {
        const blob = new Blob([response.data], {
          type: response.headers["content-type"] || "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        // Download via link: window.open after an async request is blocked as a pop-up.
        const link = document.createElement("a");
        link.href = url;
        link.download = "relatorio.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success(t.customBanner.downloadReportSuccess, {
          id: context?.toastId,
        });
      },
      onError: (error: unknown, _projectId, context) => {
        toast.error(t.customBanner.downloadReportError, {
          id: context?.toastId,
          description: parseApiError(error, t),
          duration: 5000,
        });
      },
    });

  const handleExport = () => {
    if (!id) return;
    onGenerateReport(id);
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
            <h1 className="text-h1 max-md:text-base text-white flex-1 min-w-[200px] break-words my-auto">
              {name}
            </h1>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md ${phaseColors[phase]}`}
              >
                {t.phase[phase]}
              </span>
              <SimpleTooltip
                content={t.projects.form.downloadReport}
                side="bottom"
              >
                <Button
                  onClick={handleExport}
                  variant="outline-bipc"
                  size="icon"
                  disabled={isGeneratingReport}
                  aria-busy={isGeneratingReport}
                >
                  {isGeneratingReport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </SimpleTooltip>
              {hasPermission("*:*") && (
                <ModalSimple
                  componentTrigger={
                    <SimpleTooltip
                      content={t.projects.duplicateTitle}
                      side="bottom"
                    >
                      <Button variant="outline-bipc" size="icon">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  }
                  title={t.projects.duplicateTitle}
                  content={t.projects.duplicateContent}
                  confirmTitle={t.projects.duplicateConfirm}
                  onConfirm={() => onDuplicateProject(project.id)}
                />
              )}

              {hasPermission("*:*") && (
                <DialogTransferOwnership
                  componentTrigger={
                    <SimpleTooltip
                      content={t.projects.projectTransfer.title}
                      side="bottom"
                    >
                      <Button variant="outline-bipc" size="icon">
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  }
                  projectId={project.id}
                  projectName={name}
                />
              )}

              {hasPermission("update:project") && (
                <DrawerFormProject
                  componentTrigger={
                    <SimpleTooltip
                      content={t.projects.form.editButton}
                      side="bottom"
                    >
                      <Button variant="bipc" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  }
                  projectData={project}
                />
              )}

              {hasPermission("*:*") && (
                <ModalConfirmDelete
                  componentTrigger={
                    <SimpleTooltip
                      content={t.projects.confirmDelete.title}
                      side="bottom"
                    >
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  }
                  title={t.projects.confirmDelete.title}
                  onConfirm={() => onDeleteProject?.(project.id)}
                />
              )}

              <SimpleTooltip
                content={isCollapsed ? t.common.expand : t.common.collapse}
                side="bottom"
              >
                <button
                  onClick={handleCollapseToggle}
                  className="text-slate-300 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                  aria-label={isCollapsed ? t.common.expand : t.common.collapse}
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 transition-transform duration-500" />
                  ) : (
                    <ChevronUp className="w-4 h-4 transition-transform duration-500" />
                  )}
                </button>
              </SimpleTooltip>
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
                      {unitsCount === 1
                        ? t.customBanner.building
                        : t.customBanner.buildings}
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
