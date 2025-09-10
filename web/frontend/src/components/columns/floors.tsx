import { TConsumption } from "@/types/projects";
import { TTowerFloorCategory } from "@/types/units";
import { ColumnDef } from "@tanstack/react-table";
export const floorsColumns: ColumnDef<
  Pick<TTowerFloorCategory, "group_name"> &
    TConsumption & { repetitions: number }
>[] = [
  {
    accessorKey: "group_name",
    header: "Nome",
    cell: ({ row }) => row.original.group_name || "-",
  },
  {
    accessorKey: "co2_min",
    header: "CO2 min",
    cell: ({ row }) => row.original.co2_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "co2_max",
    header: "CO2 max",
    cell: ({ row }) => row.original.co2_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_min",
    header: "Energia min",
    cell: ({ row }) => row.original.energy_min?.toFixed(2) || "-",
  },
  {
    accessorKey: "energy_max",
    header: "Energia max",
    cell: ({ row }) => row.original.energy_max?.toFixed(2) || "-",
  },
  {
    accessorKey: "repetitions",
    header: "Quantidade",
    cell: ({ row }) => row.original.repetitions || "-",
  },
];
