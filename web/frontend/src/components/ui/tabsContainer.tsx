import { TProjectUnit } from "@/types/projects";
import { useRouter } from "@tanstack/react-router";
import { EllipsisVertical, Pen, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { useTranslation } from "react-i18next";
import { DrawerFormUnit } from "../layout";

interface TabsContainerProps {
  units: TProjectUnit[];
  projectId: string;
  selectedTab?: number;
  tempDeleteTab?: (unitId: string) => void;
}

export function TabsContainer({
  units,
  projectId,
  selectedTab,
  tempDeleteTab,
}: TabsContainerProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleTabClick = (unitId: number) => {
    void router.navigate({
      to: `/projects/${projectId}/${unitId}`,
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    tempDeleteTab?.(unitId);
    // void deleteUnit(projectId, unitId)
    //   .then(async () => {
    //     toast.success(t("success.unitDeleted"));
    //     await queryClient.invalidateQueries({
    //       queryKey: ["projects"],
    //       refetchType: "all",
    //     });
    //   })
    //   .catch((error) => {
    //     toast.error(t("error.errorDeleteUnit"), {
    //       description:
    //         error instanceof Error ? error.message : t("error.errorUnknown"),
    //       duration: 5000,
    //     });
    //   });
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
                  >
                    <Trash size={16} className="text-destructive" />
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
