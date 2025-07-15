/* eslint-disable @typescript-eslint/no-unsafe-return */
// import { IModule } from '@/types/modules'
import { IModuleItem } from "@/types/modules";
import { ColumnDef } from "@tanstack/react-table";
// import { t } from "i18next";

export const moduleColumns: ColumnDef<IModuleItem>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => row.original.name || "Sem nome",
  },
  {
    accessorKey: "floor_repetition",
    header: "Repetições",
    cell: ({ row }) => row.original.floor_repetition || "-",
  },
  {
    accessorKey: "total_concrete",
    header: "Total de Concreto",
    cell: ({ row }) => row.original.total_concrete?.toFixed(2) || "-",
  },
  {
    accessorKey: "total_steel",
    header: "Total de Aço",
    cell: ({ row }) => row.original.total_steel?.toFixed(2) || "-",
  },
  {
    accessorKey: "co2_min",
    header: "CO2 (Mín)",
    cell: ({ row }) => row.original.co2_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO2 (Máx)",
    cell: ({ row }) => row.original.co2_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energia (Mín)",
    cell: ({ row }) => row.original.energy_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energia (Máximo)",
    cell: ({ row }) => row.original.energy_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "version_in_use",
    header: "Versão Atual",
    cell: ({ row }) => row.original.version_in_use || "-",
  },
  {
    accessorKey: "in_use",
    header: "",
    cell: ({ row }) => row.original.in_use || "-",
  },
];
