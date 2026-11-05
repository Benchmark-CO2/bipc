import { IModuleItem } from "@/types/modules";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const moduleColumns: ColumnDef<IModuleItem>[] = [
  {
    accessorKey: "name",
    header: t("modulesTable.headers.name"),
    cell: ({ row }) => {
      const completed = row.original.completed;
      return (
        <div className="flex items-center w-full gap-2">
          <span className="truncate">{row.original.name || "-"}</span>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 shrink-0 ml-auto",
              completed
                ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
                : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300",
            )}
          >
            {completed ? (
              <>
                <CheckCircle2 size={12} />
                {t("modules.badges.completed")}
              </>
            ) : (
              <>
                <AlertCircle size={12} />
                {t("modules.badges.incomplete")}
              </>
            )}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "floor_repetition",
    header: t("modulesTable.headers.floorRepetition"),
    cell: ({ row }) => row.original.floor_repetition || "-",
  },
  {
    accessorKey: "total_concrete",
    header: t("modulesTable.headers.totalConcrete"),
    cell: ({ row }) => row.original.total_concrete?.toInternational() || "-",
  },
  {
    accessorKey: "total_steel",
    header: t("modulesTable.headers.totalSteel"),
    cell: ({ row }) => row.original.total_steel?.toInternational() || "-",
  },
  {
    accessorKey: "co2_min",
    header: t("modulesTable.headers.co2Min"),
    cell: ({ row }) => row.original.co2_min?.toInternational() || "-",
  },
  {
    accessorKey: "co2_max",
    header: t("modulesTable.headers.co2Max"),
    cell: ({ row }) => row.original.co2_max?.toInternational() || "-",
  },
  {
    accessorKey: "energy_min",
    header: t("modulesTable.headers.energyMin"),
    cell: ({ row }) => row.original.energy_min?.toInternational() || "-",
  },
  {
    accessorKey: "energy_max",
    header: t("modulesTable.headers.energyMax"),
    cell: ({ row }) => row.original.energy_max?.toInternational() || "-",
  },
  {
    accessorKey: "version_in_use",
    header: t("modulesTable.headers.versionInUse"),
    cell: ({ row }) => row.original.version || "-",
  },
];
