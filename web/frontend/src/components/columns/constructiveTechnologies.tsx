import { IModuleItem } from "@/types/modules";
import { TConsumption } from "@/types/projects";
import { structureTypes } from "@/utils/structureTypes";
import { ColumnDef } from "@tanstack/react-table";

export const constructiveTechnologies: ColumnDef<
  Omit<IModuleItem, "consumption"> & TConsumption & { option_id: string }
>[] = [
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => structureTypes[row.original.type] || "-",
  },
  {
    accessorKey: "co2_min",
    header: "CO2 Min",
    cell: ({ row }) => row.original.co2_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO2 Max",
    cell: ({ row }) => row.original.co2_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energia Min",
    cell: ({ row }) => row.original.energy_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energia Max",
    cell: ({ row }) => row.original.energy_max?.toFixed(2) || "-",
  },
];
