import { TConsumption, TProjectUnit } from "@/types/projects";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUnit } from "@/actions/units/deleteUnit";
import { toast } from "sonner";
import { Copy, Edit, Loader2, Trash } from "lucide-react";
import { DrawerFormUnit } from "../layout";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import ModalSimple from "../layout/modal-simple";
import { postDuplicateUnit } from "@/actions/units/postDuplicateUnit";
import { useTranslation } from "@/i18n";

export const unitsColumns: ColumnDef<
  Pick<TProjectUnit, "name" | "id" | "area"> & TConsumption
>[] = [
  {
    accessorKey: "name",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return t.columns.name;
    },
    cell: ({ row }) => (
      <div className="text-left">{row.original.name || "-"}</div>
    ),
  },
  {
    accessorKey: "area",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return <div className="text-center">{t.columns.totalArea}</div>;
    },
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.area?.toInternational()
          ? `${row.original?.area?.toInternational()}`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_max",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return <div className="text-center">{t.columns.co2Max}</div>;
    },
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_max?.toInternational()
          ? `${row.original?.co2_max?.toInternational()}`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "co2_min",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return <div className="text-center">{t.columns.co2Min}</div>;
    },
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.co2_min?.toInternational()
          ? `${row.original?.co2_min?.toInternational()}`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_max",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return <div className="text-center">{t.columns.energyMax}</div>;
    },
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_max?.toInternational()
          ? `${row.original?.energy_max?.toInternational()}`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "energy_min",
    header: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();
      return <div className="text-center">{t.columns.energyMin}</div>;
    },
    cell: ({ row }) => (
      <div className="text-center">
        {row.original?.energy_min?.toInternational()
          ? `${row.original?.energy_min?.toInternational()}`
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
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { t } = useTranslation();

      const { mutate: mutateDeleteUnit, isPending: isDeleting } = useMutation({
        mutationFn: () => deleteUnit(projectId, row.original.id),
        onSuccess: () => {
          toast.success(t.units.deleteSuccess);
          queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          navigate({ to: `/new_projects/${projectId}` });
        },
        onError: (error) => {
          toast.error(t.units.deleteError, { description: error.message });
        },
      });

      const { mutate: mutateDuplicateUnit, isPending: isDuplicating } =
        useMutation({
          mutationFn: () => postDuplicateUnit(projectId, row.original.id),
          onSuccess: async (data) => {
            const unitData = await data?.data?.unit;
            toast.success(t.units.duplicateSuccess);
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            navigate({ to: `/new_projects/${projectId}/unit/${unitData.id}` });
          },
          onError: (error) => {
            toast.error(t.units.duplicateError, {
              description: error.message,
            });
          },
        });

      return (
        <div
          className="flex items-center gap-1 justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          {hasPermission("create:unit") && (
            <ModalSimple
              title={t.units.duplicateTitle}
              content={t.units.duplicateContent}
              confirmTitle={t.columns.duplicate}
              onConfirm={mutateDuplicateUnit}
              componentTrigger={
                <Button variant="ghost" size="icon" disabled={isDuplicating}>
                  {isDuplicating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 text-primary" />
                  )}
                </Button>
              }
            />
          )}
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
              title={t.units.deleteTitle}
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
