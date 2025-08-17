import { ColumnDef } from "@tanstack/react-table";
export const floorsColumns: ColumnDef<any>[] = [
  {
    accessorKey: "tower_name",
    header: "Nome",
    cell: ({ row }) => row.original.tower_name || "-",
  },
  {
    accessorKey: "co2",
    header: "CO2",
    cell: ({ row }) => row.original.co2 || "-",
  },
  {
    accessorKey: "energy",
    header: "Energia",
    cell: ({ row }) => row.original.energy || "-",
  },
  {
    accessorKey: "density",
    header: "Densidade",
    cell: ({ row }) => row.original.density || "-",
  },
  {
    accessorKey: "repetitions",
    header: "Quantidade",
    cell: ({ row }) => row.original.repetitions || "-",
  },
];
