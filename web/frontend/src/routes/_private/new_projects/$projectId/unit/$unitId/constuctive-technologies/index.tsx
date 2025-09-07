import { getOptions } from "@/actions/options/getOptions";
import { patchOption } from "@/actions/options/patchOption";
import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import {
  CommonTable,
  DialogCreateSimulation,
  DrawerFormModule,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotFoundList from "@/components/ui/not-found-list";
import { TOption } from "@/types/options";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Copy, Star, Trash } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies/"
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
      />
    </div>
  );
};

const newColumns: ColumnDef<any>[] = [
  ...constructiveTechnologies,
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log(row.original)}
          >
            Editar
          </Button>
        </div>
      );
    },
  },
];

function RouteComponent() {
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/constuctive-technologies",
  });

  const { data: optionsData, isLoading } = useQuery({
    queryKey: ["options", projectId, unitId],
    queryFn: () => getOptions(projectId, unitId),
    enabled: !!projectId && !!unitId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  if (isLoading) {
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

  return (
    <div className="flex flex-col gap-4">
      {options.map((option) => (
        <div
          key={option.id}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 w-full"
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
              data={[]}
              columns={newColumns}
              isSelectable={true}
              isInteractive={true}
              onSelectionChange={console.log}
              actions={
                <>
                  <DrawerFormModule
                    triggerComponent={
                      <Button variant="outline" size="sm">
                        Adicionar Tecnologia
                      </Button>
                    }
                    type="concrete_wall"
                  />
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4 text-red-700" />
                  </Button>
                </>
              }
            />
          </div>
        </div>
      ))}
      <DialogCreateSimulation />
    </div>
  );
}
