import { TProjectUnit } from "@/types/projects";
import { useRouter } from "@tanstack/react-router";
import { EllipsisVertical, Loader2, Pen, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useTranslation } from "react-i18next";
import { DrawerFormUnit } from "../layout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { deleteUnit } from "@/actions/units/deleteUnit";

interface TabsContainerProps {
  units: TProjectUnit[];
  projectId: string;
  selectedTab?: number;
}

export function TabsContainer({
  units,
  projectId,
  selectedTab,
}: TabsContainerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleTabClick = (unitId: number) => {
    void router.navigate({
      to: `/projects/${projectId}/${unitId}`,
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    mutateDelete(unitId);
  };

  const { isPending: isDeletePending, mutate: mutateDelete } = useMutation({
    mutationFn: (unitId: string) => deleteUnit(projectId, unitId),
    onError: (error) => {
      toast.error(t("error.errorUpdateUnit"), {
        description: error.message || t("error.errorUnknown"),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toast.success(t("success.unitUpdated"), {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      navigate({
        to: `/projects/${projectId}`,
      });
    },
  });

  const unitId = selectedTab ?? "";

  return (
    <div className="flex items-center gap-2 border-b">
      {units.map((unit) => (
        <button
          key={unit.id}
          onClick={() => {
            handleTabClick(unit.id);
          }}
          className={`cursor-pointer rounded-t-lg px-4 py-2 transition-all flex items-center justify-between gap-2 ${
            unitId === unit.id
              ? "border-b-2 border-primary bg-background font-bold text-primary"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {unit.name}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger className="ml-2 cursor-pointer">
              <EllipsisVertical size={16} className="text-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DrawerFormUnit
                projectId={projectId}
                unitId={unit.id.toString()}
                triggerComponent={
                  <DropdownMenuItem
                    className="flex justify-between"
                    onSelect={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Pen size={16} className="text-primary" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                }
              />

              <ModalConfirmDelete
                title={t("modalConfirmDelete.unitTitle")}
                onConfirm={() => handleDeleteUnit(unit.id.toString())}
                componentTrigger={
                  <DropdownMenuItem
                    className="flex justify-between"
                    onSelect={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash size={16} className="text-destructive" />
                    )}
                    {t("common.delete")}
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      ))}

      <DrawerFormUnit projectId={projectId} />
    </div>
  );
}
