import { getProjectsBenchmark } from "@/actions/benchmarks/getProjects";
import { deleteModule } from "@/actions/modules/deleteModule";
import { deleteOption } from "@/actions/options/deleteOption";
import { getOptions } from "@/actions/options/getOptions";
import { patchOption } from "@/actions/options/patchOption";
import { getUnitByUUID } from "@/actions/units/getUnit";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import {
  CommonTable,
  DialogCreateSimulation,
  DrawerFormModule,
} from "@/components/layout";
import ModalConfirmDelete from "@/components/layout/modal-confirm-delete";
import TechnologiesSummary from "@/components/summaryVariants/technologies";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import NotFoundList from "@/components/ui/not-found-list";
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
import { Copy, Edit, Loader2, Plus, Star, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function mergeUnitAndOptions(unit: IUnit, towerOptions: TOption[]) {
  const areaTotal =
    unit.floors.reduce((sum, floor) => sum + (floor.area || 0), 0) || 0;
  return towerOptions
    .filter((opt) => opt.unit_id === unit.id)
    .map((opt) => ({
      ...opt,
      area: areaTotal,
      modules: opt.modules.map((module) => ({
        ...module,
      })),
    }));
}
export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies/"
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
                    opt.id === option.id ? { ...opt, name: localName } : opt
                  ),
                },
              };
            }
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
                  opt.id === option.id ? { ...opt, name: localName } : opt
                ),
              },
            };
          }
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
          (opt: TOption) => opt.active && opt.id !== option.id
        );

        const deactivatePromises = otherActiveOptions.map((opt: TOption) =>
          patchOption(projectId, unitId, opt.id, { active: false })
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
                    : { ...opt, active: false }
                ),
              },
            };
          }
        );
      } else {
        await patchOption(projectId, unitId, option.id, { active: true });

        queryClient.invalidateQueries({
          queryKey: ["options", projectId, unitId],
        });
      }
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
      >
        <Star
          className={`h-4 w-4 ${option.active
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
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    },
    onError: () => {
      console.error("Erro ao deletar opção");
    },
  });

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
        co2_min: "0 KgCO2/m²",
        co2_max: "0 KgCO2/m²",
        energy_min: "0 MJ/m²",
        energy_max: "0 MJ/m²",
      };
    }

    return {
      co2_min: `${(consumption.co2_min || 0).toFixed(1)} KgCO2/m²`,
      co2_max: `${(consumption.co2_max || 0).toFixed(1)} KgCO2/m²`,
      energy_min: `${(consumption.energy_min || 0).toFixed(1)} MJ/m²`,
      energy_max: `${(consumption.energy_max || 0).toFixed(1)} MJ/m²`,
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
        message="Nenhuma simulação encontrada"
        showIcon={false}
        description="Nenhum dado disponível nesta tabela. Crie uma nova simulação para começar a adicionar dados."
        button={
          <DialogCreateSimulation
            projectId={projectId}
            unitId={unitId}
            roleId={roleId}
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
            className={`flex items-center gap-2 rounded-xl border-2 ${option.active ? "border-primary" : "border-gray-200"} bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full`}
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
                    <Button variant="outline-bipc" size="icon-lg" disabled>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <DrawerFormModule
                      triggerComponent={
                        <Button variant="outline-bipc">
                          Adicionar Tecnologia
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
