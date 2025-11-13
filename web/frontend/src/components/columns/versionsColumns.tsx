import { TModuleStructure } from "@/types/modules";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { Check, X } from "lucide-react";

export const versionsColumns: ColumnDef<TModuleStructure>[] = [
  {
    accessorKey: "selected",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        onChange={() => table.toggleAllRowsSelected()}
        className="cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={() => row.toggleSelected()}
        className="cursor-pointer"
      />
    ),
  },
  {
    accessorKey: "version",
    header: "Versão",
    cell: ({ row }) => row.original.version || "-",
  },
  // {
  //   accessorKey: "floor_repetition",
  //   header: t("modulesTable.headers.floorRepetition"),
  //   cell: ({ row }) => row.original.floor_repetition || "-",
  // },
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
    accessorKey: "in_use",
    header: t("modulesTable.headers.versionInUse"),
    cell: ({ row }) => (
      <div className="w-[50px] flex items-center justify-center">
        {row.original.in_use ? (
          <Check className="text-primary" />
        ) : (
          <X className="text-red-500" />
        )}
      </div>
    ),
  },
];
