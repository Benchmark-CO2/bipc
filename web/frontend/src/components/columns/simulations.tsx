/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TSimulation } from "@/types/projects";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";
import { Check, X } from "lucide-react";

export const simulationColumns: ColumnDef<TSimulation>[] = [
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
    accessorKey: "name",
    header: t("simulationTable.headers.name"),
    cell: ({ row }) => row.original.name,
  },

  {
    accessorKey: "co2_min",
    header: t("modulesTable.headers.co2Min"),
    cell: ({ row }) => row.original.co2_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "co2_max",
    header: t("modulesTable.headers.co2Max"),
    cell: ({ row }) => row.original.co2_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_min",
    header: t("modulesTable.headers.energyMin"),
    cell: ({ row }) => row.original.energy_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_max",
    header: t("modulesTable.headers.energyMax"),
    cell: ({ row }) => row.original.energy_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "version",
    header: t("simulationTable.headers.version"),
    cell: ({ row }) => row.original.version || "Desconhecida",
  },
  {
    accessorKey: "in_use",
    header: t("simulationTable.headers.isValid"),
    cell: ({ row }) => {
      return (
        <div className="w-[50px] flex items-center justify-center">
          {row.original.in_use ? (
            <Check className="text-primary" />
          ) : (
            <X className="text-red-500" />
          )}
        </div>
      );
    },
    size: 50,
  },
];
