import { TProjectUnit } from "@/types/projects";
import { useRouter } from "@tanstack/react-router";
import { MoreHorizontal, Pen, Trash } from "lucide-react";
import DrawerAddUnit from "../layout/drawer-form-unit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import DrawerFormUnit from "../layout/drawer-form-unit";
import { deleteUnit } from "@/actions/units/deleteUnit";
import { toast } from "sonner";
import { queryClient } from "@/utils/queryClient";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useTranslation } from "react-i18next";

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

  const handleTabClick = (unitId: number) => {
    void router.navigate({
      to: `/projects/${projectId}/${unitId}`,
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    void deleteUnit(projectId, unitId)
      .then(async () => {
        toast.success("Unidade de Construção deletada com sucesso!");
        await queryClient.invalidateQueries({
          queryKey: ["projects"],
          refetchType: "all",
        });
      })
      .catch((error) => {
        toast.error("Erro ao deletar a Unidade de Construção", {
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
          duration: 5000,
        });
      });
  };

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
            <DropdownMenuTrigger className="ml-2">
              <MoreHorizontal size={16} className="text-primary" />
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
                    Editar
                    <Pen size={16} className="text-primary" />
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
                  >
                    Excluir
                    <Trash size={16} className="text-destructive" />
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      ))}

      <DrawerAddUnit projectId={projectId} />
    </div>
  );
}
