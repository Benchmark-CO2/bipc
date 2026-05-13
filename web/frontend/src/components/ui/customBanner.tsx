import { getProjectsBenchmark } from '@/actions/benchmarks/getProjects';
import { deleteProject } from "@/actions/projects/deleteProjects";
import { postDuplicateProject } from "@/actions/projects/postDuplicateProject";
import { generateReport } from '@/actions/report/generateReport';
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { IProject, TProjectPhase } from "@/types/projects";
import { phaseColors, phaseLabels } from "@/utils/phaseConfig";
import { queryClient } from "@/utils/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportChartToPng } from '../charts/exportChart';
import { DrawerFormProject } from "../layout";
import DialogTransferOwnership from "../layout/dialog-transfer-ownership";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import ModalSimple from "../layout/modal-simple";
import { normalizeBenchmarkSeries, recalculateY } from '../summaryVariants/utils';
import { Button } from "./button";

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

  const { data: benchmarkData } = useQuery({
    queryKey: ["benchmark", id],
    queryFn: () => getProjectsBenchmark({}),
  });
  const handleCollapseToggle = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("@banner/collapsed", String(newState));
      return newState;
    });
  };

   const { mutate: onGenerateReport } = useMutation({
    mutationFn: (formData: { co2: File; energy: File, projectId: string }) => generateReport(formData.projectId, formData),
    onSuccess: async (data) => {
      toast.success("Relatório gerado com sucesso");
      console.log("Relatório gerado:", data);
    },
    onError: (error: unknown) => {
      toast.error("Erro ao gerar o relatório", {
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro desconhecido",
        duration: 5000,
      });
    },
  });
  const handleExport = async () => {
    const projectData = queryClient.getQueryData<any>(["project", id]);
    const consumption = projectData?.data?.project?.consumption?.total;

    const buildChartImage = async (
      type: "co2" | "energy",
      unit: string,
      minField: string,
      maxField: string,
    ) => {
      const series = benchmarkData?.data.benchmark[type];
      const normalized = normalizeBenchmarkSeries(series);

      const allData =
        consumption
          ? [
              ...normalized,
              {
                id: id!,
                minId: id!,
                maxId: id!,
                y: 0,
                min: consumption[minField],
                max: consumption[maxField],
                label: name,
              },
            ]
          : normalized;

      const minData = allData.map((d) => d.min);
      const maxData = allData.map((d) => d.max);
      const minValue = minData.length ? Math.min(...minData) : 0;
      const maxValue = maxData.length ? Math.max(...maxData) : 0;
      const chartData = recalculateY(allData, minValue, maxValue);

      const projectPoint = chartData.find((d) => d.id === id);
      const procelClass = projectPoint
        ? projectPoint.y < 0.25 ? "A"
          : projectPoint.y < 0.5 ? "B"
            : projectPoint.y < 0.75 ? "C"
              : "D"
        : null;

      return exportChartToPng({
        data: chartData,
        selectedBars: id ? [id] : [],
        showProcelScale: true,
        procelHighlight: procelClass,
        unit,
        showBaseline: true,
        showTop5Line: true,
        top5Field: "min",
        showMaxCurve: true,
        showMinCurve: true,
        showMidCurve: true,
      });
    };

    const [co2Image, energyImage] = await Promise.all([
      buildChartImage("co2", "KgCO₂/m²", "co2_min", "co2_max"),
      buildChartImage("energy", "MJ/m²", "energy_min", "energy_max"),
    ]);

    const co2File = new File([co2Image.blob], "co2_chart.png", { type: "image/png" });
    const energyFile = new File([energyImage.blob], "energy_chart.png", { type: "image/png" });
    onGenerateReport({
      projectId: id!,
      co2: co2File,
      energy: energyFile,
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
            <h1 className="text-h1 max-md:text-base text-white flex-1 min-w-[200px] break-words my-auto">
              {name}
            </h1>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md ${phaseColors[phase]}`}
              >
                {phaseLabels[phase]}
              </span>
              <Button onClick={handleExport}>
                Exportar
              </Button>
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
            className={`grid transition-all duration-500 ease-in-out ${isCollapsed
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
