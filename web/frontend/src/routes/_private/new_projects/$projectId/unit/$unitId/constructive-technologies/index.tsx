import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { deleteModule } from "@/actions/modules/deleteModule";
import { postDuplicateModule } from "@/actions/modules/postDuplicateModule";
import { deleteOption } from "@/actions/options/deleteOption";
import { getOptions } from "@/actions/options/getOptions";
import { patchOption } from "@/actions/options/patchOption";
import { duplicateOption } from "@/actions/options/postDuplicateOption";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { makeConstructiveTechnologiesColumns } from "@/components/columns/constructiveTechnologies";
import {
  CommonTable,
  DialogCreateSimulation,
  DrawerFormModule,
  DrawerIFCImport,
} from "@/components/layout";
import ModalConfirmDelete from "@/components/layout/modal-confirm-delete";
import ModalSimple from "@/components/layout/modal-simple";
import TechnologiesSummary from "@/components/summaryVariants/technologies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import NotFoundList from "@/components/ui/not-found-list";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { IConsumption, IModuleItem } from "@/types/modules";
import { TOption } from "@/types/options";
import { TConsumption } from "@/types/projects";
import { IUnit } from "@/types/units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit,
  Loader2,
  Plus,
  Star,
  Trash,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import {
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies/",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      dcp: (search.dcp as string) || undefined,
    };
  },
});

const OptionMenu = ({
  option,
  projectId,
  unitId,
  onSelectOption,
  selectedOptions,
  isCollapsed,
  headerActions,
  onToggleCollapse,
}: {
  option: TOption;
  projectId: string;
  unitId: string;
  onSelectOption?: (option: TOption) => void;
  selectedOptions?: TOption[];
  isCollapsed?: boolean;
  headerActions?: ReactNode;
  onToggleCollapse?: () => void;
}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [localName, setLocalName] = useState(option.name);

  const completionStats = useMemo(() => {
    const total = option.modules.length;
    const completed = option.modules.filter((m) => m.completed).length;
    return { total, completed, allDone: total > 0 && completed === total };
  }, [option.modules]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (localName !== option.name && localName.trim() !== "") {
        try {
          await patchOption(projectId, unitId, option.id, { name: localName });

          queryClient.setQueryData(
            ["options", projectId, unitId],
            (oldData: any) => {
              if (!oldData?.data?.options) return oldData;

              return {
                ...oldData,
                data: {
                  ...oldData.data,
                  options: oldData.data.options.map((opt: TOption) =>
                    opt.id === option.id ? { ...opt, name: localName } : opt,
                  ),
                },
              };
            },
          );
        } catch (error) {
          console.error("Erro ao atualizar nome da opção:", error);
          setLocalName(option.name);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localName, option.name, projectId, unitId, option.id, queryClient]);

  useEffect(() => {
    setLocalName(option.name);
  }, [option.name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalName(e.target.value);
  };

  const handleBlur = async () => {
    if (localName !== option.name && localName.trim() !== "") {
      try {
        await patchOption(projectId, unitId, option.id, { name: localName });

        queryClient.setQueryData(
          ["options", projectId, unitId],
          (oldData: any) => {
            if (!oldData?.data?.options) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                options: oldData.data.options.map((opt: TOption) =>
                  opt.id === option.id ? { ...opt, name: localName } : opt,
                ),
              },
            };
          },
        );
      } catch (error) {
        console.error("Erro ao atualizar nome da opção:", error);
        setLocalName(option.name);
      }
    } else if (localName.trim() === "") {
      setLocalName(option.name);
    }
  };

  const handleActiveChange = async () => {
    try {
      const currentData = queryClient.getQueryData<any>([
        "options",
        projectId,
        unitId,
      ]);

      if (currentData?.data?.options) {
        if (option.active) {
          return;
        }

        const otherActiveOptions = currentData.data.options.filter(
          (opt: TOption) => opt.active && opt.id !== option.id,
        );

        const deactivatePromises = otherActiveOptions.map((opt: TOption) =>
          patchOption(projectId, unitId, opt.id, { active: false }),
        );

        const activatePromise = patchOption(projectId, unitId, option.id, {
          active: true,
        });

        await Promise.all([...deactivatePromises, activatePromise]);

        queryClient.setQueryData(
          ["options", projectId, unitId],
          (oldData: any) => {
            if (!oldData?.data?.options) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                options: oldData.data.options.map((opt: TOption) =>
                  opt.id === option.id
                    ? { ...opt, active: true }
                    : { ...opt, active: false },
                ),
              },
            };
          },
        );
      } else {
        await patchOption(projectId, unitId, option.id, { active: true });

        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["unit", projectId, unitId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
    } catch (error) {
      console.error("Erro ao atualizar status ativo da opção:", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full min-w-0">
      <div className="flex items-center gap-1 flex-nowrap shrink-0 min-w-[260px] max-w-full">
        <Checkbox
          className="border-2 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-white shrink-0"
          checked={
            selectedOptions?.some((opt) => opt.id === option.id) || false
          }
          onCheckedChange={() =>
            onSelectOption ? onSelectOption(option) : null
          }
        />
        <SimpleTooltip
          content={t.constructiveTechView.favoriteOption}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            onClick={handleActiveChange}
            disabled={option.modules.some((mod) => mod.outdated)}
          >
            <Star
              className={`h-4 w-4 ${
                option.active
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-gray-400 hover:text-yellow-500"
              }`}
            />
          </Button>
        </SimpleTooltip>
        <div className="min-w-[180px] w-full max-w-[260px]">
          <Input
            type="text"
            placeholder={t.constructiveTechView.placeholder}
            value={localName}
            onChange={handleNameChange}
            onBlur={handleBlur}
            className="font-medium text-accent-foreground focus:border-primary focus:ring-primary w-full"
          />
        </div>
        {option.modules.some((mod) => mod.outdated) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 cursor-help transition-all hover:shadow-sm">
                <TriangleAlert className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                  {t.constructiveTechView.outdated}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <span>{t.constructiveTechView.outdatedTooltip}</span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-nowrap ml-auto order-2 lg:order-3">
        {headerActions}
        {onToggleCollapse && (
          <SimpleTooltip
            content={isCollapsed ? t.common.expand : t.common.collapse}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="p-2 transition-transform duration-200 ease-in-out hover:scale-110"
            >
              <div
                className={`transition-transform duration-300 ease-in-out ${isCollapsed ? "rotate-0" : "rotate-180"}`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </Button>
          </SimpleTooltip>
        )}
      </div>

      {isCollapsed && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 flex-nowrap order-3 lg:order-2 w-full sm:w-auto justify-start sm:justify-end lg:justify-start lg:w-auto lg:ml-0">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
              CO₂
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-foreground tabular-nums truncate">
              {option?.consumption?.["total"]
                ? `${(option.consumption["total"].co2_min || 0).toInternational()} - ${(option.consumption["total"].co2_max || 0).toInternational()}`
                : "-"}
            </span>
            <span className="text-[11px] sm:text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
              kg CO₂/m²
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
              EN
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-foreground tabular-nums truncate">
              {option?.consumption?.["total"]
                ? `${(option.consumption["total"].energy_min || 0).toInternational()} - ${(option.consumption["total"].energy_max || 0).toInternational()}`
                : "-"}
            </span>
            <span className="text-[11px] sm:text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
              MJ/m²
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1.5 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shrink-0">
              MAT
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-foreground tabular-nums truncate">
              {option?.consumption?.["total"]
                ? (option.consumption["total"].material || 0).toInternational()
                : "-"}
            </span>
            <span className="text-[11px] sm:text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
              kg/m²
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 shrink-0 h-[30px] px-2.5",
              completionStats.allDone
                ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300",
            )}
          >
            {completionStats.allDone ? (
              <CheckCircle2 size={12} />
            ) : (
              <AlertCircle size={12} />
            )}
            <span className="text-[11px] sm:text-xs font-medium tabular-nums">
              {completionStats.completed}/{completionStats.total}
            </span>
          </Badge>
        </div>
      )}
    </div>
  );
};

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies",
  });
  const location = useLocation();
  const { search } = location;

  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [, setSelectedItems] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<TOption[]>([]);
  const [collapsedOptions, setCollapsedOptions] = useState<Set<string>>(
    new Set(),
  );
  const initializedRef = useRef(false);
  const { setSummaryContext } = useSummary();

  const roleId = (search as { dcp?: string }).dcp || "";

  const handleSelectItem = (item: any[]) => {
    setSelectedItems(item);
  };

  const { data: benchmarkData } = useQuery({
    queryKey: ["projects-benchmarks"],
    queryFn: () => getProjectsBenchmark({}),
  });

  const { mutate: deleteSimulation, isPending: isDeleting } = useMutation({
    mutationFn: (optionId: string) => deleteOption(projectId, unitId, optionId),
    onSuccess: () => {
      toast.success(t.constructiveTechView.successDeleteSimulation);
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: (error) => {
      toast.error(t.constructiveTechView.errorDeleteSimulation, {
        description: parseApiError(error, t),
      });
    },
  });

  const { mutate: duplicateSimulation, isPending: isDuplicating } = useMutation(
    {
      mutationFn: (optionId: string) =>
        duplicateOption(projectId, unitId, optionId),
      onSuccess: () => {
        toast.success(t.constructiveTechView.successDuplicateSimulation);
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
      },
      onError: (error) => {
        toast.error(t.constructiveTechView.errorDuplicateSimulation, {
          description: parseApiError(error, t),
        });
      },
    },
  );

  const { data: optionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["options", projectId, unitId],
    queryFn: () => getOptions(projectId, unitId, roleId!),
    enabled: !!projectId && !!unitId,
  });

  useEffect(() => {
    if (initializedRef.current || !optionsData?.data?.options) return;
    const opts = optionsData.data.options;
    const activeOption = opts.find((opt: TOption) => opt.active);
    if (activeOption) {
      setSelectedOptions([activeOption]);
    }
    setCollapsedOptions(
      new Set(
        opts
          .filter((opt: TOption) => !opt.active)
          .map((opt: TOption) => opt.id),
      ),
    );
    initializedRef.current = true;
  }, [optionsData]);

  const { mutate: mutateDeleteTec, isPending: isDeletingTec } = useMutation({
    mutationFn: ({
      optionId,
      moduleId,
    }: {
      optionId: string;
      moduleId: string;
    }) => deleteModule(projectId, unitId, optionId, moduleId),
    onSuccess: () => {
      toast.success(t.constructiveTechView.successDeleteTech);
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: (error) => {
      toast.error(t.constructiveTechView.errorDeleteTech, {
        description: parseApiError(error, t),
      });
    },
  });

  const { data: unitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: async () => {
      if (projectId && unitId) {
        const res = await getUnitByUUID(projectId, unitId);
        return { unit: res.data.unit, roles: res.data.roles };
      }
      return null;
    },
    enabled: !!projectId && !!unitId,
  });

  const { mutate: duplicateModule } = useMutation({
    mutationFn: ({
      optionId,
      moduleId,
    }: {
      optionId: string;
      moduleId: string;
    }) => postDuplicateModule(projectId, unitId, optionId, moduleId),
    onSuccess: () => {
      toast.success(t.constructiveTechView.successDuplicateTech);
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: (error) => {
      toast.error(t.constructiveTechView.errorDuplicateTech, {
        description: parseApiError(error, t),
      });
    },
  });

  const technologiesSummaryPayload = useMemo(() => {
    if (!benchmarkData?.data || !unitData?.unit) return null;
    return {
      component: (
        <TechnologiesSummary
          projects={selectedOptions as any}
          data={benchmarkData?.data}
          someSelected={selectedOptions.length > 0}
        />
      ),
      title: "",
      hide: false,
    };
  }, [benchmarkData, unitData, selectedOptions]);

  useEffect(() => {
    if (!technologiesSummaryPayload) return;
    setSummaryContext(technologiesSummaryPayload);
  }, [setSummaryContext, technologiesSummaryPayload]);

  // Variáveis derivadas (sem hooks). Declaradas ANTES dos early returns
  // para respeitar as Rules of Hooks — podem referenciar unit/options undefined
  // pois só são usadas APÓS os early returns no JSX.
  const options = optionsData?.data?.options ?? [];
  const sortedOptions = [...options].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return 0;
  });
  const unit = (unitData?.unit as IUnit) || ({} as IUnit);
  const unitFloors = unit?.floors || [];

  const calculateSumMetrics = (consumption: IConsumption) => {
    if (
      !consumption?.co2_min &&
      !consumption?.co2_max &&
      !consumption?.energy_min &&
      !consumption?.energy_max
    ) {
      return {
        co2_range: "0 - 0",
        energy_range: "0 - 0",
        material: (0).toInternational(),
      };
    }
    return {
      co2_range: `${(consumption.co2_min || 0).toInternational()} - ${(consumption.co2_max || 0).toInternational()}`,
      energy_range: `${(consumption.energy_min || 0).toInternational()} - ${(consumption.energy_max || 0).toInternational()}`,
      material: `${(consumption.material || 0).toInternational()}`,
    };
  };

  const onSelectOption = (option: TOption) => {
    setSelectedOptions((prev) => {
      const isSelected = prev.some((opt) => opt.id === option.id);
      if (isSelected) return prev.filter((opt) => opt.id !== option.id);
      return [...prev, option];
    });
  };

  const borderColumn = (option: TOption) => {
    if (option.modules.some((mod) => mod.outdated)) {
      return "border-yellow-500 dark:border-yellow-500";
    }
    if (option.active) return "border-primary dark:border-primary";
    return "border-gray-200 dark:border-gray-700";
  };

  const newColumns: ColumnDef<
    Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string }
  >[] = [
    ...makeConstructiveTechnologiesColumns(t),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <ModalSimple
              title={t.constructiveTechView.duplicateTech}
              content={t.constructiveTechView.duplicateTechContent}
              confirmTitle={t.columns.duplicate}
              onConfirm={() => {
                if (!row.original.option_id) return;
                if (!row.original.id) return;
                duplicateModule({
                  optionId: row.original.option_id,
                  moduleId: row.original.id,
                });
              }}
              componentTrigger={
                <SimpleTooltip content={t.modules.duplicateTitle} side="bottom">
                  <Button variant="ghost" size="icon" disabled={isDeletingTec}>
                    {isDeletingTec ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </SimpleTooltip>
              }
            />
            <DrawerFormModule
              key={`edit-${row.original.option_id}-${row.original.id}`}
              triggerComponent={
                <SimpleTooltip content={t.modules.editTitle} side="bottom">
                  <Button variant="ghost" size="icon" disabled={isDeleting}>
                    <Edit className="h-4 w-4 text-primary" />
                  </Button>
                </SimpleTooltip>
              }
              type={row.original.type}
              projectId={projectId}
              unitId={unitId}
              optionId={row.original.option_id}
              moduleId={row.original.id}
              floors={unitFloors}
            />
            <ModalConfirmDelete
              title={t.constructiveTechView.deleteTech}
              onConfirm={() =>
                mutateDeleteTec({
                  optionId: row.original.option_id,
                  moduleId: row.original.id,
                })
              }
              componentTrigger={
                <SimpleTooltip content={t.modules.deleteTitle} side="bottom">
                  <Button variant="ghost" size="icon" disabled={isDeletingTec}>
                    {isDeletingTec ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4 text-red-700" />
                    )}
                  </Button>
                </SimpleTooltip>
              }
            />
          </div>
        );
      },
    },
  ];

  // Map por option → flat modules + lastRow
  const preparedOptionData = sortedOptions.map((option) => ({
    optionId: option.id,
    modules: option.modules.map((mod) => ({
      ...mod,
      ...mod.consumption,
      option_id: option.id,
    })),
    lastRow: {
      type: "Total" as const,
      data: calculateSumMetrics(option?.consumption?.["total"]),
    },
  }));

  const getPreparedData = (optionId: string) =>
    preparedOptionData.find((p) => p.optionId === optionId) ?? {
      modules: [],
      lastRow: { type: "Total" as const, data: {} },
    };

  // 🔴 ============================================================
  // EARLY RETURNS ABAIXO. NÃO ADICIONAR NOVOS HOOKS APÓS ESTA LINHA.
  // ================================================================
  if (isLoadingOptions || isLoadingUnit) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full">
        {t.common.loading}
      </div>
    );
  }

  if (!optionsData?.data?.options) {
    return (
      <NotFoundList
        message={t.constructiveTechView.noSimulationsFound}
        showIcon={false}
        description={t.constructiveTechView.noSimulationsDescription}
      />
    );
  }

  if (options.length === 0) {
    return (
      <NotFoundList
        message={t.constructiveTechView.createFirstSimulation}
        showIcon={false}
        description={t.constructiveTechView.createFirstSimulationDescription}
        button={
          <div className="flex items-center gap-4">
            <DialogCreateSimulation
              projectId={projectId}
              unitId={unitId}
              roleId={roleId}
              triggerComponent={
                <Button variant="bipc">
                  {t.constructiveTechView.newSimulation}
                </Button>
              }
            />
            <small>{t.common.orLabel}</small>
            <DrawerIFCImport
              mode="simulation"
              projectId={projectId}
              unitId={unitId}
              roleId={roleId}
              triggerComponent={
                <Button variant="bipc">{t.common.ifcImportTqs}</Button>
              }
            />
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <DialogCreateSimulation
          projectId={projectId}
          unitId={unitId}
          roleId={roleId}
        />
        <DrawerIFCImport
          mode="simulation"
          projectId={projectId}
          unitId={unitId}
          roleId={roleId}
          triggerComponent={
            <Button variant="outline-bipc">{t.common.ifcImportTqs}</Button>
          }
        />
      </div>
      {sortedOptions.map((option) => {
        const prepared = getPreparedData(option.id);
        const isCollapsed = collapsedOptions.has(option.id);

        const toggleCollapse = () => {
          setCollapsedOptions((prev) => {
            const next = new Set(prev);
            if (next.has(option.id)) {
              next.delete(option.id);
            } else {
              next.add(option.id);
            }
            return next;
          });
        };

        const headerActions = (
          <>
            <ModalConfirmDelete
              componentTrigger={
                <SimpleTooltip
                  content={t.constructiveTechView.deleteSimulation}
                  side="bottom"
                >
                  <Button
                    variant="outline-destructive"
                    size="icon-lg"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4 text-red-700" />
                    )}
                  </Button>
                </SimpleTooltip>
              }
              title={t.constructiveTechView.deleteSimulation}
              onConfirm={() => deleteSimulation(option.id)}
            />
            <ModalSimple
              title={t.constructiveTechView.duplicateSimulation}
              content={t.constructiveTechView.duplicateSimulationContent}
              confirmTitle={t.columns.duplicate}
              onConfirm={() => duplicateSimulation(option.id)}
              componentTrigger={
                <SimpleTooltip
                  content={t.constructiveTechView.duplicateSimulation}
                  side="bottom"
                >
                  <Button
                    variant="outline-bipc"
                    size="icon-lg"
                    disabled={isDuplicating}
                  >
                    {isDuplicating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </SimpleTooltip>
              }
            />
            <DrawerFormModule
              triggerComponent={
                <SimpleTooltip
                  content={t.constructiveTechView.createSimulations}
                  side="bottom"
                >
                  <Button variant="outline-bipc" size="icon-lg">
                    <Plus className="h-4 w-4" />
                  </Button>
                </SimpleTooltip>
              }
              type="concrete_wall"
              floors={unitFloors}
              projectId={projectId}
              unitId={unitId}
              optionId={option.id}
            />
          </>
        );

        return (
          <div
            key={option.id}
            className={`flex items-center gap-2 rounded-xl border-2 ${borderColumn(option)} bg-white p-4 dark:bg-dark-950 w-full`}
          >
            <div className="w-full">
              <CommonTable
                tableName={
                  <OptionMenu
                    option={option}
                    projectId={projectId}
                    unitId={unitId}
                    onSelectOption={onSelectOption}
                    selectedOptions={selectedOptions}
                    isCollapsed={isCollapsed}
                    headerActions={headerActions}
                    onToggleCollapse={toggleCollapse}
                  />
                }
                data={prepared.modules}
                columns={newColumns}
                isSelectable={false}
                isInteractive={true}
                onSelectionChange={handleSelectItem}
                lastRow={prepared.lastRow}
                collapsed={isCollapsed}
                isExpandable={false}
                customEmptyComponent={
                  <NotFoundList
                    message={t.constructiveTechView.noTechFound}
                    showIcon={false}
                    description={t.constructiveTechView.noTechDescription}
                  />
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
