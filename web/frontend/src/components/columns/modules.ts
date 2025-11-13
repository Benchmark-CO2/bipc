import { IModuleItem } from "@/types/modules";
import { ColumnDef } from "@tanstack/react-table";
import { t } from "i18next";

export const moduleColumns: ColumnDef<IModuleItem>[] = [
  {
    accessorKey: "name",
    header: t("modulesTable.headers.name"),
    cell: ({ row }) => row.original.name || "-",
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
