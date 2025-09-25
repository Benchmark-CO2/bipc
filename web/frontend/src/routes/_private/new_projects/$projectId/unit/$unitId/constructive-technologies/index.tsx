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
import { Input } from "@/components/ui/input";
import NotFoundList from "@/components/ui/not-found-list";
import { useSummary } from "@/context/summaryContext";
import { IModuleItem } from "@/types/modules";
import { TOption } from "@/types/options";
import { TConsumption } from "@/types/projects";
import { IUnit } from "@/types/units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, Loader2, Star, Trash } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies/"
)({
  component: RouteComponent,
});

const OptionMenu = ({
  option,
  projectId,
  unitId,
}: {
  option: TOption;
  projectId: string;
  unitId: string;
}) => {
  const queryClient = useQueryClient();
  const [localName, setLocalName] = useState(option.name);
  const { setSummaryContext } = useSummary();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (localName !== option.name && localName.trim() !== "") {
        try {
          await patchOption(projectId, unitId, option.id, { name: localName });

          queryClient.setQueryData(
            ["options", projectId, unitId],
            (oldData: any) => {
              if (!oldData?.data?.tower_options) return oldData;

              return {
                ...oldData,
                data: {
                  ...oldData.data,
                  tower_options: oldData.data.tower_options.map(
                    (opt: TOption) =>
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

  useEffect(() => {
    setSummaryContext({
      component: null,
      title: "Simulação",
    });
  }, [setSummaryContext]);
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
            if (!oldData?.data?.tower_options) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                tower_options: oldData.data.tower_options.map((opt: TOption) =>
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

      if (currentData?.data?.tower_options) {
        if (option.active) {
          return;
        }

        const otherActiveOptions = currentData.data.tower_options.filter(
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
            if (!oldData?.data?.tower_options) return oldData;

            return {
              ...oldData,
              data: {
                ...oldData.data,
                tower_options: oldData.data.tower_options.map((opt: TOption) =>
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
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleActiveChange}
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
        className="font-medium text-accent-foreground focus:border-primary focus:ring-primary"
      />
    </div>
  );
};

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/constructive-technologies",
  });

  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const { setSummaryContext } = useSummary();

  const handleSelectItem = (item: any[]) => {
    setSelectedItems(item);
    console.log("Selected item:", item);
  };

  useEffect(() => {
    setSummaryContext({
      component: null,
      title: `${selectedItems.length} andar(s) selecionado(s)`,
      hide: true,
    });
  }, [selectedItems, setSummaryContext]);

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
    queryFn: () => getOptions(projectId, unitId),
    enabled: !!projectId && !!unitId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  const { data: unitData, isLoading: isLoadingUnit } = useQuery({
    queryKey: ["unit", projectId, unitId],
    queryFn: () => getUnitByUUID(projectId, unitId),
    enabled: !!projectId && !!unitId,
  });

  if (isLoadingOptions || isLoadingUnit) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full">
        Carregando tecnologias construtivas...
      </div>
    );
  }

  if (!optionsData?.data?.tower_options) {
    return (
      <NotFoundList
        message="Nenhuma simulação encontrada"
        showIcon={false}
        description="Nenhum dado disponível nesta tabela. Crie uma nova simulação para começar a adicionar dados."
      />
    );
  }

  const options = optionsData.data.tower_options;

  const unit = unitData?.data?.unit as IUnit;
  const unitTowerFloors = unit?.tower?.floors || [];

  const calculateSumMetrics = (modules: IModuleItem[]) => {
    const totalModules = modules.length;
    if (totalModules === 0) {
      return {
        co2_min: "0 KgCO2/m²",
        co2_max: "0 KgCO2/m²",
        energy_min: "0 MJ/m²",
        energy_max: "0 MJ/m²",
      };
    }

    const sumCO2Min = modules.reduce(
      (acc, curr) => acc + (curr.consumption.co2_min || 0),
      0
    );
    const sumCO2Max = modules.reduce(
      (acc, curr) => acc + (curr.consumption.co2_max || 0),
      0
    );
    const sumEnergyMin = modules.reduce(
      (acc, curr) => acc + (curr.consumption.energy_min || 0),
      0
    );
    const sumEnergyMax = modules.reduce(
      (acc, curr) => acc + (curr.consumption.energy_max || 0),
      0
    );

    return {
      co2_min: `${sumCO2Min.toFixed(1)} KgCO2`,
      co2_max: `${sumCO2Max.toFixed(1)} KgCO2`,
      energy_min: `${sumEnergyMin.toFixed(1)} MJ`,
      energy_max: `${sumEnergyMax.toFixed(1)} MJ`,
    };
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
          <div className="flex items-center gap-2">
            <DrawerFormModule
              triggerComponent={
                <Button variant="outline" size="sm" className="ml-auto">
                  Editar
                </Button>
              }
              type={row.original.type}
              projectId={projectId}
              unitId={unitId}
              optionId={row.original.option_id}
              moduleId={row.original.id}
              floors={unitTowerFloors}
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
          <DialogCreateSimulation projectId={projectId} unitId={unitId} />
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
                  />
                }
                data={modules}
                columns={newColumns}
                isSelectable={true}
                isInteractive={true}
                onSelectionChange={handleSelectItem}
                lastRow={{ type: "Total", data: calculateSumMetrics(modules) }}
                actions={
                  <>
                    <DrawerFormModule
                      triggerComponent={
                        <Button variant="bipc" size="sm">
                          Adicionar Tecnologia
                        </Button>
                      }
                      type="concrete_wall"
                      floors={unitTowerFloors}
                      projectId={projectId}
                      unitId={unitId}
                      optionId={option.id}
                    />
                    <Button variant="ghost" size="icon" disabled>
                      <Copy className="h-4 w-4 text-primary" />
                    </Button>
                    <ModalConfirmDelete
                      componentTrigger={
                        <Button
                          variant="ghost"
                          size="icon"
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
                  </>
                }
              />
            </div>
          </div>
        );
      })}
      <DialogCreateSimulation projectId={projectId} unitId={unitId} />
    </div>
  );
}
