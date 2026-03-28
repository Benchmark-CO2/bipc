import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { deleteModule } from "@/actions/modules/deleteModule";
import { postDuplicateModule } from "@/actions/modules/postDuplicateModule";
import { deleteOption } from "@/actions/options/deleteOption";
import { getOptions } from "@/actions/options/getOptions";
import { patchOption } from "@/actions/options/patchOption";
import { duplicateOption } from "@/actions/options/postDuplicateOption";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import {
  CommonTable,
  DialogCreateSimulation,
  DrawerFormModule,
} from "@/components/layout";
import ModalConfirmDelete from "@/components/layout/modal-confirm-delete";
import ModalSimple from "@/components/layout/modal-simple";
import TechnologiesSummary from "@/components/summaryVariants/technologies";
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
import { IConsumption, IModuleItem } from "@/types/modules";
import { TOption } from "@/types/options";
import { TConsumption } from "@/types/projects";
import { IUnit } from "@/types/units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Edit,
  Loader2,
  Plus,
  Star,
  Trash,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
}: {
  option: TOption;
  projectId: string;
  unitId: string;
  onSelectOption?: (option: TOption) => void;
  selectedOptions?: TOption[];
}) => {
  const queryClient = useQueryClient();
  const [localName, setLocalName] = useState(option.name);

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
    <div className="flex items-center gap-1">
      <Checkbox
        className="border-2 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-white"
        checked={selectedOptions?.some((opt) => opt.id === option.id) || false}
        onCheckedChange={() => (onSelectOption ? onSelectOption(option) : null)}
      />
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
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
      <Input
        type="text"
        placeholder="Simulação"
        value={localName}
        onChange={handleNameChange}
        onBlur={handleBlur}
        className="font-medium text-accent-foreground focus:border-primary focus:ring-primary max-w-[240px]"
      />
      {option.modules.some((mod) => mod.outdated) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 ml-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 cursor-help transition-all hover:shadow-sm">
              <TriangleAlert className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                Desatualizado
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            <span>
              Algumas tecnologias construtivas desta simulação estão
              desatualizadas devido a mudanças na unidade.
            </span>
          </TooltipContent>
        </Tooltip>
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
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<TOption[]>([]);
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
      toast.success("Simulação excluída com sucesso");
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: () => {
      toast.error("Erro ao deletar Simulação");
    },
  });

  const { mutate: duplicateSimulation, isPending: isDuplicating } = useMutation(
    {
      mutationFn: (optionId: string) =>
        duplicateOption(projectId, unitId, optionId),
      onSuccess: () => {
        toast.success("Simulação duplicada com sucesso");
        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
      },
      onError: () => {
        toast.error("Erro ao duplicar Simulação");
      },
    },
  );

  const { data: optionsData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["options", projectId, unitId],
    queryFn: () => getOptions(projectId, unitId, roleId!),
    enabled: !!projectId && !!unitId,
  });

  const { mutate: mutateDeleteTec, isPending: isDeletingTec } = useMutation({
    mutationFn: ({
      optionId,
      moduleId,
    }: {
      optionId: string;
      moduleId: string;
    }) => deleteModule(projectId, unitId, optionId, moduleId),
    onSuccess: () => {
      toast.success("Tecnologia Construtiva excluída com sucesso");
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: (error) => {
      toast.error("Erro ao excluir tecnologia construtiva", {
        description: error.message,
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
      toast.success("Tecnologia Construtiva duplicada com sucesso");
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: (error) => {
      toast.error("Erro ao duplicar tecnologia construtiva", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (!benchmarkData?.data || !unitData?.unit) return;
    setSummaryContext({
      component: (
        <TechnologiesSummary
          projects={selectedOptions as any}
          data={benchmarkData?.data}
          someSelected={selectedOptions.length > 0}
        />
      ),
      title: ``,
      hide: false,
    });
  }, [selectedOptions, setSummaryContext, benchmarkData, unitData]);

  if (isLoadingOptions || isLoadingUnit) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full">
        Carregando tecnologias construtivas...
      </div>
    );
  }

  if (!optionsData?.data?.options) {
    return (
      <NotFoundList
        message="Nenhuma simulação encontrada"
        showIcon={false}
        description="Nenhum dado disponível nesta tabela. Crie uma nova simulação para começar a adicionar dados."
      />
    );
  }

  const options = optionsData.data.options;

  const unit = unitData?.unit as IUnit;
  const unitFloors = unit?.floors || [];

  const calculateSumMetrics = (consumption: IConsumption) => {
    if (
      !consumption?.co2_min &&
      !consumption?.co2_max &&
      !consumption?.energy_min &&
      !consumption?.energy_max
    ) {
      return {
        co2_min: "0",
        co2_max: "0",
        energy_min: "0",
        energy_max: "0",
      };
    }

    return {
      co2_min: `${(consumption.co2_min || 0).toInternational()}`,
      co2_max: `${(consumption.co2_max || 0).toInternational()}`,
      energy_min: `${(consumption.energy_min || 0).toInternational()}`,
      energy_max: `${(consumption.energy_max || 0).toInternational()}`,
    };
  };

  const onSelectOption = (option: TOption) => {
    const isSelected = selectedOptions.some((opt) => opt.id === option.id);
    if (isSelected) {
      setSelectedOptions((prev) => prev.filter((opt) => opt.id !== option.id));
    } else {
      setSelectedOptions((prev) => [...prev, option]);
    }
  };

  const borderColumn = (option: TOption) => {
    if (option.modules.some((mod) => mod.outdated)) {
      return "border-yellow-500 dark:border-yellow-500";
    }
    if (option.active) {
      return "border-primary dark:border-primary";
    }
    return "border-gray-200 dark:border-gray-700";
  };

  const newColumns: ColumnDef<
    Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string }
  >[] = [
    ...constructiveTechnologies,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end gap-2">
            <ModalSimple
              title="Duplicar Tecnologia Construtiva"
              content="Tem certeza que deseja duplicar esta tecnologia construtiva? Esta ação criará uma cópia idêntica da tecnologia construtiva, incluindo todos os seus dados técnicos. Você poderá editar os detalhes da nova tecnologia construtiva após a duplicação."
              confirmTitle="Duplicar"
              onConfirm={() => {
                if (!row.original.option_id) return;
                if (!row.original.id) return;
                duplicateModule({
                  optionId: row.original.option_id,
                  moduleId: row.original.id,
                });
              }}
              componentTrigger={
                <Button variant="ghost" size="icon" disabled={isDeletingTec}>
                  {isDeletingTec ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 text-primary" />
                  )}
                </Button>
              }
            />
            <DrawerFormModule
              triggerComponent={
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                  <Edit className="h-4 w-4 text-primary" />
                </Button>
              }
              type={row.original.type}
              projectId={projectId}
              unitId={unitId}
              optionId={row.original.option_id}
              moduleId={row.original.id}
              floors={unitFloors}
            />
            <ModalConfirmDelete
              title="Excluir Tecnologia Construtiva"
              onConfirm={() =>
                mutateDeleteTec({
                  optionId: row.original.option_id,
                  moduleId: row.original.id,
                })
              }
              componentTrigger={
                <Button variant="ghost" size="icon" disabled={isDeletingTec}>
                  {isDeletingTec ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4 text-red-700" />
                  )}
                </Button>
              }
            />
          </div>
        );
      },
    },
  ];

  if (options.length === 0) {
    return (
      <NotFoundList
        message="Crie sua primeira simulação"
        showIcon={false}
        description="Clique em 'Nova Simulação' para adicionar os dados técnicos e das tecnologias construtivas deste projeto."
        button={
          <DialogCreateSimulation
            projectId={projectId}
            unitId={unitId}
            roleId={roleId}
            triggerComponent={<Button variant="bipc">Nova Simulação</Button>}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {options.map((option) => {
        const modules = option.modules.map((mod) => ({
          ...mod,
          ...mod.consumption,
          option_id: option.id,
        }));
        return (
          <div
            key={option.id}
            className={`flex items-center gap-2 rounded-xl border-2 ${borderColumn(option)} bg-white p-4 dark:bg-gray-800 w-full`}
          >
            <div className="flex items-center gap-2 justify-between w-full">
              <CommonTable
                tableName={
                  <OptionMenu
                    option={option}
                    projectId={projectId}
                    unitId={unitId}
                    onSelectOption={onSelectOption}
                    selectedOptions={selectedOptions}
                  />
                }
                data={modules}
                columns={newColumns}
                isSelectable={false}
                isInteractive={true}
                onSelectionChange={handleSelectItem}
                lastRow={{
                  type: "Total",
                  data: calculateSumMetrics(option?.consumption?.["total"]),
                }}
                actions={
                  <>
                    <ModalConfirmDelete
                      componentTrigger={
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
                      }
                      title="Excluir Simulação"
                      onConfirm={() => deleteSimulation(option.id)}
                    />
                    <ModalSimple
                      title="Duplicar Simulação"
                      content="Tem certeza que deseja duplicar esta simulação? Esta ação criará uma cópia idêntica da simulação, incluindo todas as tecnologias construtivas associadas. Você poderá editar os detalhes da nova simulação após a duplicação."
                      confirmTitle="Duplicar"
                      onConfirm={() => duplicateSimulation(option.id)}
                      componentTrigger={
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
                      }
                    />
                    <DrawerFormModule
                      triggerComponent={
                        <Button variant="outline-bipc">
                          Criar Simulações
                          <Plus className="ml-1 h-4 w-4" />
                        </Button>
                      }
                      type="concrete_wall"
                      floors={unitFloors}
                      projectId={projectId}
                      unitId={unitId}
                      optionId={option.id}
                    />
                  </>
                }
                customEmptyComponent={
                  <NotFoundList
                    message="Nenhuma tecnologia construtiva encontrada"
                    showIcon={false}
                    description={`Adicione tecnologias construtivas para essa simulação utilizando o botão "Adicionar Tecnologia".`}
                  />
                }
              />
            </div>
          </div>
        );
      })}
      <DialogCreateSimulation
        projectId={projectId}
        unitId={unitId}
        roleId={roleId}
      />
    </div>
  );
}
