import { TConsumption, TProjectUnit } from "@/types/projects";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUnit } from "@/actions/units/deleteUnit";
import { toast } from "sonner";
import { Edit, Loader2, Trash } from "lucide-react";
import { DrawerFormUnit } from "../layout";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";

export const unitsColumns: ColumnDef<
  Pick<TProjectUnit, "name" | "id" | "area"> & TConsumption
>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <div className="text-left">{row.original.name || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => <div className="text-center">Área Total (m²)</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.area?.toFixed(1)
          ? `${row.original?.area?.toFixed(1)} m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => <div className="text-center">CO2 max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_max?.toFixed(1)
          ? `${row.original?.co2_max?.toFixed(1)} KgCO₂/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => <div className="text-center">CO2 min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_min?.toFixed(1)
          ? `${row.original?.co2_min?.toFixed(1)} KgCO₂/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => <div className="text-center">Energia max</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_max?.toFixed(1)
          ? `${row.original?.energy_max?.toFixed(1)} MJ/m²`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => <div className="text-center">Energia min</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_min?.toFixed(1)
          ? `${row.original?.energy_min?.toFixed(1)} MJ/m²`
          : "-"}
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const navigate = useNavigate();
      const queryClient = useQueryClient();
      const { projectId } = useParams({
        from: "/_private/new_projects/$projectId/",
      });
      const { hasPermission } = useProjectPermissions(projectId);

      const { mutate: mutateDeleteUnit, isPending: isDeleting } = useMutation({
        mutationFn: () => deleteUnit(projectId, row.original.id),
        onSuccess: () => {
          toast.success("Unidade excluída com sucesso");
          queryClient.invalidateQueries({
            queryKey: ["project", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["projects"],
          });
          navigate({ to: `/new_projects/${projectId}` });
        },
        onError: (error) => {
          toast.error("Erro ao excluir unidade", {
            description: error.message,
          });
        },
      });

      return (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {hasPermission("update:unit") && (
            <DrawerFormUnit
              projectId={projectId}
              unitId={row.original.id}
              triggerComponent={
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                  <Edit className="h-4 w-4 text-primary" />
                </Button>
              }
            />
          )}
          {hasPermission("delete:unit") && (
            <ModalConfirmDelete
              title="Excluir Unidade"
              onConfirm={mutateDeleteUnit}
              componentTrigger={
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4 text-red-700" />
                  )}
                </Button>
              }
            />
          )}
        </div>
      );
    },
  },
];
